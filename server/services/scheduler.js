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

  // ═══════════════════════════════════════════════════════════════
  // BOOKING REMINDERS — Daily at 8:00 AM IST
  // Sends push notifications to creators for upcoming confirmed bookings
  // Reminders: 7 days, 5 days, 3 days, 1 day before event
  // ═══════════════════════════════════════════════════════════════
  cron.schedule("0 8 * * *", async () => {
    console.log("[Scheduler] Running booking reminders...");
    try {
      const Booking = require("../models/Booking");
      const Creator = require("../models/Creator");
      const Notification = require("../models/Notification");
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      let sent = 0;

      // Find all active bookings with future event dates
      const activeBookings = await Booking.find({
        status: { $in: ["Creator Accepted", "Payment Submitted", "Payment Approved", "Event Scheduled"] },
        eventDate: { $gte: now },
      }).populate({ path: "creator", populate: { path: "user", select: "_id name" } });

      for (const booking of activeBookings) {
        if (!booking.eventDate || !booking.creator?.user?._id) continue;

        const eventDate = new Date(booking.eventDate);
        eventDate.setHours(0, 0, 0, 0);
        const daysUntil = Math.round((eventDate - now) / 86400000);
        const userId = booking.creator.user._id;

        // Only send on specific days: 7, 5, 3, 1
        if (![7, 5, 3, 1].includes(daysUntil)) continue;

        // Prevent duplicate: check if reminder already sent today for this booking
        const todayStart = new Date(now);
        const existing = await Notification.findOne({
          user: userId,
          type: "booking",
          targetId: booking._id.toString(),
          createdAt: { $gte: todayStart },
        });
        if (existing) continue;

        // Build reminder message based on days remaining
        let title, message;
        if (daysUntil === 7 || daysUntil === 5) {
          title = `📸 BookMyShot Reminder — ${daysUntil} Days`;
          message = `Your upcoming booking "${booking.clientName} - ${booking.eventType}" is scheduled in ${daysUntil} days (${eventDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}). Please review the booking details, contact your client if needed, and prepare your equipment.`;
        } else if (daysUntil === 3) {
          title = "📸 BookMyShot — 3 Days Left";
          message = `Only 3 days left for your booking "${booking.clientName} - ${booking.eventType}" on ${eventDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}. Make sure everything is ready and your availability is confirmed.`;
        } else if (daysUntil === 1) {
          title = "📸 BookMyShot — Tomorrow!";
          message = `Tomorrow is your booking "${booking.clientName} - ${booking.eventType}". Please reach the venue on time and deliver an amazing experience. Best of luck from Team BookMyShot! 🎉`;
        }

        if (title && message) {
          await Notification.create({
            user: userId,
            type: "booking",
            title,
            message,
            targetScreen: "BookingDetail",
            targetId: booking._id.toString(),
          });
          sent++;
        }
      }
      console.log(`[Scheduler] Booking reminders sent: ${sent}`);
    } catch (e) {
      console.error("[Scheduler] Booking reminders error:", e.message);
    }
  }, { timezone: "Asia/Kolkata" });

  console.log("[Scheduler] ✅ All cron jobs registered (8AM/9AM/10AM/11AM IST daily)");

  // ═══════════════════════════════════════════════════════════════
  // DATA RETENTION POLICY — Daily cleanup at 3:00 AM IST
  // ═══════════════════════════════════════════════════════════════
  cron.schedule("0 3 * * *", async () => {
    console.log("[Scheduler] Running data retention cleanup...");
    try {
      const User = require("../models/User");
      const Creator = require("../models/Creator");
      const Notification = require("../models/Notification");
      const AuditLog = require("../models/AuditLog");
      const Booking = require("../models/Booking");
      const now = new Date();
      let cleaned = {};

      // 1. Purge soft-deleted NORMAL USER accounts after 30 days (NOT creators)
      const softDeleteCutoff = new Date(now - 30 * 86400000);
      const softDeleted = await User.find({ accountDeleteRequested: true, accountDeletedAt: { $lte: softDeleteCutoff }, role: "user" });
      for (const u of softDeleted) {
        await User.findByIdAndDelete(u._id);
      }
      cleaned.softDeletedUsers = softDeleted.length;

      // 2. Auto-archive rejected creator applications after 30 days (soft-delete, NOT permanent)
      const rejectCutoff = new Date(now - 30 * 86400000);
      const rejectedCreators = await Creator.find({ status: "rejected", updatedAt: { $lte: rejectCutoff } });
      for (const rc of rejectedCreators) {
        // Only mark as deleted — do NOT remove from DB (business records)
        rc.status = "deleted";
        rc.deletedAt = now;
        rc.deleteReason = "Auto-archived: rejected application expired after 30 days";
        await rc.save();
      }
      cleaned.rejectedApps = rejectedCreators.length;

      // 3. Clear expired OTPs and verification tokens older than 7 days
      const otpCutoff = new Date(now - 7 * 86400000);
      const otpResult = await User.updateMany(
        { $or: [
          { emailVerificationOtpExpiry: { $lte: otpCutoff } },
          { resetPasswordOtpExpiry: { $lte: otpCutoff } },
        ]},
        { $unset: { emailVerificationOtp: "", emailVerificationOtpExpiry: "", resetPasswordOtp: "", resetPasswordOtpExpiry: "", resetPasswordToken: "", resetPasswordExpire: "" } }
      );
      cleaned.expiredOTPs = otpResult.modifiedCount || 0;

      // 4. Delete old notifications (>90 days)
      const notifCutoff = new Date(now - 90 * 86400000);
      const notifResult = await Notification.deleteMany({ createdAt: { $lte: notifCutoff } });
      cleaned.oldNotifications = notifResult.deletedCount || 0;

      // 5. Delete audit logs older than 6 months
      try {
        const auditCutoff = new Date(now - 180 * 86400000);
        const auditResult = await AuditLog.deleteMany({ createdAt: { $lte: auditCutoff } });
        cleaned.oldAuditLogs = auditResult.deletedCount || 0;
      } catch { cleaned.oldAuditLogs = 0; }

      // 6. Delete cancelled bookings older than 6 months
      const cancelCutoff = new Date(now - 180 * 86400000);
      const cancelResult = await Booking.deleteMany({ status: { $in: ["Cancelled", "cancelled", "Rejected"] }, createdAt: { $lte: cancelCutoff } });
      cleaned.cancelledBookings = cancelResult.deletedCount || 0;

      // 7. Delete completed bookings older than 12 months
      const completeCutoff = new Date(now - 365 * 86400000);
      const completeResult = await Booking.deleteMany({ status: "Completed", createdAt: { $lte: completeCutoff } });
      cleaned.oldCompletedBookings = completeResult.deletedCount || 0;

      console.log("[Scheduler] Data retention cleanup complete:", JSON.stringify(cleaned));
    } catch (e) {
      console.error("[Scheduler] Data retention error:", e.message);
    }
  }, { timezone: "Asia/Kolkata" });

  console.log("[Scheduler] ✅ Data retention job registered (3AM IST daily)");

  // ═══════════════════════════════════════════════════════════════
  // AUTOMATED BACKUPS — Daily at 2:00 AM IST, Weekly on Sundays
  // ═══════════════════════════════════════════════════════════════
  cron.schedule("0 2 * * *", async () => {
    console.log("[Scheduler] Running automated backup...");
    try {
      const { createBackup, cleanupOldBackups } = require("./backupService");
      const isWeekly = new Date().getDay() === 0; // Sunday
      const type = isWeekly ? "weekly" : "daily";
      await createBackup(type);
      await cleanupOldBackups();
      console.log(`[Scheduler] ${type} backup completed`);
    } catch (e) {
      console.error("[Scheduler] Backup error:", e.message);
    }
  }, { timezone: "Asia/Kolkata" });

  console.log("[Scheduler] ✅ Automated backup job registered (2AM IST daily, weekly on Sundays)");

  // ═══════════════════════════════════════════════════════════════
  // MONTHLY CREATOR STATEMENTS — 1st of every month at 10:00 AM IST
  // Sends email reports to creators with 2+ bookings in the past month
  // ═══════════════════════════════════════════════════════════════
  cron.schedule("0 10 1 * *", async () => {
    console.log("[Scheduler] Running monthly creator statements...");
    try {
      const { sendMonthlyStatements } = require("./creatorStatements");
      const result = await sendMonthlyStatements();
      console.log(`[Scheduler] Monthly statements: ${result.sent} sent, ${result.failed || 0} failed`);
    } catch (e) {
      console.error("[Scheduler] Monthly statements error:", e.message);
    }
  }, { timezone: "Asia/Kolkata" });

  console.log("[Scheduler] ✅ Monthly creator statements registered (1st of month, 10AM IST)");
}

module.exports = { initScheduler };
