const nodemailer = require("nodemailer");

/**
 * Create a reusable SMTP transporter using Gmail.
 * Requires EMAIL_USER and EMAIL_PASS (App Password) in .env
 */
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * Send an OTP verification email with CubicNotes branding.
 *
 * @param {string} to      - Recipient email address
 * @param {string} otp     - The 6-digit OTP code
 * @param {string} name    - Recipient name (for personalisation)
 */
const sendOtpEmail = async (to, otp, name) => {
  const html = `
    <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 24px; color: #e0e0e0; background: #121212; border-radius: 12px;">
      <div style="text-align: center; margin-bottom: 28px;">
        <span style="font-size: 28px; font-weight: 700; letter-spacing: -0.04em; color: #ffffff;">CubicNotes</span>
      </div>

      <p style="font-size: 15px; line-height: 1.6; color: #b0b0b0; margin-bottom: 8px;">
        Hi <strong style="color: #ffffff;">${name}</strong>,
      </p>

      <p style="font-size: 15px; line-height: 1.6; color: #b0b0b0; margin-bottom: 24px;">
        Use the code below to verify your email and complete your registration. This code expires in <strong style="color: #ffffff;">10 minutes</strong>.
      </p>

      <div style="text-align: center; margin: 32px 0;">
        <span style="display: inline-block; font-size: 36px; font-weight: 700; letter-spacing: 12px; color: #4dd0c8; background: rgba(77, 208, 200, 0.08); padding: 16px 32px; border-radius: 10px; border: 1px solid rgba(77, 208, 200, 0.2);">
          ${otp}
        </span>
      </div>

      <p style="font-size: 13px; line-height: 1.6; color: #666; margin-top: 28px; text-align: center;">
        If you didn't request this, you can safely ignore this email.
      </p>

      <hr style="border: none; border-top: 1px solid #2a2a2a; margin: 28px 0 16px;" />
      <p style="font-size: 12px; color: #555; text-align: center;">
        &copy; ${new Date().getFullYear()} CubicNotes &middot; Your thoughts, beautifully organised.
      </p>
    </div>
  `;

  await transporter.sendMail({
    from: `"CubicNotes" <${process.env.EMAIL_USER}>`,
    to,
    subject: `${otp} — Verify your CubicNotes account`,
    html,
  });
};

module.exports = { sendOtpEmail };
