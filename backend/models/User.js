const mongoose = require("mongoose");
const bcrypt   = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name:     { type: String, required: true, trim: true },
    email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
    googleId: { type: String, unique: true, sparse: true },
    password: { 
      type: String, 
      required: function() { return !this.googleId; }, 
      minlength: 6, 
      select: false 
    },
    // store as base64 data URI for simplicity; swap to Cloudinary URL for production
    avatar:   { type: String, default: "" },
    theme:    { type: String, enum: ["light", "dark"], default: "light" },
    themeMode: { type: String, enum: ["light", "dark", "system", "auto"], default: "light" },
    themeAutoStartHour: { type: Number, default: 6 },
    themeAutoEndHour: { type: Number, default: 18 },
    dashboardNotesMode: { type: String, enum: ["pinned", "recent"], default: "recent" },
    trashRetentionDays: { type: Number, default: 30 },
    customGeminiKey: { type: String, default: "" },
    aiCredits: { type: Number, default: 5 },
    lastCreditReset: { type: Date, default: Date.now },
    googleCalendarTokens: { type: String, default: "", select: false },
    googleCalendarConnected: { type: Boolean, default: false },
    // avatarPreset: 'google' = use Google photo, 'avatar-1'..'avatar-9' = preset image
    avatarPreset: { type: String, default: "avatar-1" },
    pushSubscriptions: {
      type: [
        {
          endpoint: { type: String, required: true },
          keys: {
            p256dh: { type: String, required: true },
            auth: { type: String, required: true },
          },
        },
      ],
      default: [],
    },
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password") || this.$skipPasswordHash) return next();
  const salt    = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.matchPassword = async function (entered) {
  if (!this.password) return false;
  return bcrypt.compare(entered, this.password);
};

module.exports = mongoose.model("User", userSchema);
