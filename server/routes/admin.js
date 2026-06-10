const express = require("express");
const User = require("../models/User");
const Creator = require("../models/Creator");
const Booking = require("../models/Booking");
const Contact = require("../models/Contact");
const Homepage = require("../models/Homepage");
const Notification = require("../models/Notification");
const CalendarEvent = require("../models/CalendarEvent");
const Commission = require("../models/Commission");
const PaymentProof = require("../models/PaymentProof");
const Inquiry = require("../models/Inquiry");
const { protect, authorize } = require("../middleware/auth");
const { createNotification } = require("../utils/notify");

const router = express.Router();
router.use(protect, authorize("admin"));

// Dashboard stats
router.get("/analytics", async (req, res, next) => {
  try {
    const [users, creators, bookings, contacts, pendingCreators] = await Promise.all([
      User.countDocuments({ role: "user" }),
      Creator.countDocuments({ status: "approved" }),
      Booking.countDocuments(),
      Contact.countDocuments({ status: "new" }),
      Creator.countDocuments({ status: "pending" }),
    ]);
    const earnings = await Booking.aggregate([
      { $match: { status: { $in: ["Creator Accepted", "Completed"] } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const monthly = await Booking.aggregate([
      {
        $group: {
          _id: { $month: "$createdAt" },
          count: { $sum: 1 },
          revenue: { $sum: "$amount" },
        },
      },
    ]);
    res.json({
      success: true,
      stats: {
        users,
        creators,
        bookings,
        contacts,
        pendingCreators,
        totalEarnings: earnings[0]?.total || 0,
        monthly,
      },
    });
  } catch (e) {
    next(e);
  }
});

// Creators management
router.get("/creators", async (req, res, next) => {
  try {
    const creators = await Creator.find()
      .populate("user", "name email phone avatar createdAt")
      .sort("-createdAt");
    res.json({ success: true, creators });
  } catch (e) {
    next(e);
  }
});

router.patch("/creators/:id/status", async (req, res, next) => {
  try {
    const creator = await Creator.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true }
    ).populate("user");
    if (creator?.user) {
      const note = req.body.note || `Your application has been ${req.body.status}`;
      await createNotification(
        creator.user._id,
        req.body.status === "approved" ? "✅ Creator Approved!" : "❌ Creator Application Update",
        note,
        "creator"
      );
    }
    res.json({ success: true, creator });
  } catch (e) {
    next(e);
  }
});

router.patch("/creators/:id/featured", async (req, res, next) => {
  try {
    const creator = await Creator.findByIdAndUpdate(
      req.params.id,
      { featured: req.body.featured },
      { new: true }
    );
    res.json({ success: true, creator });
  } catch (e) {
    next(e);
  }
});

router.delete("/creators/:id", async (req, res, next) => {
  try {
    const creator = await Creator.findById(req.params.id);
    if (creator) {
      await User.findByIdAndDelete(creator.user);
      await Creator.findByIdAndDelete(req.params.id);
    }
    res.json({ success: true, message: "Creator deleted" });
  } catch (e) {
    next(e);
  }
});

// Badge and Rank routes (also in creatorAccounts.js sub-router - duplicated here for hot-reload compatibility)
router.patch("/creator-accounts/:id/badge", async (req, res, next) => {
  try {
    const { badge } = req.body;
    const validBadges = ["", "rank_1", "rank_2", "rank_3", "rank_4", "best_creator", "most_trusted", "premium_creator", "top_rated", "editors_choice"];
    if (badge !== undefined && !validBadges.includes(badge)) {
      return res.status(400).json({ success: false, message: "Invalid badge value" });
    }
    const creator = await Creator.findById(req.params.id);
    if (!creator) return res.status(404).json({ success: false, message: "Creator not found" });
    creator.badge = badge || "";
    await creator.save();
    res.json({ success: true, data: creator });
  } catch (e) { next(e); }
});

router.patch("/creator-accounts/:id/rank", async (req, res, next) => {
  try {
    const { rank } = req.body;
    const creator = await Creator.findById(req.params.id);
    if (!creator) return res.status(404).json({ success: false, message: "Creator not found" });
    creator.rank = parseInt(rank, 10) || 0;
    await creator.save();
    res.json({ success: true, data: creator });
  } catch (e) { next(e); }
});

// Users
router.get("/users", async (req, res, next) => {
  try {
    const users = await User.find({ role: "user" }).select("-password").sort("-createdAt");
    res.json({ success: true, users });
  } catch (e) {
    next(e);
  }
});

router.delete("/users/:id", async (req, res, next) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (e) {
    next(e);
  }
});

// Creator availability (admin view)
router.get("/creators/:id/calendar", async (req, res, next) => {
  try {
    const events = await CalendarEvent.find({ creator: req.params.id }).sort("date");
    res.json({ success: true, events });
  } catch (e) {
    next(e);
  }
});

// Portfolios
router.get("/portfolios", async (req, res, next) => {
  try {
    const creators = await Creator.find().select("portfolio videos user").populate("user", "name");
    res.json({ success: true, creators });
  } catch (e) {
    next(e);
  }
});

// Homepage CMS
router.get("/homepage", async (req, res, next) => {
  try {
    let home = await Homepage.findOne();
    if (!home) home = await Homepage.create({});
    res.json({ success: true, homepage: home });
  } catch (e) {
    next(e);
  }
});

router.put("/homepage", async (req, res, next) => {
  try {
    let home = await Homepage.findOne();
    if (!home) home = await Homepage.create(req.body);
    else Object.assign(home, req.body);
    await home.save();
    res.json({ success: true, homepage: home });
  } catch (e) {
    next(e);
  }
});

// Contacts
router.get("/contacts", async (req, res, next) => {
  try {
    const contacts = await Contact.find().sort("-createdAt");
    res.json({ success: true, contacts });
  } catch (e) {
    next(e);
  }
});

router.patch("/contacts/:id", async (req, res, next) => {
  try {
    const contact = await Contact.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, contact });
  } catch (e) {
    next(e);
  }
});

// Admin notifications
router.get("/notifications", async (req, res, next) => {
  try {
    const notifications = await Notification.find({ user: req.user._id }).sort("-createdAt").limit(50);
    res.json({ success: true, notifications });
  } catch (e) {
    next(e);
  }
});

// Commissions management
router.get("/commissions", async (req, res, next) => {
  try {
    const commissions = await Commission.find()
      .populate({ path: "booking", select: "eventType eventDate clientName" })
      .populate({ path: "creator", populate: { path: "user", select: "name" } })
      .populate("user", "name email")
      .sort("-createdAt");
    const totalRevenue = commissions
      .filter((c) => c.status === "paid")
      .reduce((sum, c) => sum + c.commissionAmount, 0);
    res.json({ success: true, commissions, totalRevenue });
  } catch (e) {
    next(e);
  }
});

router.post("/commissions", async (req, res, next) => {
  try {
    const { bookingId, totalAmount, commissionPercent } = req.body;
    if (!bookingId || !totalAmount) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }
    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });

    // Use provided percent or load from database settings
    let percent = commissionPercent;
    if (!percent) {
      const configService = require("../services/configService");
      const commSettings = await configService.getCommissionSettings();
      const leadSource = booking.leadSource || "bookmyshot";
      percent = leadSource === "creator"
        ? (commSettings.creatorLeadCommissionPercent || 3)
        : (commSettings.bmsLeadCommissionPercent || 5);
    }
    const commissionAmount = (totalAmount * percent) / 100;
    const creatorEarning = totalAmount - commissionAmount;
    const commission = await Commission.create({
      booking: bookingId, creator: booking.creator, user: booking.user,
      totalAmount, commissionPercent: percent, commissionAmount, creatorEarning,
    });
    res.status(201).json({ success: true, commission });
  } catch (e) {
    next(e);
  }
});

router.patch("/commissions/:id", async (req, res, next) => {
  try {
    const commission = await Commission.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status, paidAt: req.body.status === "paid" ? new Date() : undefined },
      { new: true }
    );
    if (!commission) return res.status(404).json({ success: false, message: "Commission not found" });
    res.json({ success: true, commission });
  } catch (e) {
    next(e);
  }
});

// Payment proofs management
router.get("/payment-proofs", async (req, res, next) => {
  try {
    const proofs = await PaymentProof.find()
      .populate("user", "name email phone")
      .populate({ path: "booking", select: "eventType eventDate clientName" })
      .populate({ path: "creator", populate: { path: "user", select: "name" } })
      .sort("-createdAt");
    res.json({ success: true, proofs });
  } catch (e) {
    next(e);
  }
});

router.patch("/payment-proofs/:id/verify", async (req, res, next) => {
  try {
    const proof = await PaymentProof.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status, adminNote: req.body.adminNote || "" },
      { new: true }
    );
    if (!proof) return res.status(404).json({ success: false, message: "Payment proof not found" });
    await Notification.create({
      user: proof.user,
      title: "✅ Payment Proof " + (req.body.status === "verified" ? "Verified" : "Rejected"),
      message: `Your payment proof of ₹${proof.amount} has been ${req.body.status}`,
      type: "payment",
    });
    res.json({ success: true, proof });
  } catch (e) {
    next(e);
  }
});

// Inquiries management
router.get("/inquiries", async (req, res, next) => {
  try {
    const inquiries = await Inquiry.find()
      .populate("user", "name email phone")
      .populate({ path: "creator", populate: { path: "user", select: "name" } })
      .sort("-createdAt");
    res.json({ success: true, inquiries });
  } catch (e) {
    next(e);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// ENHANCED SUPER ADMIN ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════════

const AuditLog = require("../models/AuditLog");
const PaymentRecord = require("../models/PaymentRecord");
const Invoice = require("../models/Invoice");

// Helper: log admin action
async function logAction(adminId, action, target, targetId, details, ip) {
  try {
    await AuditLog.create({ admin: adminId, action, target: target || "", targetId: targetId || "", details: details || "", ip: ip || "" });
  } catch (e) { /* non-critical */ }
}

// ─── SUBSCRIPTION MANAGEMENT ────────────────────────────────────────────────

router.get("/subscriptions", async (req, res, next) => {
  try {
    const creators = await Creator.find()
      .populate("user", "name email phone avatar")
      .sort("-createdAt");
    const active = creators.filter(c => c.subscriptionStatus === "active");
    const expired = creators.filter(c => c.subscriptionStatus === "expired" || c.subscriptionStatus === "overdue");
    const trial = creators.filter(c => c.subscriptionStatus === "trial");
    res.json({ success: true, creators, stats: { active: active.length, expired: expired.length, trial: trial.length, total: creators.length } });
  } catch (e) { next(e); }
});

router.patch("/subscriptions/:creatorId", async (req, res, next) => {
  try {
    const creator = await Creator.findById(req.params.creatorId);
    if (!creator) return res.status(404).json({ success: false, message: "Creator not found" });
    const { subscriptionStatus, subscriptionEndDate, autoRenew } = req.body;
    if (subscriptionStatus) creator.subscriptionStatus = subscriptionStatus;
    if (subscriptionEndDate) creator.subscriptionEndDate = new Date(subscriptionEndDate);
    if (autoRenew !== undefined) creator.autoRenew = autoRenew;
    if (subscriptionStatus === "active" && !creator.subscriptionStartDate) creator.subscriptionStartDate = new Date();
    if (subscriptionStatus === "active") creator.lastPaymentDate = new Date();
    await creator.save();
    await logAction(req.user._id, "subscription_update", "creator", creator._id.toString(), `Status: ${subscriptionStatus}`, req.ip);
    res.json({ success: true, creator });
  } catch (e) { next(e); }
});

// ─── BOOKING MANAGEMENT ─────────────────────────────────────────────────────

router.get("/bookings", async (req, res, next) => {
  try {
    const bookings = await Booking.find()
      .populate("user", "name email phone")
      .populate({ path: "creator", populate: { path: "user", select: "name email" } })
      .sort("-createdAt");
    res.json({ success: true, bookings });
  } catch (e) { next(e); }
});

router.patch("/bookings/:id", async (req, res, next) => {
  try {
    const booking = await Booking.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true });
    if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });
    await logAction(req.user._id, "booking_update", "booking", booking._id.toString(), JSON.stringify(req.body).slice(0, 200), req.ip);
    res.json({ success: true, booking });
  } catch (e) { next(e); }
});

router.delete("/bookings/:id", async (req, res, next) => {
  try {
    await Booking.findByIdAndDelete(req.params.id);
    await logAction(req.user._id, "booking_delete", "booking", req.params.id, "", req.ip);
    res.json({ success: true, message: "Booking deleted" });
  } catch (e) { next(e); }
});

// ─── INQUIRY MANAGEMENT ─────────────────────────────────────────────────────

router.patch("/inquiries/:id", async (req, res, next) => {
  try {
    const inquiry = await Inquiry.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true });
    if (!inquiry) return res.status(404).json({ success: false, message: "Inquiry not found" });
    await logAction(req.user._id, "inquiry_update", "inquiry", inquiry._id.toString(), JSON.stringify(req.body).slice(0, 200), req.ip);
    res.json({ success: true, inquiry });
  } catch (e) { next(e); }
});

router.delete("/inquiries/:id", async (req, res, next) => {
  try {
    await Inquiry.findByIdAndDelete(req.params.id);
    await logAction(req.user._id, "inquiry_delete", "inquiry", req.params.id, "", req.ip);
    res.json({ success: true, message: "Inquiry deleted" });
  } catch (e) { next(e); }
});

// ─── PAYMENT MANAGEMENT ─────────────────────────────────────────────────────

router.get("/payment-records", async (req, res, next) => {
  try {
    const records = await PaymentRecord.find()
      .populate({ path: "booking", select: "clientName eventType amount" })
      .populate({ path: "creator", populate: { path: "user", select: "name" } })
      .sort("-createdAt");
    res.json({ success: true, records });
  } catch (e) { next(e); }
});

router.post("/payment-records", async (req, res, next) => {
  try {
    const { bookingId, amount, paymentType, notes } = req.body;
    if (!bookingId || !amount) return res.status(400).json({ success: false, message: "bookingId and amount required" });
    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });
    const record = await PaymentRecord.create({
      booking: bookingId, user: booking.user, creator: booking.creator,
      amount, paymentType: paymentType || "other", notes: notes || "Admin manual payment",
      addedBy: "creator", status: "approved",
    });
    await logAction(req.user._id, "payment_add", "booking", bookingId, `₹${amount}`, req.ip);
    res.status(201).json({ success: true, record });
  } catch (e) { next(e); }
});

// ─── NOTIFICATION CENTER ────────────────────────────────────────────────────

router.post("/notifications/send", async (req, res, next) => {
  try {
    const { title, message, type, creatorIds } = req.body;
    if (!title || !message) return res.status(400).json({ success: false, message: "Title and message required" });

    let targets = [];
    if (creatorIds && creatorIds.length > 0) {
      const creators = await Creator.find({ _id: { $in: creatorIds } });
      targets = creators.map(c => c.user);
    } else {
      // Broadcast to all creators
      const creators = await Creator.find({ status: "approved" });
      targets = creators.map(c => c.user);
    }

    const notifications = targets.map(userId => ({
      user: userId, title, message, type: type || "system",
    }));
    await Notification.insertMany(notifications);
    await logAction(req.user._id, "notification_send", "system", "", `To ${targets.length} creators: ${title}`, req.ip);
    res.json({ success: true, sent: targets.length });
  } catch (e) { next(e); }
});

// ─── CREATOR PROFILE EDIT (ADMIN) ───────────────────────────────────────────

router.patch("/creators/:id/profile", async (req, res, next) => {
  try {
    const creator = await Creator.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true, runValidators: true });
    if (!creator) return res.status(404).json({ success: false, message: "Creator not found" });
    await logAction(req.user._id, "creator_profile_edit", "creator", creator._id.toString(), Object.keys(req.body).join(", "), req.ip);
    res.json({ success: true, creator });
  } catch (e) { next(e); }
});

// ─── CALENDAR MANAGEMENT ────────────────────────────────────────────────────

router.get("/calendar/all", async (req, res, next) => {
  try {
    const events = await CalendarEvent.find()
      .populate({ path: "creator", populate: { path: "user", select: "name" } })
      .sort("-date")
      .limit(200);
    res.json({ success: true, events });
  } catch (e) { next(e); }
});

router.post("/calendar", async (req, res, next) => {
  try {
    const event = await CalendarEvent.create(req.body);
    await logAction(req.user._id, "calendar_create", "calendar", event._id.toString(), event.title, req.ip);
    res.status(201).json({ success: true, event });
  } catch (e) { next(e); }
});

router.patch("/calendar/:id", async (req, res, next) => {
  try {
    const event = await CalendarEvent.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true });
    if (!event) return res.status(404).json({ success: false, message: "Event not found" });
    await logAction(req.user._id, "calendar_update", "calendar", event._id.toString(), event.title, req.ip);
    res.json({ success: true, event });
  } catch (e) { next(e); }
});

router.delete("/calendar/:id", async (req, res, next) => {
  try {
    await CalendarEvent.findByIdAndDelete(req.params.id);
    await logAction(req.user._id, "calendar_delete", "calendar", req.params.id, "", req.ip);
    res.json({ success: true, message: "Event deleted" });
  } catch (e) { next(e); }
});

// ─── SUBSCRIPTION ALERTS ────────────────────────────────────────────────────

// POST: Trigger subscription expiry reminders (admin or cron job)
router.post("/subscription-alerts", async (req, res, next) => {
  try {
    const emailService = require("../services/emailService");
    const now = new Date();
    const creators = await Creator.find({ subscriptionStatus: { $in: ["active", "trial"] } }).populate("user", "name email");
    let sent = 0;

    for (const c of creators) {
      if (!c.subscriptionEndDate || !c.user) continue;
      const daysLeft = Math.ceil((c.subscriptionEndDate - now) / 86400000);

      if (daysLeft <= 0) {
        // Expired
        c.subscriptionStatus = "expired";
        await c.save();
        await Notification.create({
          user: c.user._id, type: "subscription",
          title: "⚠️ Subscription Expired",
          message: "Your BookMyShot subscription has expired. Please renew to continue using all features.",
        });

        // ══ EMAIL: Creator — Subscription Expired ══
        if (c.user.email) {
          emailService.sendSubscriptionExpired({
            email: c.user.email,
            name: c.user.name,
            creatorId: c._id,
            userId: c.user._id,
          }).catch(e => console.error("[Email] alert expired:", e.message));
        }

        // ══ EMAIL: Admin — Subscription Expired ══
        emailService.sendAdminSubscriptionExpired({
          creatorName: c.user.name || "Unknown",
          creatorEmail: c.user.email || "",
        }).catch(e => console.error("[Email] admin alert expired:", e.message));

        sent++;
      } else if (daysLeft <= 7) {
        // Send reminder at 7, 3, and 1 day(s) before expiry
        const reminderDays = [7, 3, 1];
        if (reminderDays.includes(daysLeft)) {
          // Check if we already sent a reminder today
          const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          const existing = await Notification.findOne({
            user: c.user._id, type: "subscription",
            createdAt: { $gte: today },
          });
          if (!existing) {
            await Notification.create({
              user: c.user._id, type: "subscription",
              title: `⏰ Subscription Expires in ${daysLeft} Day${daysLeft > 1 ? 's' : ''}`,
              message: `Your BookMyShot subscription expires in ${daysLeft} day${daysLeft > 1 ? 's' : ''}. Renew now to avoid interruption.`,
            });

            // ══ EMAIL: Creator — Expiry Reminder ══
            if (c.user.email) {
              emailService.sendSubscriptionExpiryReminder({
                email: c.user.email,
                name: c.user.name,
                daysLeft,
                endDate: c.subscriptionEndDate,
                creatorId: c._id,
                userId: c.user._id,
              }).catch(e => console.error("[Email] alert reminder:", e.message));
            }

            sent++;
          }
        }
      }
    }

    await logAction(req.user._id, "subscription_alerts", "system", "", `Sent ${sent} alerts (with emails)`, req.ip);
    res.json({ success: true, sent });
  } catch (e) { next(e); }
});

// POST: Send broadcast to all users or creators
router.post("/broadcast", async (req, res, next) => {
  try {
    const { title, message, audience, userIds } = req.body;
    if (!title || !message) return res.status(400).json({ success: false, message: "Title and message required" });

    const User = require("../models/User");
    let targets = [];

    if (userIds && userIds.length > 0) {
      targets = userIds;
    } else if (audience === "creators") {
      const creators = await Creator.find({ status: "approved" });
      targets = creators.map(c => c.user);
    } else if (audience === "users") {
      const users = await User.find({ role: "user" }).select("_id");
      targets = users.map(u => u._id);
    } else {
      // All users + creators
      const users = await User.find({}).select("_id");
      targets = users.map(u => u._id);
    }

    const notifications = targets.map(userId => ({
      user: userId, title, message, type: "announcement",
    }));

    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
    }

    await logAction(req.user._id, "broadcast", "system", "", `"${title}" to ${targets.length} ${audience || 'all'}`, req.ip);
    res.json({ success: true, sent: targets.length });
  } catch (e) { next(e); }
});

// GET: All notifications (admin view)
router.get("/all-notifications", async (req, res, next) => {
  try {
    const notifications = await Notification.find({})
      .populate("user", "name email role")
      .sort("-createdAt")
      .limit(100);
    res.json({ success: true, notifications });
  } catch (e) { next(e); }
});

// DELETE: Admin delete notification
router.delete("/notifications/:id", async (req, res, next) => {
  try {
    await Notification.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (e) { next(e); }
});

// ─── AUDIT LOGS ─────────────────────────────────────────────────────────────

router.get("/audit-logs", async (req, res, next) => {
  try {
    const logs = await AuditLog.find()
      .populate("admin", "name email")
      .sort("-createdAt")
      .limit(100);
    res.json({ success: true, logs });
  } catch (e) { next(e); }
});

// ─── REVENUE OVERVIEW ───────────────────────────────────────────────────────

router.get("/revenue", async (req, res, next) => {
  try {
    const creators = await Creator.find();
    const bookings = await Booking.find({ status: { $ne: "rejected" } });
    const commissions = await Commission.find();
    const invoices = await Invoice.find();

    const activeSubscriptions = creators.filter(c => c.subscriptionStatus === "active").length;
    const expiredSubscriptions = creators.filter(c => c.subscriptionStatus === "expired" || c.subscriptionStatus === "overdue").length;
    const totalBookingRevenue = bookings.reduce((s, b) => s + (b.amount || 0), 0);
    const bmsCommission = commissions.filter(c => c.leadSource === "bookmyshot").reduce((s, c) => s + c.commissionAmount, 0);
    const creatorCommission = commissions.filter(c => c.leadSource === "creator").reduce((s, c) => s + c.commissionAmount, 0);
    const pendingCommission = commissions.filter(c => c.status === "pending").reduce((s, c) => s + c.commissionAmount, 0);
    const paidCommission = commissions.filter(c => c.status === "paid").reduce((s, c) => s + c.commissionAmount, 0);
    // Load subscription price from database
    const configService = require("../services/configService");
    const subSettings = await configService.getSubscriptionSettings();
    const subscriptionRevenue = activeSubscriptions * (subSettings.monthlyPlanPrice || 299);

    // Monthly breakdown
    const monthlyRevenue = {};
    bookings.forEach(b => {
      if (b.createdAt && b.amount) {
        var key = b.createdAt.toISOString().slice(0, 7);
        monthlyRevenue[key] = (monthlyRevenue[key] || 0) + b.amount;
      }
    });

    res.json({
      success: true,
      stats: {
        totalCreators: creators.length,
        activeSubscriptions,
        expiredSubscriptions,
        totalBookings: bookings.length,
        totalBookingRevenue,
        subscriptionRevenue,
        bmsCommission,
        creatorCommission,
        pendingCommission,
        paidCommission,
        totalPlatformRevenue: subscriptionRevenue + bmsCommission + creatorCommission,
      },
      monthlyRevenue,
    });
  } catch (e) { next(e); }
});

module.exports = router;
