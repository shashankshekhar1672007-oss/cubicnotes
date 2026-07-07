const express  = require("express");
const router   = express.Router();
const {
  register, verifyOtp, resendOtp, login, googleLogin, getMe, updateProfile,
  getCalendarConnectUrl, handleCalendarCallback, disconnectCalendar
} = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

router.post("/register",   register);
router.post("/verify-otp", verifyOtp);
router.post("/resend-otp", resendOtp);
router.post("/login",      login);
router.post("/google",     googleLogin);
router.get ("/me",         protect, getMe);
router.put ("/profile",    protect, updateProfile);

/* Google Calendar Sync Routes */
router.get ("/google/calendar/connect",    protect, getCalendarConnectUrl);
router.get ("/google/calendar/callback",   handleCalendarCallback);
router.post("/google/calendar/disconnect", protect, disconnectCalendar);

module.exports = router;
