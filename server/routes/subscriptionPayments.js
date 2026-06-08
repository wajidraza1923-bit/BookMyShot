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

    // Check pending payment request
    const pendingPayment = await SubscriptionPayment.findOne({
      creator: creator._id,
      type: "subscription",
      status: "pending",
    });

    // Calculate commission dues
    const commissions = await Commission.find({ creator: creator._id });
    const totalCommissionDue = commissions
      .filter((c) => c.status === "pending")
      .reduce((s, c) => s + c.commissionAmount, 0);
    const totalCommissionPaid = commissions
      .filter((c) => c.status === "paid")
      .reduce((s, c) => s + c.commissionAmount, 0);

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
        totalDue: totalCommissionDue,
        totalPaid: totalCommissionPaid,
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
      // Activate subscription
      const now = new Date();
      const endDate = new Date(now);
      endDate.setMonth(endDate.getMonth() + 1);

      creator.subscriptionStatus = "active";
      creator.subscriptionStartDate = now;
      creator.subscriptionEndDate = endDate;
      creator.lastPaymentDate = now;
      await creator.save();

      // Create invoice
      await Invoice.create({
        creator: creator._id,
        invoiceNumber: "BMS-SUB-" + Date.now(),
        type: "subscription",
        description: "Monthly Subscription Payment",
        amount: payment.amount,
        status: "paid",
        paidAt: now,
        dueDate: endDate,
      });
    }

    if (payment.type === "commission" && creator) {
      // Mark pending commissions as paid up to the amount
      let remaining = payment.amount;
      const pendingCommissions = await Commission.find({
        creator: creator._id,
        status: "pending",
      }).sort("createdAt");

      for (const comm of pendingCommissions) {
        if (remaining <= 0) break;
        if (remaining >= comm.commissionAmount) {
          comm.status = "paid";
          comm.paidAt = new Date();
          remaining -= comm.commissionAmount;
          await comm.save();
        }
      }
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
