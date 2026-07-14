const jwt         = require("jsonwebtoken");
const crypto      = require("crypto");
const bcrypt      = require("bcryptjs");
const User        = require("../models/User");
const PendingUser = require("../models/PendingUser");
const { OAuth2Client } = require("google-auth-library");
const { sendOtpEmail } = require("../utils/sendEmail");

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

const safeUser = (user) => ({
  _id:    user._id,
  name:   user.name,
  email:  user.email,
  avatar: user.avatar,
  theme:  user.theme,
  themeMode: user.themeMode || user.theme,
  themeAutoStartHour: user.themeAutoStartHour ?? 6,
  themeAutoEndHour: user.themeAutoEndHour ?? 18,
  dashboardNotesMode: user.dashboardNotesMode || "recent",
  trashRetentionDays: user.trashRetentionDays ?? 30,
  googleId: user.googleId,
  googleCalendarConnected: user.googleCalendarConnected || false,
  avatarPreset: user.avatarPreset || "avatar-1",
});

/**
 * Generate a 6-digit numeric OTP and its bcrypt hash.
 */
const generateOtp = async () => {
  const otp  = crypto.randomInt(100000, 999999).toString();
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(otp, salt);
  return { otp, hash };
};

/* ── POST /api/auth/register ────────────────────────────
   Step 1 of 2: validate, hash password, store pending user, send OTP.
   Does NOT create a real User yet.
   ─────────────────────────────────────────────────────── */
const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ message: "All fields are required" });

    if (password.length < 6)
      return res.status(400).json({ message: "Password must be at least 6 characters" });

    /* Already a registered user? */
    const exists = await User.findOne({ email });
    if (exists)
      return res.status(400).json({ message: "Email already registered" });

    /* Hash password now (PendingUser stores it pre-hashed) */
    const pwSalt    = await bcrypt.genSalt(12);
    const pwHash    = await bcrypt.hash(password, pwSalt);

    /* Generate OTP */
    const { otp, hash: otpHash } = await generateOtp();

    /* Upsert PendingUser (handles re-registration attempts before verification) */
    await PendingUser.findOneAndUpdate(
      { email },
      {
        name,
        email,
        password: pwHash,
        otp: otpHash,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    /* Send OTP email */
    await sendOtpEmail(email, otp, name);

    res.status(200).json({ message: "OTP sent to your email", email });
  } catch (err) { next(err); }
};

/* ── POST /api/auth/verify-otp ──────────────────────────
   Step 2 of 2: verify OTP, create real User, return JWT.
   ─────────────────────────────────────────────────────── */
const verifyOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp)
      return res.status(400).json({ message: "Email and OTP are required" });

    const pending = await PendingUser.findOne({ email });
    if (!pending)
      return res.status(400).json({ message: "OTP expired or not found. Please register again." });

    /* Verify the OTP hash */
    const isMatch = await bcrypt.compare(otp, pending.otp);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid OTP. Please try again." });

    /* Create the real user.
       Password is already hashed in PendingUser, so we must bypass
       the User model's pre-save hook that would double-hash it.
       We use `new User()` + `save()` but mark password as NOT modified. */
    const user = new User({
      name:     pending.name,
      email:    pending.email,
    });
    user.password = pending.password;           // assign the pre-hashed value
    user.$skipPasswordHash = true;              // custom flag
    await user.save({ validateBeforeSave: false });

    /* Remove the pending record */
    await PendingUser.deleteOne({ _id: pending._id });

    const token = signToken(user._id);
    res.status(201).json({ token, user: safeUser(user) });
  } catch (err) { next(err); }
};

/* ── POST /api/auth/resend-otp ──────────────────────────
   Generate a fresh OTP for an existing pending registration.
   ─────────────────────────────────────────────────────── */
const resendOtp = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email)
      return res.status(400).json({ message: "Email is required" });

    const pending = await PendingUser.findOne({ email });
    if (!pending)
      return res.status(400).json({ message: "No pending registration found. Please register again." });

    /* Generate new OTP */
    const { otp, hash: otpHash } = await generateOtp();

    /* Update record with new OTP and extend expiry */
    pending.otp = otpHash;
    pending.expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await pending.save({ validateModifiedOnly: true });

    /* Send OTP email */
    await sendOtpEmail(email, otp, pending.name);

    res.status(200).json({ message: "A new OTP has been sent to your email" });
  } catch (err) { next(err); }
};

/* ── POST /api/auth/login ───────────────────────────────── */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: "Email and password required" });

    const user = await User.findOne({ email }).select("+password");
    if (!user || !(await user.matchPassword(password)))
      return res.status(401).json({ message: "Invalid credentials" });

    const token = signToken(user._id);
    res.json({ token, user: safeUser(user) });
  } catch (err) { next(err); }
};

/* ── POST /api/auth/google ──────────────────────────────── */
const googleLogin = async (req, res, next) => {
  try {
    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ message: "Google ID token required" });

    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture: avatar } = payload;

    let user = await User.findOne({ email });
    if (user) {
      if (!user.googleId) {
        user.googleId = googleId;
        if (avatar && !user.avatar) user.avatar = avatar;
        // default to google photo for existing non-google users who link google
        if (!user.avatarPreset || user.avatarPreset === "avatar-1") {
          user.avatarPreset = "google";
        }
        await user.save();
      }
    } else {
      user = await User.create({ name, email, googleId, avatar, avatarPreset: "google" });
    }

    const token = signToken(user._id);
    res.json({ token, user: safeUser(user) });
  } catch (err) { next(err); }
};

/* ── GET /api/auth/me ───────────────────────────────────── */
const getMe = async (req, res, next) => {
  try {
    res.json(safeUser(req.user));
  } catch (err) { next(err); }
};

/* ── PUT /api/auth/profile ──────────────────────────────── */
const updateProfile = async (req, res, next) => {
  try {
    const {
      name,
      avatar,
      theme,
      themeMode,
      themeAutoStartHour,
      themeAutoEndHour,
      dashboardNotesMode,
      trashRetentionDays,
      avatarPreset,
    } = req.body;

    const updates = {
      ...(name && { name }),
      ...(avatar !== undefined && { avatar }),
      ...(theme && { theme }),
      ...(themeMode && { themeMode }),
      ...(themeAutoStartHour !== undefined && { themeAutoStartHour }),
      ...(themeAutoEndHour !== undefined && { themeAutoEndHour }),
      ...(dashboardNotesMode && { dashboardNotesMode }),
      ...(trashRetentionDays !== undefined && { trashRetentionDays }),
      ...(avatarPreset !== undefined && { avatarPreset }),
    };

    if (themeMode === "light" || themeMode === "dark") {
      updates.theme = themeMode;
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updates,
      { new: true, runValidators: true }
    );
    res.json(safeUser(user));
  } catch (err) { next(err); }
};

/* ── Google Calendar OAuth ─────────────────────────────── */
const getCalendarConnectUrl = async (req, res, next) => {
  try {
    const { getCalendarAuthUrl } = require("../utils/googleCalendar");
    const from = req.query.from || "settings";
    const url = getCalendarAuthUrl(req.user._id.toString(), from);
    res.json({ url });
  } catch (err) { next(err); }
};

const handleCalendarCallback = async (req, res, next) => {
  const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
  try {
    const { code, state: rawState } = req.query;
    if (!code || !rawState) {
      console.error("[CalendarCallback] Missing code or state in query params:", req.query);
      return res.redirect(`${clientUrl}/settings?calendar_error=missing_params`);
    }

    // Parse state — supports both legacy string (userId) and new JSON format
    let userId, from = "settings";
    try {
      const parsed = JSON.parse(rawState);
      userId = parsed.userId;
      from = parsed.from || "settings";
    } catch {
      // Legacy format: state is just the userId string
      userId = rawState;
    }

    if (!userId) {
      console.error("[CalendarCallback] Could not extract userId from state:", rawState);
      return res.redirect(`${clientUrl}/settings?calendar_error=missing_params`);
    }

    const { exchangeCodeForTokens } = require("../utils/googleCalendar");
    let tokens;
    try {
      tokens = await exchangeCodeForTokens(code);
    } catch (tokenErr) {
      console.error("[CalendarCallback] Token exchange failed:", tokenErr.message);
      return res.redirect(`${clientUrl}/settings?calendar_error=token_exchange_failed`);
    }

    if (!tokens || (!tokens.access_token && !tokens.refresh_token)) {
      console.error("[CalendarCallback] No usable tokens received from Google");
      return res.redirect(`${clientUrl}/settings?calendar_error=no_tokens`);
    }

    const { encrypt } = require("../utils/cryptoHelper");
    const encryptedTokens = encrypt(JSON.stringify(tokens));

    const updatedUser = await User.findByIdAndUpdate(userId, {
      googleCalendarTokens: encryptedTokens,
      googleCalendarConnected: true,
    }, { new: true });

    if (!updatedUser) {
      console.error("[CalendarCallback] User not found for ID:", userId);
      return res.redirect(`${clientUrl}/settings?calendar_error=user_not_found`);
    }

    // Redirect back to the page that initiated the connection
    const redirectPath = from === "reminders" ? "/reminders" : "/settings";
    res.redirect(`${clientUrl}${redirectPath}?calendar_connected=true`);
  } catch (err) {
    console.error("Google Calendar OAuth callback error:", err);
    res.redirect(`${clientUrl}/settings?calendar_error=auth_failed`);
  }
};

const disconnectCalendar = async (req, res, next) => {
  try {
    req.user.googleCalendarTokens = "";
    req.user.googleCalendarConnected = false;
    await req.user.save({ validateBeforeSave: false });
    res.json(safeUser(req.user));
  } catch (err) { next(err); }
};

module.exports = {
  register,
  verifyOtp,
  resendOtp,
  login,
  googleLogin,
  getMe,
  updateProfile,
  getCalendarConnectUrl,
  handleCalendarCallback,
  disconnectCalendar,
};
