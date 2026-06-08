const express = require("express");
const SubscriptionPayment = require("../models/SubscriptionPayment");
const Creator = require("../models/Creator");
const Commission = require("../models/Commission");
const Invoice = require("../models/Invoice");
const Notification = require("../models/Notification");
const { protect, authorize } = require("../middleware/auth");
const configService = require("../services/configService");

const router = express.Router();
router.use(protect);

// ═══════════════════════════════════════════════════════════════
// CREATOR ENDPOINTS
// ═══════════════════════════════════════════════════════════════

// GET subscription payment info (amount, UPI, status)
router.get("/info", authorize("creator"), async (req, res, next) => {
  try {
    const creator = await Creator.findOne({ user: req.user._id });
    if (!creator) return res.status(404).json({ success: false, message: "Creator not found" });

    const subSettings = await configService.getSubscriptionSettings();
    const commSettings = await configService.getCommissionSettings();
    const Booking = require("../models/Booking");

    // Check pending subscription payment request
    const pendingPayment = await SubscriptionPayment.findOne({
      creator: creator._id,
      type: "subscription",
      status: "pending",
    });

    // Calculate commission from bookings using ONLY stored commission amounts
    // Historical commission is frozen permanently — never recalculated from current settings
    const bookings = await Booking.find({ creator: creator._id, status: { $nin: ["rejected", "cancelled"] } });
    let totalCommissionGenerated = 0;
    let totalRevenue = 0;
    
    for (const b of bookings) {
      totalRevenue += (b.amount || 0);
      // ONLY use stored commissionAmount — never recalculate from current percentage
      if (b.commissionAmount && b.commissionAmount > 0) {
        totalCommissionGenerated += b.commissionAmount;
      }
      // Bookings without stored commissionAmount have not been processed yet (commission = 0)
    }

    // Commission paid is tracked on Creator document (permanently frozen after approval)
    const totalCommissionPaid = creator.commissionPaid || 0;
    const totalCommissionDue = Math.max(0, totalCommissionGenerated - totalCommissionPaid);

    // Check pending commission payment
    const pendingCommissionPayment = await SubscriptionPayment.findOne({
      creator: creator._id,
      type: "commission",
      status: "pending",
    });

    res.json({
      success: true,
      subscription: {
        amount: subSettings.monthlyPlanPrice,
        plan: "Monthly",
        status: creator.subscriptionStatus,
        endDate: creator.subscriptionEndDate,
        startDate: creator.subscriptionStartDate,
        pendingPayment: pendingPayment || null,
      },
      commission: {
        bmsPercent: commSettings.bmsLeadCommissionPercent,
        creatorPercent: commSettings.creatorLeadCommissionPercent,
        totalGenerated: totalCommissionGenerated,
        totalDue: totalCommissionDue,
        totalPaid: totalCommissionPaid,
        totalRevenue: totalRevenue,
        pendingPayment: pendingCommissionPayment || null,
      },
    });
  } catch (e) {
    next(e);
  }
});

// POST submit subscription payment request
router.post("/subscribe", authorize("creator"), async (req, res, next) => {
  try {
    const { screenshot, utr, note } = req.body;
    if (!screenshot || !utr) {
      return res.status(400).json({ success: false, message: "Screenshot and UTR are required" });
    }

    const creator = await Creator.findOne({ user: req.user._id });
    if (!creator) return res.status(404).json({ success: false, message: "Creator not found" });

    // Check for existing pending request
    const existing = await SubscriptionPayment.findOne({
      creator: creator._id,
      type: "subscription",
      status: "pending",
    });
    if (existing) {
      return res.status(400).json({ success: false, message: "You already have a pending subscription payment request" });
    }

    // Upload screenshot to Cloudinary if base64
    let screenshotUrl = screenshot;
    if (screenshotUrl.startsWith("data:")) {
      try {
        const { uploadBase64, isConfigured } = require("../services/cloudinaryService");
        if (isConfigured()) {
          const result = await uploadBase64(screenshotUrl, { folder: "bookmyshot/subscription-payments" });
          screenshotUrl = result.url;
        }
      } catch (e) { /* keep original */ }
    }

    const subSettings = await configService.getSubscriptionSettings();

    const payment = await SubscriptionPayment.create({
      creator: creator._id,
      user: req.user._id,
      amount: subSettings.monthlyPlanPrice,
      screenshot: screenshotUrl,
      utr,
      note: note || "",
      type: "subscription",
    });

    // Notify admin
    const User = require("../models/User");
    const admins = await User.find({ role: "admin" }).select("_id");
    for (const admin of admins) {
      await Notification.create({
        user: admin._id,
        type: "payment",
        title: "💳 New Subscription Payment",
        message: `${req.user.name} submitted subscription payment of ₹${subSettings.monthlyPlanPrice}`,
      });
    }

    res.status(201).json({ success: true, payment });
  } catch (e) {
    next(e);
  }
});

// POST submit commission payment request
router.post("/commission", authorize("creator"), async (req, res, next) => {
  try {
    const { screenshot, utr, amount, note } = req.body;
    if (!screenshot || !utr || !amount) {
      return res.status(400).json({ success: false, message: "Screenshot, UTR, and amount are required" });
    }

    const creator = await Creator.findOne({ user: req.user._id });
    if (!creator) return res.status(404).json({ success: false, message: "Creator not found" });

    // Check for existing pending request
    const existing = await SubscriptionPayment.findOne({
      creator: creator._id,
      type: "commission",
      status: "pending",
    });
    if (existing) {
      return res.status(400).json({ success: false, message: "You already have a pending commission payment request" });
    }

    // Upload screenshot to Cloudinary if base64
    let screenshotUrl = screenshot;
    if (screenshotUrl.startsWith("data:")) {
      try {
        const { uploadBase64, isConfigured } = require("../services/cloudinaryService");
        if (isConfigured()) {
          const result = await uploadBase64(screenshotUrl, { folder: "bookmyshot/commission-payments" });
          screenshotUrl = result.url;
        }
      } catch (e) { /* keep original */ }
    }

    const payment = await SubscriptionPayment.create({
      creator: creator._id,
      user: req.user._id,
      amount: Number(amount),
      screenshot: screenshotUrl,
      utr,
      note: note || "",
      type: "commission",
    });

    // Notify admin
    const User = require("../models/User");
    const admins = await User.find({ role: "admin" }).select("_id");
    for (const admin of admins) {
      await Notification.create({
        user: admin._id,
        type: "payment",
        title: "💳 Commission Payment Submitted",
        message: `${req.user.name} submitted commission payment of ₹${amount}`,
      });
    }

    res.status(201).json({ success: true, payment });
  } catch (e) {
    next(e);
  }
});

// GET creator's payment history
router.get("/history", authorize("creator"), async (req, res, next) => {
  try {
    const creator = await Creator.findOne({ user: req.user._id });
    const payments = await SubscriptionPayment.find({ creator: creator._id }).sort("-createdAt");
    res.json({ success: true, payments });
  } catch (e) {
    next(e);
  }
});

// ═══════════════════════════════════════════════════════════════
// ADMIN ENDPOINTS
// ═══════════════════════════════════════════════════════════════

// GET all payment requests (admin)
router.get("/admin/requests", authorize("admin"), async (req, res, next) => {
  try {
    const { type, status } = req.query;
    const filter = {};
    if (type) filter.type = type;
    if (status) filter.status = status;

    const payments = await SubscriptionPayment.find(filter)
      .populate({ path: "creator", populate: { path: "user", select: "name email phone" } })
      .sort("-createdAt");

    res.json({ success: true, payments });
  } catch (e) {
    next(e);
  }
});

// PATCH approve payment (admin)
router.patch("/admin/:id/approve", authorize("admin"), async (req, res, next) => {
  try {
    const payment = await SubscriptionPayment.findById(req.params.id);
    if (!payment) return res.status(404).json({ success: false, message: "Payment not found" });

    payment.status = "approved";
    payment.adminNote = req.body.adminNote || "";
    await payment.save();

    const creator = await Creator.findById(payment.creator);

    if (payment.type === "subscription" && creator) {
      // EXTEND subscription from current expiry date (not reset from today)
      const now = new Date();
      const currentEnd = creator.subscriptionEndDate ? new Date(creator.subscriptionEndDate) : now;
      // Extend from whichever is later: current expiry or today
      const baseDate = currentEnd > now ? currentEnd : now;
      const newEndDate = new Date(baseDate);
      newEndDate.setMonth(newEndDate.getMonth() + 1);

      creator.subscriptionStatus = "active";
      if (!creator.subscriptionStartDate) creator.subscriptionStartDate = now;
      creator.subscriptionEndDate = newEndDate;
      creator.lastPaymentDate = now;
      await creator.save();

      // Store period on payment record
      payment.periodStart = baseDate;
      payment.periodEnd = newEndDate;
      await payment.save();

      // Create invoice
      await Invoice.create({
        creator: creator._id,
        invoiceNumber: "BMS-SUB-" + Date.now(),
        type: "subscription",
        description: "Monthly Subscription Payment",
        amount: payment.amount,
        status: "paid",
        paidAt: now,
        dueDate: newEndDate,
      });
    }

    if (payment.type === "commission" && creator) {
      // Add approved amount to creator's commissionPaid tracker
      creator.commissionPaid = (creator.commissionPaid || 0) + payment.amount;
      await creator.save();
      console.log(`[Commission] Approved ₹${payment.amount} for creator ${creator._id}. Total paid now: ₹${creator.commissionPaid}`);
    }

    // Notify creator
    await Notification.create({
      user: payment.user,
      type: "payment",
      title: payment.type === "subscription" ? "✅ Subscription Activated" : "✅ Commission Payment Approved",
      message: payment.type === "subscription"
        ? "Your subscription payment has been approved. Your account is now active!"
        : `Your commission payment of ₹${payment.amount} has been approved.`,
    });

    res.json({ success: true, payment });
  } catch (e) {
    next(e);
  }
});

// PATCH reject payment (admin)
router.patch("/admin/:id/reject", authorize("admin"), async (req, res, next) => {
  try {
    const payment = await SubscriptionPayment.findById(req.params.id);
    if (!payment) return res.status(404).json({ success: false, message: "Payment not found" });

    payment.status = "rejected";
    payment.adminNote = req.body.adminNote || req.body.reason || "";
    await payment.save();

    // Notify creator
    await Notification.create({
      user: payment.user,
      type: "payment",
      title: payment.type === "subscription" ? "❌ Subscription Payment Rejected" : "❌ Commission Payment Rejected",
      message: `Your ${payment.type} payment of ₹${payment.amount} was rejected. ${payment.adminNote || "Please resubmit."}`,
    });

    res.json({ success: true, payment });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
