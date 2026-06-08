const { Resend } = require("resend");

const apiKey = process.env.RESEND_API_KEY;
console.log(`[EmailService] Initializing Resend. API key present: ${!!apiKey}, key prefix: ${apiKey ? apiKey.substring(0, 8) + '...' : 'MISSING'}`);

let resend;
try {
  resend = apiKey ? new Resend(apiKey) : null;
  if (!resend) console.warn(`[EmailService] ⚠️ Resend client NOT initialized (no API key). Emails will fail.`);
} catch (e) {
  console.error(`[EmailService] ❌ Failed to initialize Resend:`, e.message);
  resend = null;
}
const FROM_EMAIL = "BookMyShot <otp@bookmyshot.in>";

/**
 * Send Email Verification OTP
 */
async function sendVerificationOTP(email, otp, name) {
  console.log(`[EmailService] ═══ sendVerificationOTP START ═══`);
  console.log(`[EmailService] Target email: ${email}`);
  console.log(`[EmailService] OTP generated: ${otp}`);
  console.log(`[EmailService] Recipient name: ${name || "unknown"}`);
  console.log(`[EmailService] From: ${FROM_EMAIL}`);
  console.log(`[EmailService] API key available: ${!!apiKey}`);
  console.log(`[EmailService] Resend client initialized: ${!!resend}`);
  
  if (!resend) {
    console.error(`[EmailService] ❌ Cannot send email - Resend client not initialized (RESEND_API_KEY missing)`);
    return { success: false, error: "RESEND_API_KEY not configured" };
  }
  
  try {
    const response = await resend.emails.send({
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
    console.log(`[EmailService] ✅ Resend API response:`, JSON.stringify(response));
    console.log(`[EmailService] ═══ sendVerificationOTP SUCCESS ═══`);
    return { success: true, resendResponse: response };
  } catch (err) {
    console.error(`[EmailService] ❌ Verification OTP FAILED`);
    console.error(`[EmailService] Error message: ${err.message}`);
    console.error(`[EmailService] Error name: ${err.name}`);
    console.error(`[EmailService] Full error:`, JSON.stringify(err, Object.getOwnPropertyNames(err)));
    console.log(`[EmailService] ═══ sendVerificationOTP FAILED ═══`);
    return { success: false, error: err.message };
  }
}

/**
 * Send Password Reset OTP
 */
async function sendPasswordResetOTP(email, otp, name) {
  console.log(`[EmailService] ═══ sendPasswordResetOTP START ═══`);
  console.log(`[EmailService] Target email: ${email}`);
  console.log(`[EmailService] OTP generated: ${otp}`);
  console.log(`[EmailService] Recipient name: ${name || "unknown"}`);
  console.log(`[EmailService] From: ${FROM_EMAIL}`);
  console.log(`[EmailService] API key available: ${!!apiKey}`);
  console.log(`[EmailService] Resend client initialized: ${!!resend}`);
  
  if (!resend) {
    console.error(`[EmailService] ❌ Cannot send email - Resend client not initialized (RESEND_API_KEY missing)`);
    return { success: false, error: "RESEND_API_KEY not configured" };
  }
  
  try {
    const response = await resend.emails.send({
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
    console.log(`[EmailService] ✅ Resend API response:`, JSON.stringify(response));
    console.log(`[EmailService] ═══ sendPasswordResetOTP SUCCESS ═══`);
    return { success: true, resendResponse: response };
  } catch (err) {
    console.error(`[EmailService] ❌ Password Reset OTP FAILED`);
    console.error(`[EmailService] Error message: ${err.message}`);
    console.error(`[EmailService] Error name: ${err.name}`);
    console.error(`[EmailService] Full error:`, JSON.stringify(err, Object.getOwnPropertyNames(err)));
    console.log(`[EmailService] ═══ sendPasswordResetOTP FAILED ═══`);
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
