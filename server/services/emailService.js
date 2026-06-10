const { Resend } = require("resend");
const EmailLog = require("../models/EmailLog");

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

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════
const FROM_EMAIL = "BookMyShot <support@bookmyshot.in>";
const FROM_OTP = "BookMyShot <otp@bookmyshot.in>";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "bookmyshott@gmail.com";
const SITE_URL = process.env.SITE_URL || "https://site--bookmyshot--ykz2mr8mzlrv.code.run";

// ═══════════════════════════════════════════════════════════════
// CORE EMAIL SENDER (with logging)
// ═══════════════════════════════════════════════════════════════
async function sendEmail({ to, subject, html, from, type, userId, creatorId, meta }) {
  const fromAddr = from || FROM_EMAIL;
  const logEntry = {
    to,
    from: fromAddr,
    subject,
    type: type || "other",
    status: "queued",
    user: userId || undefined,
    creator: creatorId || undefined,
    meta: meta || undefined,
  };

  if (!resend) {
    logEntry.status = "failed";
    logEntry.error = "RESEND_API_KEY not configured";
    try { await EmailLog.create(logEntry); } catch (e) { /* ignore log errors */ }
    console.error(`[EmailService] ❌ Cannot send email to ${to} - Resend not initialized`);
    return { success: false, error: "RESEND_API_KEY not configured" };
  }

  try {
    const response = await resend.emails.send({ from: fromAddr, to, subject, html });
    logEntry.status = "sent";
    logEntry.resendId = response?.data?.id || response?.id || "";
    try { await EmailLog.create(logEntry); } catch (e) { /* ignore log errors */ }
    console.log(`[EmailService] ✅ Email sent to ${to} | Type: ${type} | Subject: ${subject}`);
    return { success: true, resendId: logEntry.resendId };
  } catch (err) {
    logEntry.status = "failed";
    logEntry.error = err.message || "Unknown error";
    try { await EmailLog.create(logEntry); } catch (e) { /* ignore log errors */ }
    console.error(`[EmailService] ❌ Failed to send ${type} email to ${to}: ${err.message}`);
    return { success: false, error: err.message };
  }
}

// ═══════════════════════════════════════════════════════════════
// TEMPLATE WRAPPER
// ═══════════════════════════════════════════════════════════════
function wrapTemplate(content) {
  return `
    <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:560px;margin:0 auto;padding:0;background:#050302;border-radius:12px;overflow:hidden">
      <div style="background:linear-gradient(135deg,#1a1512,#0d0a08);padding:1.5rem 2rem;border-bottom:1px solid rgba(218,175,55,0.2)">
        <h1 style="margin:0;font-size:1.4rem;font-weight:700;color:#DAAF37;letter-spacing:0.02em">BookMyShot</h1>
      </div>
      <div style="padding:2rem">
        ${content}
      </div>
      <div style="background:rgba(255,255,255,0.02);padding:1.25rem 2rem;border-top:1px solid rgba(255,255,255,0.04)">
        <p style="margin:0 0 0.5rem;color:rgba(255,255,255,0.3);font-size:0.72rem;text-align:center">This is an automated email from BookMyShot. Please do not reply.</p>
        <p style="margin:0;color:rgba(255,255,255,0.2);font-size:0.68rem;text-align:center">&copy; 2026 BookMyShot. All rights reserved. | <a href="${SITE_URL}/privacy" style="color:rgba(218,175,55,0.5);text-decoration:none">Privacy Policy</a></p>
      </div>
    </div>
  `;
}

// ═══════════════════════════════════════════════════════════════
// 1. OTP EMAILS (existing — updated with logging)
// ═══════════════════════════════════════════════════════════════
async function sendVerificationOTP(email, otp, name) {
  const html = wrapTemplate(`
    <p style="margin:0 0 1rem;color:#b9aa98;font-size:0.95rem">Hi ${name || "there"},</p>
    <p style="margin:0 0 1.5rem;color:#f6eee7;font-size:0.95rem">Your email verification code is:</p>
    <div style="background:#1a1512;border:1px solid rgba(218,175,55,0.2);border-radius:10px;padding:1.5rem;text-align:center;margin:0 0 1.5rem">
      <span style="font-size:2.2rem;font-weight:700;letter-spacing:.3em;color:#DAAF37">${otp}</span>
    </div>
    <p style="margin:0 0 1rem;color:#b9aa98;font-size:.85rem">This code expires in <strong style="color:#f6eee7">10 minutes</strong>.</p>
    <p style="margin:0;color:#b9aa98;font-size:.8rem">If you didn't create an account on BookMyShot, ignore this email.</p>
  `);

  return sendEmail({
    to: email,
    subject: "Verify your BookMyShot account",
    html,
    from: FROM_OTP,
    type: "otp_verification",
    meta: { otp },
  });
}

async function sendPasswordResetOTP(email, otp, name) {
  const html = wrapTemplate(`
    <p style="margin:0 0 1rem;color:#b9aa98;font-size:0.95rem">Hi ${name || "there"},</p>
    <p style="margin:0 0 1.5rem;color:#f6eee7;font-size:0.95rem">Your password reset code is:</p>
    <div style="background:#1a1512;border:1px solid rgba(218,175,55,0.2);border-radius:10px;padding:1.5rem;text-align:center;margin:0 0 1.5rem">
      <span style="font-size:2.2rem;font-weight:700;letter-spacing:.3em;color:#DAAF37">${otp}</span>
    </div>
    <p style="margin:0 0 1rem;color:#b9aa98;font-size:.85rem">This code expires in <strong style="color:#f6eee7">10 minutes</strong>.</p>
    <p style="margin:0;color:#b9aa98;font-size:.8rem">If you didn't request a password reset, ignore this email.</p>
  `);

  return sendEmail({
    to: email,
    subject: "Reset your BookMyShot password",
    html,
    from: FROM_OTP,
    type: "otp_password_reset",
    meta: { otp },
  });
}

// ═══════════════════════════════════════════════════════════════
// 2. SUBSCRIPTION EMAILS — Creator
// ═══════════════════════════════════════════════════════════════
async function sendSubscriptionActivated({ email, name, planName, amount, endDate, paymentId, creatorId, userId }) {
  const html = wrapTemplate(`
    <p style="margin:0 0 1rem;color:#b9aa98;font-size:0.95rem">Hi ${name || "Creator"},</p>
    <h2 style="margin:0 0 1rem;color:#10b981;font-size:1.2rem;font-weight:600">✅ Subscription Activated!</h2>
    <p style="margin:0 0 1.5rem;color:#f6eee7;font-size:0.9rem">Your BookMyShot subscription has been activated successfully.</p>
    <div style="background:#1a1512;border:1px solid rgba(218,175,55,0.15);border-radius:10px;padding:1.25rem;margin:0 0 1.5rem">
      <table style="width:100%;border-collapse:collapse;font-size:0.85rem">
        <tr><td style="padding:0.4rem 0;color:#b9aa98">Plan</td><td style="padding:0.4rem 0;color:#f6eee7;text-align:right;font-weight:500">${planName || "Monthly Subscription"}</td></tr>
        <tr><td style="padding:0.4rem 0;color:#b9aa98">Amount Paid</td><td style="padding:0.4rem 0;color:#DAAF37;text-align:right;font-weight:600">₹${amount || 0}</td></tr>
        <tr><td style="padding:0.4rem 0;color:#b9aa98">Valid Until</td><td style="padding:0.4rem 0;color:#f6eee7;text-align:right">${endDate ? new Date(endDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}</td></tr>
        <tr><td style="padding:0.4rem 0;color:#b9aa98">Payment ID</td><td style="padding:0.4rem 0;color:#f6eee7;text-align:right;font-size:0.75rem">${paymentId || "—"}</td></tr>
      </table>
    </div>
    <p style="margin:0 0 1rem;color:#b9aa98;font-size:0.82rem">You now have full access to your Creator Dashboard, analytics, leads, and all premium features.</p>
    <a href="${SITE_URL}/creator/dashboard.html" style="display:inline-block;padding:0.7rem 1.5rem;background:linear-gradient(135deg,#DAAF37,#F4C542);color:#111;font-weight:600;border-radius:8px;text-decoration:none;font-size:0.85rem">Go to Dashboard →</a>
  `);

  return sendEmail({
    to: email,
    subject: "✅ Subscription Activated — BookMyShot",
    html,
    type: "subscription_activated",
    userId,
    creatorId,
    meta: { amount, planName, paymentId },
  });
}

async function sendSubscriptionRenewed({ email, name, amount, endDate, paymentId, creatorId, userId }) {
  const html = wrapTemplate(`
    <p style="margin:0 0 1rem;color:#b9aa98;font-size:0.95rem">Hi ${name || "Creator"},</p>
    <h2 style="margin:0 0 1rem;color:#10b981;font-size:1.2rem;font-weight:600">🔄 Subscription Renewed!</h2>
    <p style="margin:0 0 1.5rem;color:#f6eee7;font-size:0.9rem">Your BookMyShot subscription has been automatically renewed.</p>
    <div style="background:#1a1512;border:1px solid rgba(218,175,55,0.15);border-radius:10px;padding:1.25rem;margin:0 0 1.5rem">
      <table style="width:100%;border-collapse:collapse;font-size:0.85rem">
        <tr><td style="padding:0.4rem 0;color:#b9aa98">Amount Charged</td><td style="padding:0.4rem 0;color:#DAAF37;text-align:right;font-weight:600">₹${amount || 0}</td></tr>
        <tr><td style="padding:0.4rem 0;color:#b9aa98">Next Renewal</td><td style="padding:0.4rem 0;color:#f6eee7;text-align:right">${endDate ? new Date(endDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}</td></tr>
        <tr><td style="padding:0.4rem 0;color:#b9aa98">Payment ID</td><td style="padding:0.4rem 0;color:#f6eee7;text-align:right;font-size:0.75rem">${paymentId || "—"}</td></tr>
      </table>
    </div>
    <p style="margin:0;color:#b9aa98;font-size:0.82rem">Your dashboard access continues uninterrupted. Thank you for being with BookMyShot!</p>
  `);

  return sendEmail({
    to: email,
    subject: "🔄 Subscription Renewed — BookMyShot",
    html,
    type: "subscription_renewed",
    userId,
    creatorId,
    meta: { amount, paymentId },
  });
}

async function sendSubscriptionExpired({ email, name, creatorId, userId }) {
  const html = wrapTemplate(`
    <p style="margin:0 0 1rem;color:#b9aa98;font-size:0.95rem">Hi ${name || "Creator"},</p>
    <h2 style="margin:0 0 1rem;color:#ef4444;font-size:1.2rem;font-weight:600">⚠️ Subscription Expired</h2>
    <p style="margin:0 0 1.5rem;color:#f6eee7;font-size:0.9rem">Your BookMyShot subscription has expired. Your profile visibility and premium features have been restricted.</p>
    <div style="background:rgba(239,68,68,0.06);border:1px solid rgba(239,68,68,0.2);border-radius:10px;padding:1rem;margin:0 0 1.5rem">
      <p style="margin:0;color:#fca5a5;font-size:0.85rem"><strong>What's affected:</strong></p>
      <ul style="margin:0.5rem 0 0;padding-left:1.2rem;color:#b9aa98;font-size:0.82rem">
        <li>Profile hidden from search results</li>
        <li>No new leads or inquiries</li>
        <li>Dashboard features restricted</li>
      </ul>
    </div>
    <p style="margin:0 0 1.5rem;color:#b9aa98;font-size:0.85rem">Renew now to restore full access immediately:</p>
    <a href="${SITE_URL}/creator/subscription.html" style="display:inline-block;padding:0.7rem 1.5rem;background:linear-gradient(135deg,#DAAF37,#F4C542);color:#111;font-weight:600;border-radius:8px;text-decoration:none;font-size:0.85rem">Renew Subscription →</a>
  `);

  return sendEmail({
    to: email,
    subject: "⚠️ Subscription Expired — Action Required",
    html,
    type: "subscription_expired",
    userId,
    creatorId,
  });
}

async function sendSubscriptionExpiryReminder({ email, name, daysLeft, endDate, creatorId, userId }) {
  const urgencyColor = daysLeft <= 1 ? "#ef4444" : daysLeft <= 3 ? "#f59e0b" : "#DAAF37";
  const html = wrapTemplate(`
    <p style="margin:0 0 1rem;color:#b9aa98;font-size:0.95rem">Hi ${name || "Creator"},</p>
    <h2 style="margin:0 0 1rem;color:${urgencyColor};font-size:1.2rem;font-weight:600">⏰ Subscription Expires in ${daysLeft} Day${daysLeft > 1 ? "s" : ""}</h2>
    <p style="margin:0 0 1.5rem;color:#f6eee7;font-size:0.9rem">Your BookMyShot subscription will expire on <strong>${endDate ? new Date(endDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "soon"}</strong>.</p>
    <div style="background:#1a1512;border:1px solid rgba(218,175,55,0.15);border-radius:10px;padding:1rem;margin:0 0 1.5rem">
      <p style="margin:0;color:#f6eee7;font-size:0.85rem">If AutoPay is enabled, your subscription will renew automatically. If not, please renew manually to avoid service interruption.</p>
    </div>
    <a href="${SITE_URL}/creator/subscription.html" style="display:inline-block;padding:0.7rem 1.5rem;background:linear-gradient(135deg,#DAAF37,#F4C542);color:#111;font-weight:600;border-radius:8px;text-decoration:none;font-size:0.85rem">Manage Subscription →</a>
  `);

  return sendEmail({
    to: email,
    subject: `⏰ Subscription expires in ${daysLeft} day${daysLeft > 1 ? "s" : ""} — BookMyShot`,
    html,
    type: "subscription_expiry_reminder",
    userId,
    creatorId,
    meta: { daysLeft },
  });
}

// ═══════════════════════════════════════════════════════════════
// 3. PAYMENT EMAILS — Creator
// ═══════════════════════════════════════════════════════════════
async function sendPaymentReceipt({ email, name, amount, paymentId, description, date, creatorId, userId }) {
  const html = wrapTemplate(`
    <p style="margin:0 0 1rem;color:#b9aa98;font-size:0.95rem">Hi ${name || "Creator"},</p>
    <h2 style="margin:0 0 1rem;color:#10b981;font-size:1.2rem;font-weight:600">💰 Payment Received</h2>
    <p style="margin:0 0 1.5rem;color:#f6eee7;font-size:0.9rem">We've received your payment successfully. Here's your receipt:</p>
    <div style="background:#1a1512;border:1px solid rgba(218,175,55,0.15);border-radius:10px;padding:1.25rem;margin:0 0 1.5rem">
      <table style="width:100%;border-collapse:collapse;font-size:0.85rem">
        <tr><td style="padding:0.4rem 0;color:#b9aa98">Description</td><td style="padding:0.4rem 0;color:#f6eee7;text-align:right">${description || "Payment"}</td></tr>
        <tr><td style="padding:0.4rem 0;color:#b9aa98">Amount</td><td style="padding:0.4rem 0;color:#DAAF37;text-align:right;font-weight:700;font-size:1.1rem">₹${amount || 0}</td></tr>
        <tr><td style="padding:0.4rem 0;color:#b9aa98">Date</td><td style="padding:0.4rem 0;color:#f6eee7;text-align:right">${date ? new Date(date).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : new Date().toLocaleString("en-IN")}</td></tr>
        <tr><td style="padding:0.4rem 0;color:#b9aa98">Payment ID</td><td style="padding:0.4rem 0;color:#f6eee7;text-align:right;font-size:0.75rem">${paymentId || "—"}</td></tr>
        <tr><td style="padding:0.4rem 0;color:#b9aa98">Status</td><td style="padding:0.4rem 0;color:#10b981;text-align:right;font-weight:600">✓ Successful</td></tr>
      </table>
    </div>
    <p style="margin:0;color:#b9aa98;font-size:0.78rem">This serves as your payment receipt. For any queries, contact support@bookmyshot.in</p>
  `);

  return sendEmail({
    to: email,
    subject: `💰 Payment Receipt — ₹${amount} — BookMyShot`,
    html,
    type: "payment_success",
    userId,
    creatorId,
    meta: { amount, paymentId, description },
  });
}

async function sendPaymentFailed({ email, name, amount, reason, creatorId, userId }) {
  const html = wrapTemplate(`
    <p style="margin:0 0 1rem;color:#b9aa98;font-size:0.95rem">Hi ${name || "Creator"},</p>
    <h2 style="margin:0 0 1rem;color:#ef4444;font-size:1.2rem;font-weight:600">❌ Payment Failed</h2>
    <p style="margin:0 0 1.5rem;color:#f6eee7;font-size:0.9rem">We were unable to process your subscription payment.</p>
    <div style="background:rgba(239,68,68,0.06);border:1px solid rgba(239,68,68,0.2);border-radius:10px;padding:1.25rem;margin:0 0 1.5rem">
      <table style="width:100%;border-collapse:collapse;font-size:0.85rem">
        <tr><td style="padding:0.4rem 0;color:#b9aa98">Amount</td><td style="padding:0.4rem 0;color:#ef4444;text-align:right;font-weight:600">₹${amount || 0}</td></tr>
        ${reason ? `<tr><td style="padding:0.4rem 0;color:#b9aa98">Reason</td><td style="padding:0.4rem 0;color:#fca5a5;text-align:right">${reason}</td></tr>` : ""}
      </table>
    </div>
    <p style="margin:0 0 1rem;color:#f6eee7;font-size:0.85rem"><strong>What to do:</strong></p>
    <ul style="margin:0 0 1.5rem;padding-left:1.2rem;color:#b9aa98;font-size:0.82rem">
      <li>Check your bank account has sufficient funds</li>
      <li>Ensure your card/UPI is not expired or blocked</li>
      <li>Try again from the subscription page</li>
    </ul>
    <a href="${SITE_URL}/creator/subscription.html" style="display:inline-block;padding:0.7rem 1.5rem;background:linear-gradient(135deg,#DAAF37,#F4C542);color:#111;font-weight:600;border-radius:8px;text-decoration:none;font-size:0.85rem">Retry Payment →</a>
  `);

  return sendEmail({
    to: email,
    subject: "❌ Payment Failed — Action Required",
    html,
    type: "payment_failed",
    userId,
    creatorId,
    meta: { amount, reason },
  });
}

// ═══════════════════════════════════════════════════════════════
// 4. PROMOTION EMAILS — Creator
// ═══════════════════════════════════════════════════════════════
async function sendPromotionActivated({ email, name, planType, amount, expiryDate, paymentId, creatorId, userId }) {
  const planLabels = {
    rank_1: "Rank #1 Promotion",
    rank_2: "Rank #2 Promotion",
    rank_3: "Rank #3 Promotion",
    rank_4: "Rank #4 Promotion",
    homepage_featured: "Homepage Featured",
    featured_1: "Featured Slot #1",
    featured_2: "Featured Slot #2",
    featured_3: "Featured Slot #3",
    featured_4: "Featured Slot #4",
  };
  const planLabel = planLabels[planType] || planType || "Promotion";

  const html = wrapTemplate(`
    <p style="margin:0 0 1rem;color:#b9aa98;font-size:0.95rem">Hi ${name || "Creator"},</p>
    <h2 style="margin:0 0 1rem;color:#DAAF37;font-size:1.2rem;font-weight:600">🏆 Promotion Activated!</h2>
    <p style="margin:0 0 1.5rem;color:#f6eee7;font-size:0.9rem">Your promotion is now live on BookMyShot!</p>
    <div style="background:#1a1512;border:1px solid rgba(218,175,55,0.15);border-radius:10px;padding:1.25rem;margin:0 0 1.5rem">
      <table style="width:100%;border-collapse:collapse;font-size:0.85rem">
        <tr><td style="padding:0.4rem 0;color:#b9aa98">Promotion</td><td style="padding:0.4rem 0;color:#DAAF37;text-align:right;font-weight:600">${planLabel}</td></tr>
        <tr><td style="padding:0.4rem 0;color:#b9aa98">Amount Paid</td><td style="padding:0.4rem 0;color:#f6eee7;text-align:right;font-weight:500">₹${amount || 0}</td></tr>
        <tr><td style="padding:0.4rem 0;color:#b9aa98">Active Until</td><td style="padding:0.4rem 0;color:#f6eee7;text-align:right">${expiryDate ? new Date(expiryDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "30 days"}</td></tr>
        <tr><td style="padding:0.4rem 0;color:#b9aa98">Payment ID</td><td style="padding:0.4rem 0;color:#f6eee7;text-align:right;font-size:0.75rem">${paymentId || "—"}</td></tr>
      </table>
    </div>
    <p style="margin:0;color:#b9aa98;font-size:0.82rem">Your profile will receive boosted visibility for the duration of this promotion.</p>
  `);

  return sendEmail({
    to: email,
    subject: `🏆 ${planLabel} Activated — BookMyShot`,
    html,
    type: "promotion_activated",
    userId,
    creatorId,
    meta: { planType, amount, paymentId },
  });
}

// ═══════════════════════════════════════════════════════════════
// 5. ADMIN NOTIFICATION EMAILS
// ═══════════════════════════════════════════════════════════════
async function sendAdminNewSubscription({ creatorName, creatorEmail, amount, paymentId }) {
  const html = wrapTemplate(`
    <h2 style="margin:0 0 1rem;color:#10b981;font-size:1.2rem;font-weight:600">💳 New Subscription Payment</h2>
    <p style="margin:0 0 1.5rem;color:#f6eee7;font-size:0.9rem">A creator has purchased a subscription on BookMyShot.</p>
    <div style="background:#1a1512;border:1px solid rgba(218,175,55,0.15);border-radius:10px;padding:1.25rem;margin:0 0 1.5rem">
      <table style="width:100%;border-collapse:collapse;font-size:0.85rem">
        <tr><td style="padding:0.4rem 0;color:#b9aa98">Creator</td><td style="padding:0.4rem 0;color:#DAAF37;text-align:right;font-weight:500">${creatorName || "Unknown"}</td></tr>
        <tr><td style="padding:0.4rem 0;color:#b9aa98">Email</td><td style="padding:0.4rem 0;color:#f6eee7;text-align:right">${creatorEmail || "—"}</td></tr>
        <tr><td style="padding:0.4rem 0;color:#b9aa98">Amount</td><td style="padding:0.4rem 0;color:#10b981;text-align:right;font-weight:600">₹${amount || 0}</td></tr>
        <tr><td style="padding:0.4rem 0;color:#b9aa98">Payment ID</td><td style="padding:0.4rem 0;color:#f6eee7;text-align:right;font-size:0.75rem">${paymentId || "—"}</td></tr>
        <tr><td style="padding:0.4rem 0;color:#b9aa98">Time</td><td style="padding:0.4rem 0;color:#f6eee7;text-align:right">${new Date().toLocaleString("en-IN")}</td></tr>
      </table>
    </div>
    <a href="${SITE_URL}/admin/dashboard.html" style="display:inline-block;padding:0.6rem 1.2rem;background:linear-gradient(135deg,#DAAF37,#F4C542);color:#111;font-weight:600;border-radius:8px;text-decoration:none;font-size:0.82rem">View Admin Panel →</a>
  `);

  return sendEmail({
    to: ADMIN_EMAIL,
    subject: `💳 New Subscription: ${creatorName} — ₹${amount}`,
    html,
    type: "admin_new_subscription",
    meta: { creatorName, creatorEmail, amount, paymentId },
  });
}

async function sendAdminPaymentFailed({ creatorName, creatorEmail, amount, reason }) {
  const html = wrapTemplate(`
    <h2 style="margin:0 0 1rem;color:#ef4444;font-size:1.2rem;font-weight:600">❌ Payment Failed Alert</h2>
    <p style="margin:0 0 1.5rem;color:#f6eee7;font-size:0.9rem">A creator's payment has failed.</p>
    <div style="background:rgba(239,68,68,0.06);border:1px solid rgba(239,68,68,0.2);border-radius:10px;padding:1.25rem;margin:0 0 1.5rem">
      <table style="width:100%;border-collapse:collapse;font-size:0.85rem">
        <tr><td style="padding:0.4rem 0;color:#b9aa98">Creator</td><td style="padding:0.4rem 0;color:#f6eee7;text-align:right;font-weight:500">${creatorName || "Unknown"}</td></tr>
        <tr><td style="padding:0.4rem 0;color:#b9aa98">Email</td><td style="padding:0.4rem 0;color:#f6eee7;text-align:right">${creatorEmail || "—"}</td></tr>
        <tr><td style="padding:0.4rem 0;color:#b9aa98">Amount</td><td style="padding:0.4rem 0;color:#ef4444;text-align:right;font-weight:600">₹${amount || 0}</td></tr>
        ${reason ? `<tr><td style="padding:0.4rem 0;color:#b9aa98">Reason</td><td style="padding:0.4rem 0;color:#fca5a5;text-align:right">${reason}</td></tr>` : ""}
      </table>
    </div>
  `);

  return sendEmail({
    to: ADMIN_EMAIL,
    subject: `❌ Payment Failed: ${creatorName}`,
    html,
    type: "admin_payment_failed",
    meta: { creatorName, creatorEmail, amount, reason },
  });
}

async function sendAdminPromotionPurchase({ creatorName, creatorEmail, planType, amount, paymentId }) {
  const html = wrapTemplate(`
    <h2 style="margin:0 0 1rem;color:#DAAF37;font-size:1.2rem;font-weight:600">🏆 New Promotion Purchase</h2>
    <p style="margin:0 0 1.5rem;color:#f6eee7;font-size:0.9rem">A creator purchased a promotion plan.</p>
    <div style="background:#1a1512;border:1px solid rgba(218,175,55,0.15);border-radius:10px;padding:1.25rem;margin:0 0 1.5rem">
      <table style="width:100%;border-collapse:collapse;font-size:0.85rem">
        <tr><td style="padding:0.4rem 0;color:#b9aa98">Creator</td><td style="padding:0.4rem 0;color:#DAAF37;text-align:right;font-weight:500">${creatorName || "Unknown"}</td></tr>
        <tr><td style="padding:0.4rem 0;color:#b9aa98">Email</td><td style="padding:0.4rem 0;color:#f6eee7;text-align:right">${creatorEmail || "—"}</td></tr>
        <tr><td style="padding:0.4rem 0;color:#b9aa98">Plan</td><td style="padding:0.4rem 0;color:#f6eee7;text-align:right">${planType || "—"}</td></tr>
        <tr><td style="padding:0.4rem 0;color:#b9aa98">Amount</td><td style="padding:0.4rem 0;color:#10b981;text-align:right;font-weight:600">₹${amount || 0}</td></tr>
        <tr><td style="padding:0.4rem 0;color:#b9aa98">Payment ID</td><td style="padding:0.4rem 0;color:#f6eee7;text-align:right;font-size:0.75rem">${paymentId || "—"}</td></tr>
      </table>
    </div>
  `);

  return sendEmail({
    to: ADMIN_EMAIL,
    subject: `🏆 Promotion Purchase: ${creatorName} — ${planType}`,
    html,
    type: "admin_promotion_purchase",
    meta: { creatorName, creatorEmail, planType, amount, paymentId },
  });
}

async function sendAdminSubscriptionExpired({ creatorName, creatorEmail }) {
  const html = wrapTemplate(`
    <h2 style="margin:0 0 1rem;color:#f59e0b;font-size:1.2rem;font-weight:600">⚠️ Subscription Expired</h2>
    <p style="margin:0 0 1.5rem;color:#f6eee7;font-size:0.9rem">A creator's subscription has expired.</p>
    <div style="background:#1a1512;border:1px solid rgba(218,175,55,0.15);border-radius:10px;padding:1rem;margin:0 0 1.5rem">
      <table style="width:100%;border-collapse:collapse;font-size:0.85rem">
        <tr><td style="padding:0.4rem 0;color:#b9aa98">Creator</td><td style="padding:0.4rem 0;color:#f6eee7;text-align:right;font-weight:500">${creatorName || "Unknown"}</td></tr>
        <tr><td style="padding:0.4rem 0;color:#b9aa98">Email</td><td style="padding:0.4rem 0;color:#f6eee7;text-align:right">${creatorEmail || "—"}</td></tr>
        <tr><td style="padding:0.4rem 0;color:#b9aa98">Status</td><td style="padding:0.4rem 0;color:#ef4444;text-align:right;font-weight:600">Expired</td></tr>
      </table>
    </div>
  `);

  return sendEmail({
    to: ADMIN_EMAIL,
    subject: `⚠️ Subscription Expired: ${creatorName}`,
    html,
    type: "admin_subscription_expired",
    meta: { creatorName, creatorEmail },
  });
}

// ═══════════════════════════════════════════════════════════════
// UTILITY
// ═══════════════════════════════════════════════════════════════
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

module.exports = {
  // Core
  sendEmail,
  generateOTP,
  // OTP
  sendVerificationOTP,
  sendPasswordResetOTP,
  // Subscription (Creator)
  sendSubscriptionActivated,
  sendSubscriptionRenewed,
  sendSubscriptionExpired,
  sendSubscriptionExpiryReminder,
  // Payment (Creator)
  sendPaymentReceipt,
  sendPaymentFailed,
  // Promotion (Creator)
  sendPromotionActivated,
  // Admin
  sendAdminNewSubscription,
  sendAdminPaymentFailed,
  sendAdminPromotionPurchase,
  sendAdminSubscriptionExpired,
};
