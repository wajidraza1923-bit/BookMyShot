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
    if (!creator) return res.status(404).json({ success: false, message: "Creator not found" });

    const creatorId = creator._id;
    const userId = creator.user;

    // Delete all associated data
    const mongoose = require("mongoose");
    const models = {
      Booking: mongoose.models.Booking,
      Inquiry: mongoose.models.Inquiry,
      Review: mongoose.models.Review,
      Commission: mongoose.models.Commission,
      PaymentProof: mongoose.models.PaymentProof,
      PaymentRecord: mongoose.models.PaymentRecord,
      BookingEvent: mongoose.models.BookingEvent,
      CalendarEvent: mongoose.models.CalendarEvent,
      Availability: mongoose.models.Availability,
      Planning: mongoose.models.Planning,
      SearchBoost: mongoose.models.SearchBoost,
      WeddingPackage: mongoose.models.WeddingPackage,
      Invoice: mongoose.models.Invoice,
      PromotionRequest: mongoose.models.PromotionRequest,
    };

    // Delete related records (ignore errors for models that may not exist)
    for (const [name, Model] of Object.entries(models)) {
      if (Model) {
        try { await Model.deleteMany({ creator: creatorId }); } catch {}
      }
    }

    // Remove creator from favorites in User documents
    try { await User.updateMany({ favorites: creatorId }, { $pull: { favorites: creatorId } }); } catch {}

    // Delete cloud storage files (portfolio images, videos, avatar)
    try {
      const { deleteFile, isConfigured } = require("../services/cloudinaryService");
      if (isConfigured()) {
        // Delete portfolio images from Cloudinary
        if (creator.portfolio && creator.portfolio.length > 0) {
          for (const item of creator.portfolio) {
            const pid = typeof item === 'string' ? '' : (item?.publicId || '');
            if (pid) try { await deleteFile(pid, 'image'); } catch {}
          }
        }
        // Delete videos from Cloudinary
        if (creator.videos && creator.videos.length > 0) {
          for (const item of creator.videos) {
            const pid = typeof item === 'string' ? '' : (item?.publicId || '');
            if (pid) try { await deleteFile(pid, 'video'); } catch {}
          }
        }
        // Delete avatar from Cloudinary
        const user = await User.findById(userId).select('avatarPublicId');
        if (user?.avatarPublicId) try { await deleteFile(user.avatarPublicId, 'image'); } catch {}
      }
    } catch {}

    // Delete notifications for this user
    if (mongoose.models.Notification) {
      try { await mongoose.models.Notification.deleteMany({ $or: [{ user: userId }, { fromUser: userId }] }); } catch {}
    }

    // Delete messages
    if (mongoose.models.Message) {
      try { await mongoose.models.Message.deleteMany({ $or: [{ sender: userId }, { recipient: userId }] }); } catch {}
    }

    // Delete the Creator document
    await Creator.findByIdAndDelete(creatorId);

    // Delete the User document
    if (userId) await User.findByIdAndDelete(userId);

    res.json({ success: true, message: "Creator and all associated data permanently deleted" });
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
    const userId = req.params.id;
    // Clean up related data for this user
    const mongoose = require("mongoose");
    if (mongoose.models.Notification) {
      try { await mongoose.models.Notification.deleteMany({ user: userId }); } catch {}
    }
    if (mongoose.models.Message) {
      try { await mongoose.models.Message.deleteMany({ $or: [{ sender: userId }, { recipient: userId }] }); } catch {}
    }
    // Remove from any creator's favorites
    try { await User.updateMany({}, { $pull: { favorites: userId } }); } catch {}
    // Delete the user
    await User.findByIdAndDelete(userId);
    res.json({ success: true, message: "User and associated data deleted" });
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

// POST: Trigger promotion/featured expiry reminders (admin or cron job)
router.post("/promotion-alerts", async (req, res, next) => {
  try {
    const emailService = require("../services/emailService");
    const PromotionRequest = require("../models/PromotionRequest");
    const now = new Date();
    let sent = 0;

    const activePromos = await PromotionRequest.find({ status: "approved" })
      .populate({ path: "creator", populate: { path: "user", select: "name email" } });

    for (const promo of activePromos) {
      if (!promo.expiryDate || !promo.creator?.user?.email) continue;
      const daysLeft = Math.ceil((new Date(promo.expiryDate) - now) / 86400000);

      if (daysLeft <= 0) {
        // Expired — expire it and send notification
        promo.status = "expired";
        await promo.save();
        await Creator.updateOne({ _id: promo.creator._id }, { $set: { featured: false } });

        await emailService.sendPromotionExpired({
          email: promo.creator.user.email,
          name: promo.creator.user.name,
          planType: promo.planType,
          creatorId: promo.creator._id,
          userId: promo.creator.user._id,
        }).catch(() => {});

        await Notification.create({
          user: promo.creator.user._id,
          type: "promotion",
          title: "📋 Promotion Expired",
          message: `Your ${promo.planType} promotion has expired. Renew to maintain visibility.`,
        });
        sent++;

      } else if ([7, 3, 1].includes(daysLeft)) {
        // Reminder — check if we already sent today
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const existing = await Notification.findOne({
          user: promo.creator.user._id,
          type: "promotion",
          title: { $regex: "expires in " + daysLeft },
          createdAt: { $gte: today },
        });

        if (!existing) {
          await emailService.sendEmail({
            to: promo.creator.user.email,
            subject: `⏰ Your ${promo.planType} expires in ${daysLeft} day${daysLeft > 1 ? 's' : ''} — BookMyShot`,
            html: `<div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:2rem;background:#111;color:#f6eee7;border-radius:12px">
              <h2 style="color:${daysLeft <= 1 ? '#ef4444' : '#DAAF37'};margin:0 0 1rem">⏰ Promotion Expiring Soon</h2>
              <p style="color:#b9aa98">Hi ${promo.creator.user.name},</p>
              <p style="color:#d4c8bc">Your <strong style="color:#DAAF37">${promo.planType}</strong> promotion expires in <strong>${daysLeft} day${daysLeft > 1 ? 's' : ''}</strong>.</p>
              <table style="width:100%;margin:1rem 0;font-size:0.85rem;border-collapse:collapse">
                <tr><td style="padding:0.4rem 0;color:#8a7e72">Promotion</td><td style="color:#f6eee7;text-align:right">${promo.planType}</td></tr>
                <tr><td style="padding:0.4rem 0;color:#8a7e72">Expires</td><td style="color:#ef4444;text-align:right;font-weight:600">${new Date(promo.expiryDate).toLocaleDateString("en-IN")}</td></tr>
                <tr><td style="padding:0.4rem 0;color:#8a7e72">Days Left</td><td style="color:${daysLeft <= 1 ? '#ef4444' : '#f59e0b'};text-align:right;font-weight:600">${daysLeft}</td></tr>
              </table>
              <p style="color:#8a7e72;font-size:0.8rem">Renew from your Creator Dashboard to maintain visibility.</p>
            </div>`,
            type: "other",
            userId: promo.creator.user._id,
            creatorId: promo.creator._id,
            meta: { action: "promotion_expiry_reminder", daysLeft, planType: promo.planType },
          }).catch(() => {});

          await Notification.create({
            user: promo.creator.user._id,
            type: "promotion",
            title: `⏰ Promotion expires in ${daysLeft} day${daysLeft > 1 ? 's' : ''}`,
            message: `Your ${promo.planType} promotion expires on ${new Date(promo.expiryDate).toLocaleDateString("en-IN")}. Renew to stay visible.`,
          });
          sent++;
        }
      }
    }

    await logAction(req.user._id, "promotion_alerts", "system", "", `Sent ${sent} promotion alerts`, req.ip);
    res.json({ success: true, sent });
  } catch (e) { next(e); }
});

// POST: Trigger commission reminders and auto-suspend overdue creators
router.post("/commission-alerts", async (req, res, next) => {
  try {
    const emailService = require("../services/emailService");
    const Commission = require("../models/Commission");
    const now = new Date();
    let sent = 0;
    let suspended = 0;

    const pendingCommissions = await Commission.find({ status: { $in: ["pending", "overdue"] } })
      .populate({ path: "creator", populate: { path: "user", select: "name email" } })
      .populate("booking", "clientName eventType");

    for (const comm of pendingCommissions) {
      if (!comm.dueDate || !comm.creator?.user?.email) continue;
      const daysUntilDue = Math.ceil((new Date(comm.dueDate) - now) / 86400000);

      // Auto-suspend if overdue (past due date)
      if (daysUntilDue < 0) {
        // Mark as overdue
        if (comm.status !== "overdue") {
          comm.status = "overdue";
          await comm.save();
        }

        // Suspend creator if overdue more than 0 days (immediate after due date)
        const creator = comm.creator;
        if (creator.subscriptionStatus !== "suspended") {
          await Creator.updateOne({ _id: creator._id }, { $set: { subscriptionStatus: "suspended" } });

          await emailService.sendEmail({
            to: creator.user.email,
            subject: "🚫 Account Suspended — Unpaid Commission",
            html: `<div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:2rem;background:#111;color:#f6eee7;border-radius:12px">
              <h2 style="color:#ef4444;margin:0 0 1rem">🚫 Account Suspended</h2>
              <p style="color:#b9aa98">Hello ${creator.user.name},</p>
              <p style="color:#d4c8bc">Your account has been temporarily suspended because the commission payment was not completed within the required period.</p>
              <table style="width:100%;margin:1rem 0;font-size:0.85rem;border-collapse:collapse">
                <tr><td style="padding:0.4rem 0;color:#8a7e72">Outstanding Amount</td><td style="color:#ef4444;text-align:right;font-weight:700">₹${comm.commissionAmount}</td></tr>
                <tr><td style="padding:0.4rem 0;color:#8a7e72">Booking</td><td style="color:#f6eee7;text-align:right">${comm.booking?.clientName || '—'} (${comm.booking?.eventType || '—'})</td></tr>
                <tr><td style="padding:0.4rem 0;color:#8a7e72">Due Date</td><td style="color:#ef4444;text-align:right">${new Date(comm.dueDate).toLocaleDateString("en-IN")}</td></tr>
                <tr><td style="padding:0.4rem 0;color:#8a7e72">Suspended On</td><td style="color:#f6eee7;text-align:right">${now.toLocaleDateString("en-IN")}</td></tr>
              </table>
              <p style="color:#d4c8bc;font-size:0.85rem">Please complete payment to reactivate your account. All your data (listings, leads, bookings) is safe.</p>
            </div>`,
            type: "other",
            userId: creator.user._id,
            creatorId: creator._id,
            meta: { action: "commission_suspension", amount: comm.commissionAmount },
          }).catch(() => {});

          await Notification.create({ user: creator.user._id, type: "payment", title: "🚫 Account Suspended", message: `Unpaid commission of ₹${comm.commissionAmount}. Pay to reactivate.` });
          suspended++;
        }
        continue;
      }

      // Send reminders at 7, 5, 3, 1 days before due
      if ([7, 5, 3, 1].includes(daysUntilDue)) {
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const alreadySent = await Notification.findOne({
          user: comm.creator.user._id,
          type: "payment",
          title: { $regex: "Commission due in " + daysUntilDue },
          createdAt: { $gte: today },
        });

        if (!alreadySent) {
          await emailService.sendEmail({
            to: comm.creator.user.email,
            subject: `⏰ Commission due in ${daysUntilDue} day${daysUntilDue > 1 ? 's' : ''} — ₹${comm.commissionAmount}`,
            html: `<div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:2rem;background:#111;color:#f6eee7;border-radius:12px">
              <h2 style="color:${daysUntilDue <= 1 ? '#ef4444' : '#f59e0b'};margin:0 0 1rem">⏰ Commission Payment Due</h2>
              <p style="color:#b9aa98">Hi ${comm.creator.user.name},</p>
              <p style="color:#d4c8bc">Your commission payment of <strong style="color:#DAAF37">₹${comm.commissionAmount}</strong> is due in <strong>${daysUntilDue} day${daysUntilDue > 1 ? 's' : ''}</strong>.</p>
              <table style="width:100%;margin:1rem 0;font-size:0.85rem;border-collapse:collapse">
                <tr><td style="padding:0.4rem 0;color:#8a7e72">Amount</td><td style="color:#DAAF37;text-align:right;font-weight:600">₹${comm.commissionAmount}</td></tr>
                <tr><td style="padding:0.4rem 0;color:#8a7e72">Booking</td><td style="color:#f6eee7;text-align:right">${comm.booking?.clientName || '—'}</td></tr>
                <tr><td style="padding:0.4rem 0;color:#8a7e72">Due Date</td><td style="color:#ef4444;text-align:right">${new Date(comm.dueDate).toLocaleDateString("en-IN")}</td></tr>
              </table>
              <p style="color:#8a7e72;font-size:0.8rem">Failure to pay before the due date will result in account suspension.</p>
            </div>`,
            type: "other",
            userId: comm.creator.user._id,
            creatorId: comm.creator._id,
            meta: { action: "commission_reminder", daysUntilDue, amount: comm.commissionAmount },
          }).catch(() => {});

          await Notification.create({ user: comm.creator.user._id, type: "payment", title: `⏰ Commission due in ${daysUntilDue} day${daysUntilDue > 1 ? 's' : ''}`, message: `₹${comm.commissionAmount} commission payment due on ${new Date(comm.dueDate).toLocaleDateString("en-IN")}.` });
          comm.lastReminderSent = now;
          comm.reminderCount = (comm.reminderCount || 0) + 1;
          await comm.save();
          sent++;
        }
      }
    }

    await logAction(req.user._id, "commission_alerts", "system", "", `Sent ${sent} reminders, suspended ${suspended} creators`, req.ip);
    res.json({ success: true, sent, suspended });
  } catch (e) { next(e); }
});

// POST: Reactivate a suspended creator (admin only)
router.post("/creators/:id/reactivate", async (req, res, next) => {
  try {
    const emailService = require("../services/emailService");
    const creator = await Creator.findById(req.params.id).populate("user", "name email");
    if (!creator) return res.status(404).json({ success: false, message: "Creator not found" });

    if (creator.subscriptionStatus !== "suspended") {
      return res.status(400).json({ success: false, message: "Creator is not suspended" });
    }

    await Creator.updateOne({ _id: creator._id }, { $set: { subscriptionStatus: "active" } });

    if (creator.user?.email) {
      await emailService.sendEmail({
        to: creator.user.email,
        subject: "✅ Account Reactivated — BookMyShot",
        html: `<div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:2rem;background:#111;color:#f6eee7;border-radius:12px">
          <h2 style="color:#10b981;margin:0 0 1rem">✅ Account Reactivated</h2>
          <p style="color:#b9aa98">Hello ${creator.user.name},</p>
          <p style="color:#d4c8bc">Your BookMyShot creator account has been reactivated by our team. All your data (listings, leads, bookings, promotions) remains intact.</p>
          <p style="color:#d4c8bc">You can now access all features from your Creator Dashboard.</p>
        </div>`,
        type: "other",
        userId: creator.user._id,
        creatorId: creator._id,
        meta: { action: "account_reactivated" },
      }).catch(() => {});
    }

    await Notification.create({ user: creator.user._id, type: "info", title: "✅ Account Reactivated", message: "Your account has been reactivated. All features are restored." });
    await logAction(req.user._id, "reactivate_creator", "creator", creator._id.toString(), "Account reactivated from suspended", req.ip);

    res.json({ success: true, message: "Creator reactivated" });
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

// ─── SUBSCRIPTION ANALYTICS (for admin mobile dashboard) ─────────────────────
router.get("/subscription-analytics", async (req, res, next) => {
  try {
    const now = new Date();
    const day7 = new Date(now.getTime() + 7 * 86400000);
    const day3 = new Date(now.getTime() + 3 * 86400000);
    const day1 = new Date(now.getTime() + 1 * 86400000);

    const [active, trial, expired, overdue, suspended, pendingPayment] = await Promise.all([
      Creator.countDocuments({ subscriptionStatus: "active" }),
      Creator.countDocuments({ subscriptionStatus: "trial" }),
      Creator.countDocuments({ subscriptionStatus: "expired" }),
      Creator.countDocuments({ subscriptionStatus: "overdue" }),
      Creator.countDocuments({ subscriptionStatus: "suspended" }),
      Creator.countDocuments({ subscriptionStatus: "pending_payment" }),
    ]);

    // Expiring within timeframes (active or trial only)
    const expiringIn7 = await Creator.countDocuments({ subscriptionStatus: { $in: ["active", "trial"] }, subscriptionEndDate: { $lte: day7, $gt: now } });
    const expiringIn3 = await Creator.countDocuments({ subscriptionStatus: { $in: ["active", "trial"] }, subscriptionEndDate: { $lte: day3, $gt: now } });
    const expiringToday = await Creator.countDocuments({ subscriptionStatus: { $in: ["active", "trial"] }, subscriptionEndDate: { $lte: day1, $gt: now } });

    // Push token stats
    const usersWithPush = await User.countDocuments({ pushToken: { $exists: true, $ne: "" } });
    const creatorsUserIds = await Creator.find({}).distinct("user");
    const creatorsWithPush = await User.countDocuments({ _id: { $in: creatorsUserIds }, pushToken: { $exists: true, $ne: "" } });
    const totalUsers = await User.countDocuments({ role: "user" });
    const totalCreators = await Creator.countDocuments();

    // Last notification sent
    const lastNotif = await Notification.findOne().sort("-createdAt").select("createdAt title type");

    // Subscription reminders sent today
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const remindersSentToday = await Notification.countDocuments({ type: "subscription", createdAt: { $gte: todayStart } });

    // Monthly revenue estimate
    const configService = require("../services/configService");
    const subSettings = await configService.getSubscriptionSettings();
    const monthlyPrice = subSettings.monthlyPlanPrice || 0;
    const monthlyRevenue = active * monthlyPrice;

    // Renewal rate (active / (active + expired + overdue))
    const totalEver = active + trial + expired + overdue + suspended;
    const renewalRate = totalEver > 0 ? Math.round((active / totalEver) * 100) : 0;

    res.json({
      success: true,
      data: {
        counts: { active, trial, expired, overdue, suspended, pendingPayment },
        expiring: { in7Days: expiringIn7, in3Days: expiringIn3, today: expiringToday },
        push: { usersWithPush, creatorsWithPush, totalUsers, totalCreators },
        notifications: { lastSent: lastNotif ? lastNotif.createdAt : null, lastTitle: lastNotif ? lastNotif.title : null, remindersSentToday },
        revenue: { monthlyEstimate: monthlyRevenue, pricePerMonth: monthlyPrice, renewalRate },
        updatedAt: new Date().toISOString(),
      },
    });
  } catch (e) { next(e); }
});

module.exports = router;
