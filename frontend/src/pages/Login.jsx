import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import Button from "../components/UI/Button";
import { GoogleLogin } from "@react-oauth/google";
import "../assets/styles/pages/auth.css";

const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 60; // seconds

/** Returns true for @gmail.com / @googlemail.com addresses */
const isGmailAddress = (email) =>
  /^[^@]+@(gmail|googlemail)\.com$/i.test(email?.trim());

const Login = () => {
  const [mode, setMode]       = useState("login"); // "login" | "register" | "otp"
  const [name, setName]       = useState("");
  const [email, setEmail]     = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]     = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  // Gmail hint on register form
  const [showGmailWarning, setShowGmailWarning] = useState(false);
  const [bypassGmailCheck, setBypassGmailCheck] = useState(false);

  // OTP state
  const [otpValues, setOtpValues] = useState(Array(OTP_LENGTH).fill(""));
  const [otpEmail, setOtpEmail]   = useState("");
  const [resendTimer, setResendTimer] = useState(0);
  const inputRefs = useRef([]);

  const { login, register, verifyOtp, resendOtp, googleLogin } = useAuth();
  const navigate = useNavigate();

  /* Reset Gmail check whenever email changes */
  useEffect(() => {
    setBypassGmailCheck(false);
    setShowGmailWarning(false);
  }, [email]);

  /* Reset Gmail state when switching between login/register */
  useEffect(() => {
    setBypassGmailCheck(false);
    setShowGmailWarning(false);
  }, [mode]);

  /* ── Resend cooldown timer ── */
  useEffect(() => {
    if (resendTimer <= 0) return;
    const id = setInterval(() => setResendTimer((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [resendTimer]);

  /* ── Auto-focus first OTP input when entering OTP mode ── */
  useEffect(() => {
    if (mode === "otp") {
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    }
  }, [mode]);

  const handleGoogleSuccess = async (credentialResponse) => {
    setError("");
    setLoading(true);
    try {
      await googleLogin(credentialResponse.credential);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "Google login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  /* ── Login / Register submit ── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // Gmail interception: show warning before sending OTP
    if (mode === "register" && isGmailAddress(email) && !bypassGmailCheck) {
      setShowGmailWarning(true);
      return;
    }

    setLoading(true);
    try {
      if (mode === "login") {
        await login(email, password);
        navigate("/");
      } else {
        const res = await register(name, email, password);
        setOtpEmail(res?.email || email);
        setOtpValues(Array(OTP_LENGTH).fill(""));
        setResendTimer(RESEND_COOLDOWN);
        setShowGmailWarning(false);
        setMode("otp");
        setSuccess("A verification code has been sent to your email.");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  /* ── OTP input handlers ── */
  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return; // digits only
    const next = [...otpValues];
    next[index] = value.slice(-1);     // single digit
    setOtpValues(next);
    if (value && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otpValues[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!pasted) return;
    const next = [...otpValues];
    for (let i = 0; i < OTP_LENGTH; i++) {
      next[i] = pasted[i] || "";
    }
    setOtpValues(next);
    const focusIdx = Math.min(pasted.length, OTP_LENGTH - 1);
    inputRefs.current[focusIdx]?.focus();
  };

  /* ── Verify OTP ── */
  const handleVerify = async () => {
    const code = otpValues.join("");
    if (code.length !== OTP_LENGTH) {
      setError("Please enter the full 6-digit code.");
      return;
    }
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      await verifyOtp(otpEmail, code);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "Verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  /* ── Resend OTP ── */
  const handleResend = async () => {
    if (resendTimer > 0) return;
    setError("");
    setSuccess("");
    try {
      await resendOtp(otpEmail);
      setOtpValues(Array(OTP_LENGTH).fill(""));
      setResendTimer(RESEND_COOLDOWN);
      setSuccess("A new code has been sent to your email.");
      inputRefs.current[0]?.focus();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to resend OTP.");
    }
  };

  /* ── Go back from OTP to register ── */
  const handleBackToRegister = () => {
    setMode("register");
    setOtpValues(Array(OTP_LENGTH).fill(""));
    setError("");
    setSuccess("");
    setShowGmailWarning(false);
    setBypassGmailCheck(false);
  };

  /* ═══════════════════════════════════════ OTP VIEW ═══ */
  if (mode === "otp") {
    const resolvedEmail = otpEmail || email;
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-logo"><i className="fa-solid fa-envelope-circle-check"></i></div>
          <h1 className="auth-heading">Verify your email</h1>
          <p className="auth-subheading">
            We sent a 6-digit code to <strong>{resolvedEmail}</strong>
          </p>

          {error && <div className="auth-error">{error}</div>}
          {success && <div className="auth-success">{success}</div>}

          <div className="otp-inputs" onPaste={handleOtpPaste}>
            {otpValues.map((val, i) => (
              <input
                key={i}
                ref={(el) => (inputRefs.current[i] = el)}
                className="otp-box"
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={val}
                onChange={(e) => handleOtpChange(i, e.target.value)}
                onKeyDown={(e) => handleOtpKeyDown(i, e)}
                autoComplete="one-time-code"
              />
            ))}
          </div>

          <Button block disabled={loading || otpValues.join("").length !== OTP_LENGTH} onClick={handleVerify}>
            {loading ? "Verifying..." : "Verify & Create Account"}
          </Button>

          <div className="otp-resend">
            {resendTimer > 0 ? (
              <span className="otp-resend-timer">Resend code in {resendTimer}s</span>
            ) : (
              <span className="otp-resend-link" onClick={handleResend}>Resend code</span>
            )}
          </div>

          <div className="auth-switch">
            <span onClick={handleBackToRegister}>← Back to register</span>
          </div>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════ LOGIN / REGISTER VIEW ═══ */
  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo"><i className="fa-solid fa-note-sticky"></i></div>
        <h1 className="auth-heading">{mode === "login" ? "Welcome back" : "Create your account"}</h1>
        <p className="auth-subheading">
          {mode === "login" ? "Log in to continue to CubicNotes." : "Start capturing your thoughts, simply."}
        </p>

        {error && <div className="auth-error">{error}</div>}
        {success && <div className="auth-success">{success}</div>}

        {/* Gmail warning on register form — shown before OTP is sent */}
        {mode === "register" && showGmailWarning && (
          <div className="otp-gmail-hint" style={{ marginBottom: "1rem" }}>
            <div className="otp-gmail-hint-text">
              <i className="fa-brands fa-google"></i>
              <span>This is a Gmail address. Sign up faster and more securely with Google — no password needed.</span>
            </div>
            <div className="otp-gmail-google-btn">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => setError("Google Login Failed")}
                theme={document.documentElement.getAttribute("data-theme") === "dark" ? "filled_black" : "outline"}
                shape="rectangular"
                text="signup_with"
                size="medium"
              />
            </div>
            <div className="otp-gmail-hint-divider"><span>or</span></div>
            <button
              type="button"
              className="otp-gmail-continue-anyway"
              onClick={() => { setBypassGmailCheck(true); setShowGmailWarning(false); }}
            >
              Continue with email & password instead
            </button>
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === "register" && (
            <div className="field-group">
              <label className="field-label">Name</label>
              <input
                className="input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
                required
              />
            </div>
          )}

          <div className="field-group">
            <label className="field-label">Email</label>
            <input
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>

          <div className="field-group">
            <label className="field-label">Password</label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              minLength={6}
              required
            />
          </div>

          <Button type="submit" block disabled={loading}>
            {loading ? "Please wait..." : mode === "login" ? "Log in" : "Create account"}
          </Button>
        </form>

        <div className="auth-divider" style={{ textAlign: "center", margin: "1.5rem 0", position: "relative" }}>
          <hr style={{ borderTop: "1px solid var(--border)", position: "absolute", top: "50%", width: "100%", margin: 0, zIndex: 1 }} />
          <span style={{ background: "var(--bg-surface)", padding: "0 10px", color: "var(--text-secondary)", fontSize: "0.85rem", position: "relative", zIndex: 2 }}>OR</span>
        </div>

        <div className="google-auth-wrapper" style={{ display: "flex", justifyContent: "center", marginBottom: "1.5rem" }}>
          <GoogleLogin
            key={document.documentElement.getAttribute("data-theme") || "light"}
            onSuccess={handleGoogleSuccess}
            onError={() => setError("Google Login Failed")}
            theme={document.documentElement.getAttribute("data-theme") === "dark" ? "filled_black" : "outline"}
            shape="rectangular"
          />
        </div>

        <div className="auth-switch">
          {mode === "login" ? (
            <>Don't have an account? <span onClick={() => { setMode("register"); setError(""); setSuccess(""); }}>Sign up</span></>
          ) : (
            <>Already have an account? <span onClick={() => { setMode("login"); setError(""); setSuccess(""); }}>Log in</span></>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
