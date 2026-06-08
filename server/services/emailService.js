const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = "BookMyShot <otp@bookmyshot.in>";

/**
 * Send Email Verification OTP
 */
async function sendVerificationOTP(email, otp, name) {
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: "Verify your BookMyShot account",
      html: `
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:2rem;background:#050302;color:#f6eee7;border-radius:12px">
          <h2 style="color:#ff8c27;margin:0 0 1rem;font-size:1.4rem">BookMyShot</h2>
          <p style="margin:0 0 1rem;color:#b9aa98">Hi ${name || "there"},</p>
          <p style="margin:0 0 1.5rem;color:#f6eee7">Your email verification code is:</p>
          <div style="background:#1a1512;border:1px solid rgba(255,140,39,.2);border-radius:10px;padding:1.5rem;text-align:center;margin:0 0 1.5rem">
            <span style="font-size:2rem;font-weight:700;letter-spacing:.3em;color:#ff8c27">${otp}</span>
          </div>
          <p style="margin:0 0 1rem;color:#b9aa98;font-size:.85rem">This code expires in <strong>10 minutes</strong>.</p>
          <p style="margin:0;color:#b9aa98;font-size:.8rem">If you didn't create an account on BookMyShot, ignore this email.</p>
          <hr style="border:none;border-top:1px solid rgba(255,255,255,.06);margin:1.5rem 0">
          <p style="margin:0;color:rgba(255,255,255,.3);font-size:.7rem;text-align:center">&copy; 2026 BookMyShot. All rights reserved.</p>
        </div>
      `,
    });
    return { success: true };
  } catch (err) {
    console.error("[EmailService] Verification OTP failed:", err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Send Password Reset OTP
 */
async function sendPasswordResetOTP(email, otp, name) {
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: "Reset your BookMyShot password",
      html: `
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:2rem;background:#050302;color:#f6eee7;border-radius:12px">
          <h2 style="color:#ff8c27;margin:0 0 1rem;font-size:1.4rem">BookMyShot</h2>
          <p style="margin:0 0 1rem;color:#b9aa98">Hi ${name || "there"},</p>
          <p style="margin:0 0 1.5rem;color:#f6eee7">Your password reset code is:</p>
          <div style="background:#1a1512;border:1px solid rgba(255,140,39,.2);border-radius:10px;padding:1.5rem;text-align:center;margin:0 0 1.5rem">
            <span style="font-size:2rem;font-weight:700;letter-spacing:.3em;color:#ff8c27">${otp}</span>
          </div>
          <p style="margin:0 0 1rem;color:#b9aa98;font-size:.85rem">This code expires in <strong>10 minutes</strong>.</p>
          <p style="margin:0;color:#b9aa98;font-size:.8rem">If you didn't request a password reset, ignore this email. Your password won't change.</p>
          <hr style="border:none;border-top:1px solid rgba(255,255,255,.06);margin:1.5rem 0">
          <p style="margin:0;color:rgba(255,255,255,.3);font-size:.7rem;text-align:center">&copy; 2026 BookMyShot. All rights reserved.</p>
        </div>
      `,
    });
    return { success: true };
  } catch (err) {
    console.error("[EmailService] Reset OTP failed:", err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Generate a 6-digit OTP
 */
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

module.exports = { sendVerificationOTP, sendPasswordResetOTP, generateOTP };
