/**
 * BookMyShot — Automated Scheduler
 * Runs daily cron jobs for subscription alerts, commission reminders, and promotion expiry.
 * 
 * Subscription Reminder Logic:
 * - AutoPay ON: No reminders sent (Razorpay handles renewal automatically)
 * - AutoPay OFF (cancelled): Send reminders at 7, 5, 3, 1 days before expiry
 * - Day of expiry: Dashboard warning + expiry notification
 * - After expiry: Immediately expire (no grace period)
 */
const cron = require("node-cron");

function initScheduler() {
  console.log("[Scheduler] Starting automated jobs...");

  // Daily at 9:00 AM IST — Subscription expiry + pre-expiry reminders
  cron.schedule("0 9 * * *", async () => {
    console.log("[Scheduler] Running subscription alerts...");
    try {
      const Creator = require("../models/Creator");
      const Notification = require("../models/Notification");
      const emailService = require("./emailService");
      const now = new Date();
      const creators = await Creator.find({ subscriptionStatus: { $in: ["active", "trial"] } }).populate("user", "name email");
      let expired = 0;
      let reminded = 0;

      for (const c of creators) {
        if (!c.subscriptionEndDate || !c.user) continue;
        const daysLeft = Math.ceil((c.subscriptionEndDate - now) / 86400000);

        if (daysLeft <= 0) {
          // ═══ EXPIRED — instant loss of access ═══
          await Creator.updateOne({ _id: c._id }, { $set: { subscriptionStatus: "expired", featured: false } });
          if (c.user.email) {
            emailService.sendSubscriptionExpired({ email: c.user.email, name: c.user.name, creatorId: c._id, userId: c.user._id }).catch(() => {});
          }
          await Notification.create({
            user: c.user._id,
            type: "subscription",
            title: "⚠️ Subscription Expired",
            message: "Your subscription has expired. Your profile is now hidden from search, bookings and inquiries are disabled. Renew immediately to restore access.",
          });
          expired++;
        } else if (daysLeft === 1) {
          // ═══ LAST DAY — warn everyone (AutoPay ON or OFF) ═══
          // Even with AutoPay, inform them about what happens if payment fails
          const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          const existing = await Notification.findOne({ user: c.user._id, type: "subscription", createdAt: { $gte: today } });
          if (!existing) {
            const autoPayMsg = c.autoRenew
              ? "Your subscription renews tomorrow via AutoPay. If payment fails, your profile will be hidden."
              : "Your subscription expires TOMORROW. Without renewal:\n• Profile hidden from search\n• No new bookings or inquiries\n• Promotions removed\nRenew now to stay visible.";
            if (c.user.email) {
              emailService.sendSubscriptionExpiryReminder({ email: c.user.email, name: c.user.name, daysLeft: 1, endDate: c.subscriptionEndDate, creatorId: c._id, userId: c.user._id }).catch(() => {});
            }
            await Notification.create({
              user: c.user._id,
              type: "subscription",
              title: "🚨 Subscription Expires Tomorrow",
              message: autoPayMsg,
            });
            reminded++;
          }
        } else if ([7, 5, 3].includes(daysLeft)) {
          // ═══ PRE-EXPIRY REMINDERS — only if AutoPay is OFF ═══
          // If creator has AutoPay enabled, Razorpay handles renewal automatically — no need to nag
          if (c.autoRenew === true) continue;

          const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          const existing = await Notification.findOne({ user: c.user._id, type: "subscription", createdAt: { $gte: today } });
          if (!existing) {
            if (c.user.email) {
              emailService.sendSubscriptionExpiryReminder({ email: c.user.email, name: c.user.name, daysLeft, endDate: c.subscriptionEndDate, creatorId: c._id, userId: c.user._id }).catch(() => {});
            }
            await Notification.create({
              user: c.user._id,
              type: "subscription",
              title: `⏰ Subscription Expires in ${daysLeft} Days`,
              message: `Your subscription expires in ${daysLeft} days. AutoPay is off — please renew manually to keep your profile active.`,
            });
            reminded++;
          }
        }
      }
      console.log(`[Scheduler] Subscription alerts: ${expired} expired, ${reminded} reminded`);
    } catch (e) {
      console.error("[Scheduler] Subscription alerts error:", e.message);
    }
  }, { timezone: "Asia/Kolkata" });

  // Daily at 10:00 AM IST — Commission reminders
  cron.schedule("0 10 * * *", async () => {
    console.log("[Scheduler] Running commission alerts...");
    try {
      const Commission = require("../models/Commission");
      const Creator = require("../models/Creator");
      const Notification = require("../models/Notification");
      const emailService = require("./emailService");
      const now = new Date();
      let sent = 0;

      const pending = await Commission.find({ status: { $in: ["pending", "overdue"] } })
        .populate({ path: "creator", populate: { path: "user", select: "name email" } });

      for (const comm of pending) {
        if (!comm.dueDate || !comm.creator?.user?.email) continue;
        const daysUntilDue = Math.ceil((new Date(comm.dueDate) - now) / 86400000);

        if (daysUntilDue < 0 && comm.status !== "overdue") {
          comm.status = "overdue";
          await comm.save();
          await Creator.updateOne({ _id: comm.creator._id }, { $set: { subscriptionStatus: "suspended" } });
          sent++;
        } else if ([7, 5, 3, 1].includes(daysUntilDue)) {
          await Notification.create({ user: comm.creator.user._id, type: "payment", title: `⏰ Commission due in ${daysUntilDue} days`, message: `₹${comm.commissionAmount} due on ${new Date(comm.dueDate).toLocaleDateString("en-IN")}` });
          sent++;
        }
      }
      console.log(`[Scheduler] Commission alerts: ${sent} sent`);
    } catch (e) {
      console.error("[Scheduler] Commission alerts error:", e.message);
    }
  }, { timezone: "Asia/Kolkata" });

  // Daily at 11:00 AM IST — Promotion expiry check
  cron.schedule("0 11 * * *", async () => {
    console.log("[Scheduler] Running promotion expiry check...");
    try {
      const PromotionRequest = require("../models/PromotionRequest");
      const Creator = require("../models/Creator");
      const emailService = require("./emailService");
      const now = new Date();

      const expired = await PromotionRequest.find({ status: "approved", expiryDate: { $lte: now } })
        .populate({ path: "creator", populate: { path: "user", select: "name email" } });

      for (const promo of expired) {
        promo.status = "expired";
        await promo.save();
        await Creator.updateOne({ _id: promo.creator?._id }, { $set: { featured: false } });
        if (promo.creator?.user?.email) {
          emailService.sendPromotionExpired({ email: promo.creator.user.email, name: promo.creator.user.name, planType: promo.planType, creatorId: promo.creator._id, userId: promo.creator.user._id }).catch(() => {});
        }
      }
      console.log(`[Scheduler] Promotions expired: ${expired.length}`);
    } catch (e) {
      console.error("[Scheduler] Promotion expiry error:", e.message);
    }
  }, { timezone: "Asia/Kolkata" });

  console.log("[Scheduler] ✅ All cron jobs registered (9AM/10AM/11AM IST daily)");
}

module.exports = { initScheduler };
