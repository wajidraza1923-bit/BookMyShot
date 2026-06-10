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
const FROM_EMAIL = "BookMyShot <noreply@bookmyshot.in>";
const FROM_OTP = "BookMyShot <otp@bookmyshot.in>";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "bookmyshott@gmail.com";
const SITE_URL = process.env.SITE_URL || "https://site--bookmyshot--ykz2mr8mzlrv.code.run";
const LOGO_URL = SITE_URL + "/favico.png";

// ═══════════════════════════════════════════════════════════════
// CORE EMAIL SENDER (with logging to MongoDB)
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
    try { await EmailLog.create(logEntry); } catch (e) { /* ignore */ }
    console.error(`[EmailService] ❌ Cannot send to ${to} — Resend not initialized`);
    return { success: false, error: "RESEND_API_KEY not configured" };
  }

  try {
    const response = await resend.emails.send({ from: fromAddr, to, subject, html });
    logEntry.status = "sent";
    logEntry.resendId = response?.data?.id || response?.id || "";
    try { await EmailLog.create(logEntry); } catch (e) { /* ignore */ }
    console.log(`[EmailService] ✅ Sent to ${to} | ${type} | ${subject}`);
    return { success: true, resendId: logEntry.resendId };
  } catch (err) {
    logEntry.status = "failed";
    logEntry.error = err.message || "Unknown error";
    try { await EmailLog.create(logEntry); } catch (e) { /* ignore */ }
    console.error(`[EmailService] ❌ Failed ${type} → ${to}: ${err.message}`);
    return { success: false, error: err.message };
  }
}

// ═══════════════════════════════════════════════════════════════
// BRANDED EMAIL TEMPLATE — BookMyShot Gold/Black Premium
// ═══════════════════════════════════════════════════════════════
function brandedTemplate({ title, titleColor, body, buttonText, buttonUrl, footerNote }) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0806;font-family:'Segoe UI',Roboto,Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0806;padding:24px 16px">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#111111;border-radius:16px;overflow:hidden;border:1px solid rgba(218,175,55,0.12)">

<!-- HEADER with Logo -->
<tr><td style="background:linear-gradient(135deg,#1a1410 0%,#0d0b08 100%);padding:28px 32px;border-bottom:1px solid rgba(218,175,55,0.15)">
  <table width="100%" cellpadding="0" cellspacing="0">
  <tr>
    <td style="vertical-align:middle"><img src="${LOGO_URL}" width="36" height="36" alt="BookMyShot" style="border-radius:8px;display:block"></td>
    <td style="vertical-align:middle;padding-left:12px"><span style="font-size:22px;font-weight:700;color:#DAAF37;letter-spacing:0.5px">BookMyShot</span></td>
    <td style="vertical-align:middle;text-align:right"><span style="font-size:11px;color:rgba(255,255,255,0.3);text-transform:uppercase;letter-spacing:1px">Creator Platform</span></td>
  </tr>
  </table>
</td></tr>

<!-- GOLD ACCENT LINE -->
<tr><td style="height:3px;background:linear-gradient(90deg,#DAAF37 0%,#F4C542 50%,#DAAF37 100%)"></td></tr>

<!-- TITLE -->
<tr><td style="padding:32px 32px 0">
  <h1 style="margin:0;font-size:22px;font-weight:700;color:${titleColor || '#DAAF37'};line-height:1.3">${title}</h1>
</td></tr>

<!-- BODY CONTENT -->
<tr><td style="padding:20px 32px 32px">
  ${body}
</td></tr>

<!-- CTA BUTTON -->
${buttonText && buttonUrl ? `<tr><td style="padding:0 32px 32px">
  <table cellpadding="0" cellspacing="0"><tr><td style="background:linear-gradient(135deg,#DAAF37,#F4C542);border-radius:10px;padding:14px 28px">
    <a href="${buttonUrl}" style="color:#111;font-size:14px;font-weight:700;text-decoration:none;display:block">${buttonText}</a>
  </td></tr></table>
</td></tr>` : ''}

<!-- DIVIDER -->
<tr><td style="padding:0 32px"><div style="height:1px;background:rgba(218,175,55,0.1)"></div></td></tr>

<!-- FOOTER -->
<tr><td style="padding:24px 32px">
  ${footerNote ? `<p style="margin:0 0 12px;font-size:12px;color:rgba(255,255,255,0.4)">${footerNote}</p>` : ''}
  <p style="margin:0 0 6px;font-size:11px;color:rgba(255,255,255,0.25)">This is an automated email from BookMyShot. Do not reply to this email.</p>
  <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.2)">© 2026 BookMyShot. All rights reserved. | <a href="${SITE_URL}/privacy" style="color:rgba(218,175,55,0.4);text-decoration:none">Privacy</a> · <a href="${SITE_URL}/terms" style="color:rgba(218,175,55,0.4);text-decoration:none">Terms</a> · <a href="${SITE_URL}/refund-policy" style="color:rgba(218,175,55,0.4);text-decoration:none">Refunds</a></p>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

// Detail row helper for tables
function detailRow(label, value, valueColor) {
  return `<tr><td style="padding:8px 0;color:#9a8e82;font-size:13px;border-bottom:1px solid rgba(255,255,255,0.04)">${label}</td><td style="padding:8px 0;text-align:right;font-size:13px;font-weight:500;color:${valueColor || '#f6eee7'};border-bottom:1px solid rgba(255,255,255,0.04)">${value}</td></tr>`;
}

function detailsTable(rows) {
  return `<table width="100%" cellpadding="0" cellspacing="0" style="background:#1a1512;border:1px solid rgba(218,175,55,0.12);border-radius:12px;padding:16px;margin:16px 0">${rows}</table>`;
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateTime(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ═══════════════════════════════════════════════════════════════
// OTP EMAILS
// ═══════════════════════════════════════════════════════════════
async function sendVerificationOTP(email, otp, name) {
  const html = brandedTemplate({
    title: '🔐 Verify Your Email',
    titleColor: '#DAAF37',
    body: `
      <p style="margin:0 0 16px;color:#b9aa98;font-size:15px">Hi <strong style="color:#f6eee7">${name || 'there'}</strong>,</p>
      <p style="margin:0 0 20px;color:#d4c8bc;font-size:14px">Use this code to verify your BookMyShot account:</p>
      <div style="background:#1a1512;border:2px solid rgba(218,175,55,0.25);border-radius:12px;padding:24px;text-align:center;margin:0 0 20px">
        <span style="font-size:36px;font-weight:800;letter-spacing:8px;color:#DAAF37">${otp}</span>
      </div>
      <p style="margin:0;color:#8a7e72;font-size:12px">Code expires in <strong style="color:#d4c8bc">10 minutes</strong>. If you didn't request this, ignore this email.</p>
    `,
    footerNote: 'This code was requested for account verification on BookMyShot.',
  });

  return sendEmail({ to: email, subject: '🔐 Verify your BookMyShot account', html, from: FROM_OTP, type: 'otp_verification', meta: { otp } });
}

async function sendPasswordResetOTP(email, otp, name) {
  const html = brandedTemplate({
    title: '🔑 Password Reset Code',
    titleColor: '#f59e0b',
    body: `
      <p style="margin:0 0 16px;color:#b9aa98;font-size:15px">Hi <strong style="color:#f6eee7">${name || 'there'}</strong>,</p>
      <p style="margin:0 0 20px;color:#d4c8bc;font-size:14px">Your password reset code:</p>
      <div style="background:#1a1512;border:2px solid rgba(245,158,11,0.25);border-radius:12px;padding:24px;text-align:center;margin:0 0 20px">
        <span style="font-size:36px;font-weight:800;letter-spacing:8px;color:#f59e0b">${otp}</span>
      </div>
      <p style="margin:0;color:#8a7e72;font-size:12px">Code expires in <strong style="color:#d4c8bc">10 minutes</strong>. If you didn't request this, your password is safe.</p>
    `,
    footerNote: 'If you did not request a password reset, please ignore this email.',
  });

  return sendEmail({ to: email, subject: '🔑 Reset your BookMyShot password', html, from: FROM_OTP, type: 'otp_password_reset', meta: { otp } });
}

// ═══════════════════════════════════════════════════════════════
// 1. SUBSCRIPTION ACTIVATED
// ═══════════════════════════════════════════════════════════════
async function sendSubscriptionActivated({ email, name, planName, amount, endDate, paymentId, creatorId, userId }) {
  const html = brandedTemplate({
    title: '✅ Subscription Activated!',
    titleColor: '#10b981',
    body: `
      <p style="margin:0 0 16px;color:#b9aa98;font-size:15px">Hi <strong style="color:#f6eee7">${name || 'Creator'}</strong>,</p>
      <p style="margin:0 0 20px;color:#d4c8bc;font-size:14px">Your BookMyShot creator subscription is now active. You have full access to all premium features.</p>
      ${detailsTable(
        detailRow('Creator', name || '—', '#DAAF37') +
        detailRow('Plan', planName || 'Monthly Subscription', '#f6eee7') +
        detailRow('Amount', '₹' + (amount || 0), '#DAAF37') +
        detailRow('Valid Until', formatDate(endDate)) +
        detailRow('Transaction ID', paymentId || '—', 'rgba(255,255,255,0.5)')
      )}
      <p style="margin:16px 0 0;color:#8a7e72;font-size:12px">Your subscription renews automatically via Razorpay AutoPay. You can manage it from your dashboard.</p>
    `,
    buttonText: 'Open Creator Dashboard →',
    buttonUrl: SITE_URL + '/creator/dashboard.html',
    footerNote: 'Thank you for being a BookMyShot creator!',
  });

  return sendEmail({ to: email, subject: '✅ Subscription Activated — BookMyShot', html, type: 'subscription_activated', userId, creatorId, meta: { amount, planName, paymentId } });
}

// ═══════════════════════════════════════════════════════════════
// 2. SUBSCRIPTION RENEWED
// ═══════════════════════════════════════════════════════════════
async function sendSubscriptionRenewed({ email, name, amount, endDate, paymentId, creatorId, userId }) {
  const html = brandedTemplate({
    title: '🔄 Subscription Renewed',
    titleColor: '#10b981',
    body: `
      <p style="margin:0 0 16px;color:#b9aa98;font-size:15px">Hi <strong style="color:#f6eee7">${name || 'Creator'}</strong>,</p>
      <p style="margin:0 0 20px;color:#d4c8bc;font-size:14px">Your monthly subscription has been renewed automatically. No action needed.</p>
      ${detailsTable(
        detailRow('Amount Charged', '₹' + (amount || 0), '#DAAF37') +
        detailRow('Next Renewal', formatDate(endDate)) +
        detailRow('Transaction ID', paymentId || '—', 'rgba(255,255,255,0.5)') +
        detailRow('Status', '✓ Paid', '#10b981')
      )}
      <p style="margin:16px 0 0;color:#8a7e72;font-size:12px">Your dashboard access continues uninterrupted. Thank you for being with BookMyShot!</p>
    `,
    buttonText: 'View Dashboard →',
    buttonUrl: SITE_URL + '/creator/dashboard.html',
  });

  return sendEmail({ to: email, subject: '🔄 Subscription Renewed — BookMyShot', html, type: 'subscription_renewed', userId, creatorId, meta: { amount, paymentId } });
}

// ═══════════════════════════════════════════════════════════════
// 3/4/5. SUBSCRIPTION EXPIRING (7, 3, 1 days)
// ═══════════════════════════════════════════════════════════════
async function sendSubscriptionExpiryReminder({ email, name, daysLeft, endDate, creatorId, userId }) {
  const urgencyColor = daysLeft <= 1 ? '#ef4444' : daysLeft <= 3 ? '#f59e0b' : '#DAAF37';
  const urgencyEmoji = daysLeft <= 1 ? '🚨' : daysLeft <= 3 ? '⚠️' : '⏰';
  const urgencyText = daysLeft <= 1 ? 'Your subscription expires TOMORROW!' : daysLeft <= 3 ? 'Your subscription expires very soon.' : 'Your subscription is expiring soon.';

  const html = brandedTemplate({
    title: `${urgencyEmoji} Expires in ${daysLeft} Day${daysLeft > 1 ? 's' : ''}`,
    titleColor: urgencyColor,
    body: `
      <p style="margin:0 0 16px;color:#b9aa98;font-size:15px">Hi <strong style="color:#f6eee7">${name || 'Creator'}</strong>,</p>
      <p style="margin:0 0 20px;color:#d4c8bc;font-size:14px">${urgencyText}</p>
      ${detailsTable(
        detailRow('Expiry Date', formatDate(endDate), urgencyColor) +
        detailRow('Days Remaining', daysLeft + ' day' + (daysLeft > 1 ? 's' : ''), urgencyColor) +
        detailRow('Auto-Renew', 'If enabled, payment will be deducted automatically')
      )}
      <div style="background:rgba(218,175,55,0.06);border:1px solid rgba(218,175,55,0.15);border-radius:10px;padding:14px;margin:16px 0">
        <p style="margin:0;color:#d4c8bc;font-size:13px"><strong style="color:#DAAF37">💡 Tip:</strong> If AutoPay is active, your subscription will renew automatically. No manual action needed.</p>
      </div>
    `,
    buttonText: 'Manage Subscription →',
    buttonUrl: SITE_URL + '/creator/subscription.html',
    footerNote: daysLeft <= 1 ? 'URGENT: Your access will be restricted tomorrow if not renewed.' : 'Renew early to ensure uninterrupted access.',
  });

  return sendEmail({ to: email, subject: `${urgencyEmoji} Subscription expires in ${daysLeft} day${daysLeft > 1 ? 's' : ''} — BookMyShot`, html, type: 'subscription_expiry_reminder', userId, creatorId, meta: { daysLeft } });
}

// ═══════════════════════════════════════════════════════════════
// 6. SUBSCRIPTION EXPIRED
// ═══════════════════════════════════════════════════════════════
async function sendSubscriptionExpired({ email, name, creatorId, userId }) {
  const html = brandedTemplate({
    title: '🚫 Subscription Expired',
    titleColor: '#ef4444',
    body: `
      <p style="margin:0 0 16px;color:#b9aa98;font-size:15px">Hi <strong style="color:#f6eee7">${name || 'Creator'}</strong>,</p>
      <p style="margin:0 0 20px;color:#d4c8bc;font-size:14px">Your BookMyShot subscription has expired. Your account features have been restricted.</p>
      <div style="background:rgba(239,68,68,0.06);border:1px solid rgba(239,68,68,0.15);border-radius:10px;padding:16px;margin:0 0 20px">
        <p style="margin:0 0 8px;color:#fca5a5;font-size:13px;font-weight:600">Features now restricted:</p>
        <table cellpadding="0" cellspacing="0" style="width:100%">
          <tr><td style="padding:4px 0;color:#d4c8bc;font-size:12px">❌ Profile hidden from search & homepage</td></tr>
          <tr><td style="padding:4px 0;color:#d4c8bc;font-size:12px">❌ New leads and inquiries paused</td></tr>
          <tr><td style="padding:4px 0;color:#d4c8bc;font-size:12px">❌ Analytics and premium tools locked</td></tr>
          <tr><td style="padding:4px 0;color:#d4c8bc;font-size:12px">❌ Featured status and promotions removed</td></tr>
        </table>
      </div>
      <p style="margin:0;color:#8a7e72;font-size:12px">Renew now to restore full access instantly. All your data is safe.</p>
    `,
    buttonText: 'Renew Subscription Now →',
    buttonUrl: SITE_URL + '/creator/subscription.html',
    footerNote: 'Your profile data and portfolio are preserved. Renew to reactivate everything.',
  });

  return sendEmail({ to: email, subject: '🚫 Subscription Expired — Renew to Restore Access', html, type: 'subscription_expired', userId, creatorId });
}

// ═══════════════════════════════════════════════════════════════
// 7. PROMOTION PURCHASED
// ═══════════════════════════════════════════════════════════════
async function sendPromotionActivated({ email, name, planType, amount, expiryDate, paymentId, creatorId, userId }) {
  const planLabels = { rank_1: 'Rank #1', rank_2: 'Rank #2', rank_3: 'Rank #3', rank_4: 'Rank #4', homepage_featured: 'Homepage Featured', featured_1: 'Featured #1', featured_2: 'Featured #2', featured_3: 'Featured #3', featured_4: 'Featured #4' };
  const planLabel = planLabels[planType] || planType || 'Promotion';

  const html = brandedTemplate({
    title: '🏆 Promotion Activated!',
    titleColor: '#DAAF37',
    body: `
      <p style="margin:0 0 16px;color:#b9aa98;font-size:15px">Hi <strong style="color:#f6eee7">${name || 'Creator'}</strong>,</p>
      <p style="margin:0 0 20px;color:#d4c8bc;font-size:14px">Your promotion is now <strong style="color:#10b981">LIVE</strong> on BookMyShot! You'll receive boosted visibility.</p>
      ${detailsTable(
        detailRow('Promotion Plan', planLabel, '#DAAF37') +
        detailRow('Amount Paid', '₹' + (amount || 0), '#DAAF37') +
        detailRow('Active Until', formatDate(expiryDate)) +
        detailRow('Transaction ID', paymentId || '—', 'rgba(255,255,255,0.5)') +
        detailRow('Duration', '30 Days')
      )}
      <p style="margin:16px 0 0;color:#8a7e72;font-size:12px">Your profile now has priority placement. Expect increased leads and visibility during the promotion period.</p>
    `,
    buttonText: 'View Your Profile →',
    buttonUrl: SITE_URL + '/creator/dashboard.html',
  });

  return sendEmail({ to: email, subject: `🏆 ${planLabel} Promotion Activated — BookMyShot`, html, type: 'promotion_activated', userId, creatorId, meta: { planType, amount, paymentId } });
}

// ═══════════════════════════════════════════════════════════════
// 8. PROMOTION EXPIRED
// ═══════════════════════════════════════════════════════════════
async function sendPromotionExpired({ email, name, planType, creatorId, userId }) {
  const planLabels = { rank_1: 'Rank #1', rank_2: 'Rank #2', rank_3: 'Rank #3', rank_4: 'Rank #4', homepage_featured: 'Homepage Featured', featured_1: 'Featured #1', featured_2: 'Featured #2', featured_3: 'Featured #3', featured_4: 'Featured #4' };
  const planLabel = planLabels[planType] || planType || 'Promotion';

  const html = brandedTemplate({
    title: '📋 Promotion Ended',
    titleColor: '#f59e0b',
    body: `
      <p style="margin:0 0 16px;color:#b9aa98;font-size:15px">Hi <strong style="color:#f6eee7">${name || 'Creator'}</strong>,</p>
      <p style="margin:0 0 20px;color:#d4c8bc;font-size:14px">Your <strong style="color:#DAAF37">${planLabel}</strong> promotion has ended. Your profile has returned to standard visibility.</p>
      ${detailsTable(
        detailRow('Promotion', planLabel) +
        detailRow('Status', 'Expired', '#f59e0b') +
        detailRow('Action', 'Repurchase to continue visibility boost')
      )}
      <p style="margin:16px 0 0;color:#8a7e72;font-size:12px">Want to stay at the top? Repurchase your promotion from the dashboard.</p>
    `,
    buttonText: 'View Promotion Plans →',
    buttonUrl: SITE_URL + '/creator/dashboard.html',
  });

  return sendEmail({ to: email, subject: `📋 Promotion Ended: ${planLabel} — BookMyShot`, html, type: 'promotion_expired', userId, creatorId, meta: { planType } });
}

// ═══════════════════════════════════════════════════════════════
// 9. PAYMENT FAILED
// ═══════════════════════════════════════════════════════════════
async function sendPaymentFailed({ email, name, amount, reason, creatorId, userId }) {
  const html = brandedTemplate({
    title: '❌ Payment Failed',
    titleColor: '#ef4444',
    body: `
      <p style="margin:0 0 16px;color:#b9aa98;font-size:15px">Hi <strong style="color:#f6eee7">${name || 'Creator'}</strong>,</p>
      <p style="margin:0 0 20px;color:#d4c8bc;font-size:14px">We were unable to process your subscription payment. Your account may be affected if not resolved.</p>
      ${detailsTable(
        detailRow('Amount', '₹' + (amount || 0), '#ef4444') +
        (reason ? detailRow('Reason', reason, '#fca5a5') : '') +
        detailRow('Status', '✗ Failed', '#ef4444')
      )}
      <div style="background:rgba(239,68,68,0.04);border:1px solid rgba(239,68,68,0.12);border-radius:10px;padding:14px;margin:16px 0">
        <p style="margin:0 0 8px;color:#f6eee7;font-size:13px;font-weight:600">What to do:</p>
        <table cellpadding="0" cellspacing="0" style="width:100%">
          <tr><td style="padding:3px 0;color:#d4c8bc;font-size:12px">1. Check bank account has sufficient funds</td></tr>
          <tr><td style="padding:3px 0;color:#d4c8bc;font-size:12px">2. Ensure card/UPI is not expired or blocked</td></tr>
          <tr><td style="padding:3px 0;color:#d4c8bc;font-size:12px">3. Contact your bank if issue persists</td></tr>
          <tr><td style="padding:3px 0;color:#d4c8bc;font-size:12px">4. Razorpay will retry automatically within 24–72 hours</td></tr>
        </table>
      </div>
    `,
    buttonText: 'Update Payment Method →',
    buttonUrl: SITE_URL + '/creator/subscription.html',
    footerNote: 'If the issue persists after 3 retries, your subscription will be suspended.',
  });

  return sendEmail({ to: email, subject: '❌ Payment Failed — Action Required', html, type: 'payment_failed', userId, creatorId, meta: { amount, reason } });
}

// ═══════════════════════════════════════════════════════════════
// 10. PAYMENT RECEIPT
// ═══════════════════════════════════════════════════════════════
async function sendPaymentReceipt({ email, name, amount, paymentId, description, date, creatorId, userId }) {
  const html = brandedTemplate({
    title: '💰 Payment Receipt',
    titleColor: '#10b981',
    body: `
      <p style="margin:0 0 16px;color:#b9aa98;font-size:15px">Hi <strong style="color:#f6eee7">${name || 'Creator'}</strong>,</p>
      <p style="margin:0 0 20px;color:#d4c8bc;font-size:14px">Payment received successfully. Here's your receipt:</p>
      ${detailsTable(
        detailRow('Description', description || 'Payment') +
        detailRow('Amount', '₹' + (amount || 0), '#DAAF37') +
        detailRow('Date', formatDateTime(date || new Date())) +
        detailRow('Transaction ID', paymentId || '—', 'rgba(255,255,255,0.5)') +
        detailRow('Status', '✓ Successful', '#10b981')
      )}
      <p style="margin:16px 0 0;color:#8a7e72;font-size:12px">This email serves as your payment receipt. For queries, contact support@bookmyshot.in</p>
    `,
    buttonText: 'View Dashboard →',
    buttonUrl: SITE_URL + '/creator/dashboard.html',
    footerNote: 'Payment processed securely via Razorpay.',
  });

  return sendEmail({ to: email, subject: `💰 Payment Receipt — ₹${amount} — BookMyShot`, html, type: 'payment_success', userId, creatorId, meta: { amount, paymentId, description } });
}

// ═══════════════════════════════════════════════════════════════
// ADMIN EMAILS
// ═══════════════════════════════════════════════════════════════
async function sendAdminNewSubscription({ creatorName, creatorEmail, amount, paymentId }) {
  const html = brandedTemplate({
    title: '💳 New Payment Received',
    titleColor: '#10b981',
    body: `
      <p style="margin:0 0 20px;color:#d4c8bc;font-size:14px">A creator subscription payment was received.</p>
      ${detailsTable(
        detailRow('Creator', creatorName || 'Unknown', '#DAAF37') +
        detailRow('Email', creatorEmail || '—') +
        detailRow('Amount', '₹' + (amount || 0), '#10b981') +
        detailRow('Transaction ID', paymentId || '—', 'rgba(255,255,255,0.5)') +
        detailRow('Time', formatDateTime(new Date()))
      )}
    `,
    buttonText: 'View Admin Panel →',
    buttonUrl: SITE_URL + '/admin/dashboard.html',
  });

  return sendEmail({ to: ADMIN_EMAIL, subject: `💳 Payment: ${creatorName} — ₹${amount}`, html, type: 'admin_new_subscription', meta: { creatorName, creatorEmail, amount, paymentId } });
}

async function sendAdminPaymentFailed({ creatorName, creatorEmail, amount, reason }) {
  const html = brandedTemplate({
    title: '❌ Payment Failed Alert',
    titleColor: '#ef4444',
    body: `
      <p style="margin:0 0 20px;color:#d4c8bc;font-size:14px">A creator's payment has failed.</p>
      ${detailsTable(
        detailRow('Creator', creatorName || 'Unknown', '#DAAF37') +
        detailRow('Email', creatorEmail || '—') +
        detailRow('Amount', '₹' + (amount || 0), '#ef4444') +
        (reason ? detailRow('Reason', reason, '#fca5a5') : '') +
        detailRow('Time', formatDateTime(new Date()))
      )}
    `,
    buttonText: 'View Admin Panel →',
    buttonUrl: SITE_URL + '/admin/dashboard.html',
  });

  return sendEmail({ to: ADMIN_EMAIL, subject: `❌ Payment Failed: ${creatorName}`, html, type: 'admin_payment_failed', meta: { creatorName, creatorEmail, amount, reason } });
}

async function sendAdminPromotionPurchase({ creatorName, creatorEmail, planType, amount, paymentId }) {
  const html = brandedTemplate({
    title: '🏆 Promotion Purchased',
    titleColor: '#DAAF37',
    body: `
      <p style="margin:0 0 20px;color:#d4c8bc;font-size:14px">A creator purchased a promotion.</p>
      ${detailsTable(
        detailRow('Creator', creatorName || 'Unknown', '#DAAF37') +
        detailRow('Email', creatorEmail || '—') +
        detailRow('Plan', planType || '—') +
        detailRow('Amount', '₹' + (amount || 0), '#10b981') +
        detailRow('Transaction ID', paymentId || '—', 'rgba(255,255,255,0.5)')
      )}
    `,
    buttonText: 'View Admin Panel →',
    buttonUrl: SITE_URL + '/admin/dashboard.html',
  });

  return sendEmail({ to: ADMIN_EMAIL, subject: `🏆 Promotion: ${creatorName} — ${planType}`, html, type: 'admin_promotion_purchase', meta: { creatorName, creatorEmail, planType, amount, paymentId } });
}

async function sendAdminSubscriptionExpired({ creatorName, creatorEmail }) {
  const html = brandedTemplate({
    title: '⚠️ Subscription Expired',
    titleColor: '#f59e0b',
    body: `
      <p style="margin:0 0 20px;color:#d4c8bc;font-size:14px">A creator's subscription has expired.</p>
      ${detailsTable(
        detailRow('Creator', creatorName || 'Unknown') +
        detailRow('Email', creatorEmail || '—') +
        detailRow('Status', 'Expired', '#ef4444') +
        detailRow('Time', formatDateTime(new Date()))
      )}
    `,
    buttonText: 'View Admin Panel →',
    buttonUrl: SITE_URL + '/admin/dashboard.html',
  });

  return sendEmail({ to: ADMIN_EMAIL, subject: `⚠️ Expired: ${creatorName}`, html, type: 'admin_subscription_expired', meta: { creatorName, creatorEmail } });
}

// ═══════════════════════════════════════════════════════════════
// UTILITY
// ═══════════════════════════════════════════════════════════════
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

module.exports = {
  sendEmail,
  generateOTP,
  // OTP
  sendVerificationOTP,
  sendPasswordResetOTP,
  // Subscription
  sendSubscriptionActivated,
  sendSubscriptionRenewed,
  sendSubscriptionExpired,
  sendSubscriptionExpiryReminder,
  // Payment
  sendPaymentReceipt,
  sendPaymentFailed,
  // Promotion
  sendPromotionActivated,
  sendPromotionExpired,
  // Admin
  sendAdminNewSubscription,
  sendAdminPaymentFailed,
  sendAdminPromotionPurchase,
  sendAdminSubscriptionExpired,
};
