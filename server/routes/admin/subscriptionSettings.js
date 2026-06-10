const express = require("express");
const router = express.Router();
const { validateSubscriptionSettings } = require("../../middleware/validate");
const configService = require("../../services/configService");
const auditService = require("../../services/auditService");
const SubscriptionSettings = require("../../models/SubscriptionSettings");
const Creator = require("../../models/Creator");
const Notification = require("../../models/Notification");
const emailService = require("../../services/emailService");

// GET / - Return current subscription settings
router.get("/", async (req, res, next) => {
  try {
    const settings = await SubscriptionSettings.getSettings();
    res.json({ success: true, data: settings });
  } catch (err) {
    next(err);
  }
});

// PUT / - Update subscription settings
router.put("/", validateSubscriptionSettings, async (req, res, next) => {
  try {
    const previous = await SubscriptionSettings.getSettings();
    const previousValues = previous.toObject ? previous.toObject() : { ...previous };

    const settings = await SubscriptionSettings.updateSettings(req.body);
    configService.invalidateCache("subscription");

    await auditService.logAction({
      adminId: req.user._id,
      adminName: req.user.name || "",
      action: "update_subscription_settings",
      target: "settings",
      targetId: "subscription_settings",
      previousValues,
      newValues: settings.toObject ? settings.toObject() : { ...settings },
      ip: req.ip,
    });

    // If price changed and notify flag set, send notifications
    if (req.body._notifyCreators && previousValues.monthlyPlanPrice !== settings.monthlyPlanPrice) {
      notifyPriceChange(previousValues.monthlyPlanPrice, settings.monthlyPlanPrice).catch(e =>
        console.error("[SubSettings] Price notification error:", e.message)
      );
    }

    res.json({ success: true, data: settings });
  } catch (err) {
    next(err);
  }
});

// POST /bulk-email - Send bulk email to all creators
router.post("/bulk-email", async (req, res, next) => {
  try {
    const { subject, message } = req.body;
    if (!subject || !message) {
      return res.status(400).json({ success: false, message: "Subject and message required" });
    }

    const creators = await Creator.find({ status: "approved" }).populate("user", "name email");
    let sent = 0;
    let failed = 0;

    for (const creator of creators) {
      if (!creator.user?.email) continue;
      try {
        // Send email
        await emailService.sendEmail({
          to: creator.user.email,
          subject: subject,
          html: emailService._buildBulkEmailHtml ? emailService._buildBulkEmailHtml(creator.user.name, subject, message) : buildBulkHtml(creator.user.name, subject, message),
          type: "other",
          userId: creator.user._id,
          creatorId: creator._id,
          meta: { bulkType: "subscription_announcement" },
        });
        // Also create in-app notification
        await Notification.create({
          user: creator.user._id,
          type: "announcement",
          title: subject,
          message: message.substring(0, 200),
        });
        sent++;
      } catch (e) {
        failed++;
      }
    }

    await auditService.logAction({
      adminId: req.user._id,
      adminName: req.user.name || "",
      action: "bulk_email_creators",
      target: "creators",
      targetId: "all",
      previousValues: {},
      newValues: { subject, sent, failed },
      ip: req.ip,
    });

    res.json({ success: true, sent, failed, total: creators.length });
  } catch (e) {
    next(e);
  }
});

// POST /notify-price-change - Notify all creators about price change
router.post("/notify-price-change", async (req, res, next) => {
  try {
    const { oldPrice, newPrice, effectiveDate } = req.body;
    if (!oldPrice || !newPrice) {
      return res.status(400).json({ success: false, message: "Old and new price required" });
    }

    const result = await notifyPriceChange(oldPrice, newPrice, effectiveDate);
    res.json({ success: true, ...result });
  } catch (e) {
    next(e);
  }
});

// Helper: Send price change notifications
async function notifyPriceChange(oldPrice, newPrice, effectiveDate) {
  const creators = await Creator.find({ status: "approved" }).populate("user", "name email");
  let sent = 0;
  const dateStr = effectiveDate ? new Date(effectiveDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "next renewal";

  for (const creator of creators) {
    if (!creator.user?.email) continue;
    try {
      await emailService.sendEmail({
        to: creator.user.email,
        subject: `📢 Subscription Price Update — BookMyShot`,
        html: buildPriceChangeHtml(creator.user.name, oldPrice, newPrice, dateStr),
        type: "other",
        userId: creator.user._id,
        creatorId: creator._id,
        meta: { oldPrice, newPrice, effectiveDate },
      });
      await Notification.create({
        user: creator.user._id,
        type: "subscription",
        title: "📢 Subscription Price Update",
        message: `Monthly subscription price changing from ₹${oldPrice} to ₹${newPrice}, effective from ${dateStr}.`,
      });
      sent++;
    } catch (e) { /* continue */ }
  }
  return { sent, total: creators.length };
}

// HTML builder for bulk emails
function buildBulkHtml(name, subject, message) {
  const SITE_URL = process.env.SITE_URL || "https://site--bookmyshot--ykz2mr8mzlrv.code.run";
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#0a0806;font-family:'Segoe UI',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0806;padding:24px 16px"><tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#111;border-radius:16px;overflow:hidden;border:1px solid rgba(218,175,55,.12)">
<tr><td style="background:linear-gradient(135deg,#1a1410,#0d0b08);padding:24px 32px;border-bottom:1px solid rgba(218,175,55,.15)"><span style="font-size:22px;font-weight:700;color:#DAAF37">BookMyShot</span></td></tr>
<tr><td style="height:3px;background:linear-gradient(90deg,#DAAF37,#F4C542,#DAAF37)"></td></tr>
<tr><td style="padding:32px">
  <p style="margin:0 0 12px;color:#b9aa98;font-size:15px">Hi <strong style="color:#f6eee7">${name || "Creator"}</strong>,</p>
  <h2 style="margin:0 0 16px;color:#DAAF37;font-size:18px">${subject}</h2>
  <div style="color:#d4c8bc;font-size:14px;line-height:1.7;white-space:pre-wrap">${message}</div>
</td></tr>
<tr><td style="padding:0 32px 32px"><table cellpadding="0" cellspacing="0"><tr><td style="background:linear-gradient(135deg,#DAAF37,#F4C542);border-radius:10px;padding:12px 24px"><a href="${SITE_URL}/creator/dashboard.html" style="color:#111;font-size:14px;font-weight:700;text-decoration:none">Open Dashboard →</a></td></tr></table></td></tr>
<tr><td style="padding:20px 32px;border-top:1px solid rgba(255,255,255,.04)"><p style="margin:0;font-size:11px;color:rgba(255,255,255,.2)">© 2026 BookMyShot. All rights reserved.</p></td></tr>
</table></td></tr></table></body></html>`;
}

// HTML builder for price change notification
function buildPriceChangeHtml(name, oldPrice, newPrice, effectiveDate) {
  const SITE_URL = process.env.SITE_URL || "https://site--bookmyshot--ykz2mr8mzlrv.code.run";
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#0a0806;font-family:'Segoe UI',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0806;padding:24px 16px"><tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#111;border-radius:16px;overflow:hidden;border:1px solid rgba(218,175,55,.12)">
<tr><td style="background:linear-gradient(135deg,#1a1410,#0d0b08);padding:24px 32px;border-bottom:1px solid rgba(218,175,55,.15)"><span style="font-size:22px;font-weight:700;color:#DAAF37">BookMyShot</span></td></tr>
<tr><td style="height:3px;background:linear-gradient(90deg,#DAAF37,#F4C542,#DAAF37)"></td></tr>
<tr><td style="padding:32px">
  <p style="margin:0 0 12px;color:#b9aa98;font-size:15px">Hi <strong style="color:#f6eee7">${name || "Creator"}</strong>,</p>
  <h2 style="margin:0 0 16px;color:#f59e0b;font-size:18px">📢 Subscription Price Update</h2>
  <p style="margin:0 0 20px;color:#d4c8bc;font-size:14px">We're writing to inform you about an upcoming change to your subscription pricing.</p>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#1a1512;border:1px solid rgba(218,175,55,.12);border-radius:12px;padding:16px;margin:0 0 20px">
    <tr><td style="padding:8px 0;color:#9a8e82;font-size:13px">Previous Price</td><td style="padding:8px 0;text-align:right;font-size:13px;color:#f6eee7;text-decoration:line-through">₹${oldPrice}/month</td></tr>
    <tr><td style="padding:8px 0;color:#9a8e82;font-size:13px">New Price</td><td style="padding:8px 0;text-align:right;font-size:15px;color:#DAAF37;font-weight:700">₹${newPrice}/month</td></tr>
    <tr><td style="padding:8px 0;color:#9a8e82;font-size:13px">Effective From</td><td style="padding:8px 0;text-align:right;font-size:13px;color:#f6eee7">${effectiveDate}</td></tr>
  </table>
  <p style="margin:0;color:#8a7e72;font-size:12px">The new price will apply from your next renewal date. No action is needed from your side — AutoPay will continue as normal.</p>
</td></tr>
<tr><td style="padding:0 32px 32px"><table cellpadding="0" cellspacing="0"><tr><td style="background:linear-gradient(135deg,#DAAF37,#F4C542);border-radius:10px;padding:12px 24px"><a href="${SITE_URL}/creator/dashboard.html" style="color:#111;font-size:14px;font-weight:700;text-decoration:none">View Subscription →</a></td></tr></table></td></tr>
<tr><td style="padding:20px 32px;border-top:1px solid rgba(255,255,255,.04)"><p style="margin:0;font-size:11px;color:rgba(255,255,255,.2)">© 2026 BookMyShot. All rights reserved.</p></td></tr>
</table></td></tr></table></body></html>`;
}

module.exports = router;
