const express = require("express");
const Creator = require("../models/Creator");
const Booking = require("../models/Booking");
const Commission = require("../models/Commission");
const Invoice = require("../models/Invoice");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();
router.use(protect);

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// CREATOR ENDPOINTS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

// GET creator revenue dashboard
router.get("/creator/dashboard", authorize("creator"), async (req, res, next) => {
  try {
    const creator = await Creator.findOne({ user: req.user._id });
    if (!creator) return res.status(404).json({ success: false, message: "Creator not found" });

    const bookings = await Booking.find({ creator: creator._id, status: { $ne: "rejected" } });
    const commissions = await Commission.find({ creator: creator._id });
    const invoices = await Invoice.find({ creator: creator._id });

    const bmsLeads = bookings.filter(b => b.leadSource === "bookmyshot");
    const creatorLeads = bookings.filter(b => b.leadSource === "creator");

    const totalRevenue = bookings.reduce((s, b) => s + (b.amount || 0), 0);
    const totalCommissionDue = commissions.filter(c => c.status === "pending").reduce((s, c) => s + c.commissionAmount, 0);
    const totalCommissionPaid = commissions.filter(c => c.status === "paid").reduce((s, c) => s + c.commissionAmount, 0);
    const outstandingBalance = totalCommissionDue;

    res.json({
      success: true,
      subscription: {
        plan: creator.subscriptionPlan || "basic",
        amount: creator.subscriptionAmount || 299,
        startDate: creator.subscriptionStartDate,
        endDate: creator.subscriptionEndDate,
        status: creator.subscriptionStatus || "trial",
      },
      stats: {
        totalBookings: bookings.length,
        bmsLeads: bmsLeads.length,
        creatorLeads: creatorLeads.length,
        totalRevenue,
        totalCommissionDue,
        totalCommissionPaid,
        outstandingBalance,
      },
      recentCommissions: commissions.slice(-10).reverse(),
      invoices: invoices.slice(-10).reverse(),
    });
  } catch (e) {
    next(e);
  }
});

// POST renew subscription
router.post("/creator/subscribe", authorize("creator"), async (req, res, next) => {
  try {
    const creator = await Creator.findOne({ user: req.user._id });
    if (!creator) return res.status(404).json({ success: false, message: "Creator not found" });

    // Load subscription pricing from database
    const configService = require("../services/configService");
    const subSettings = await configService.getSubscriptionSettings();
    const price = subSettings.monthlyPlanPrice || 0;
    const trialDays = subSettings.trialDays || 30;

    const now = new Date();
    const endDate = new Date(now);

    // If price is 0 or free trial enabled, activate as trial
    if (price === 0 || (subSettings.freeTrialEnabled && trialDays > 0)) {
      endDate.setDate(endDate.getDate() + trialDays);
      creator.subscriptionStatus = "trial";
    } else {
      endDate.setMonth(endDate.getMonth() + 1);
      creator.subscriptionStatus = "active";
    }

    creator.subscriptionStartDate = now;
    creator.subscriptionEndDate = endDate;
    creator.subscriptionAmount = price;
    creator.lastPaymentDate = now;
    await creator.save();

    // Create subscription invoice (only if price > 0)
    let invoice = null;
    if (price > 0) {
      invoice = await Invoice.create({
        creator: creator._id,
        invoiceNumber: "BMS-SUB-" + Date.now(),
        type: "subscription",
        description: "Monthly Subscription - " + now.toLocaleDateString("en-IN", { month: "long", year: "numeric" }),
        amount: price,
        status: "paid",
        paidAt: now,
        dueDate: endDate,
      });
    }

    res.json({ success: true, subscription: { status: creator.subscriptionStatus, startDate: now, endDate }, invoice });
  } catch (e) {
    next(e);
  }
});

// GET creator invoices
router.get("/creator/invoices", authorize("creator"), async (req, res, next) => {
  try {
    const creator = await Creator.findOne({ user: req.user._id });
    const invoices = await Invoice.find({ creator: creator._id }).sort("-createdAt");
    res.json({ success: true, invoices });
  } catch (e) {
    next(e);
  }
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// ADMIN ENDPOINTS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

// GET admin revenue dashboard
router.get("/admin/dashboard", authorize("admin"), async (req, res, next) => {
  try {
    const creators = await Creator.find({});
    const bookings = await Booking.find({ status: { $ne: "rejected" } });
    const commissions = await Commission.find({});
    const invoices = await Invoice.find({});

    const activeSubscriptions = creators.filter(c => c.subscriptionStatus === "active").length;
    const expiredSubscriptions = creators.filter(c => c.subscriptionStatus === "expired").length;
    const trialSubscriptions = creators.filter(c => c.subscriptionStatus === "trial").length;

    // Load subscription pricing from database
    const configService = require("../services/configService");
    const subSettings = await configService.getSubscriptionSettings();
    const monthlyPrice = subSettings.monthlyPlanPrice || 299;

    const monthlySubRevenue = activeSubscriptions * monthlyPrice;
    const bmsLeadRevenue = commissions.filter(c => c.leadSource === "bookmyshot").reduce((s, c) => s + c.commissionAmount, 0);
    const creatorLeadRevenue = commissions.filter(c => c.leadSource === "creator").reduce((s, c) => s + c.commissionAmount, 0);
    const pendingCommission = commissions.filter(c => c.status === "pending").reduce((s, c) => s + c.commissionAmount, 0);
    const paidCommission = commissions.filter(c => c.status === "paid").reduce((s, c) => s + c.commissionAmount, 0);

    res.json({
      success: true,
      stats: {
        totalCreators: creators.length,
        activeSubscriptions,
        expiredSubscriptions,
        trialSubscriptions,
        monthlySubRevenue,
        bmsLeadRevenue,
        creatorLeadRevenue,
        pendingCommission,
        paidCommission,
        outstandingCommission: pendingCommission,
        totalBookings: bookings.length,
        totalBookingRevenue: bookings.reduce((s, b) => s + (b.amount || 0), 0),
      },
      recentInvoices: invoices.slice(-20).reverse(),
    });
  } catch (e) {
    next(e);
  }
});

// GET admin view of a specific creator's revenue
router.get("/admin/creator/:creatorId", authorize("admin"), async (req, res, next) => {
  try {
    const creator = await Creator.findById(req.params.creatorId).populate("user", "name email phone avatar");
    if (!creator) return res.status(404).json({ success: false, message: "Creator not found" });

    const bookings = await Booking.find({ creator: creator._id, status: { $ne: "rejected" } });
    const commissions = await Commission.find({ creator: creator._id });
    const invoices = await Invoice.find({ creator: creator._id }).sort("-createdAt");

    const bmsLeads = bookings.filter(b => b.leadSource === "bookmyshot").length;
    const creatorLeads = bookings.filter(b => b.leadSource === "creator").length;
    const totalRevenue = bookings.reduce((s, b) => s + (b.amount || 0), 0);
    const commissionDue = commissions.filter(c => c.status === "pending").reduce((s, c) => s + c.commissionAmount, 0);
    const commissionPaid = commissions.filter(c => c.status === "paid").reduce((s, c) => s + c.commissionAmount, 0);

    res.json({
      success: true,
      creator: {
        _id: creator._id,
        name: creator.user?.name,
        email: creator.user?.email,
        phone: creator.user?.phone,
        avatar: creator.user?.avatar,
        subscriptionStatus: creator.subscriptionStatus,
        subscriptionEndDate: creator.subscriptionEndDate,
      },
      stats: {
        totalBookings: bookings.length,
        totalRevenue,
        bmsLeads,
        creatorLeads,
        commissionDue,
        commissionPaid,
        outstandingAmount: commissionDue,
      },
      commissions,
      invoices,
    });
  } catch (e) {
    next(e);
  }
});

// PATCH admin mark commission as paid
router.patch("/admin/commission/:id/pay", authorize("admin"), async (req, res, next) => {
  try {
    const commission = await Commission.findById(req.params.id);
    if (!commission) return res.status(404).json({ success: false, message: "Commission not found" });

    commission.status = "paid";
    commission.paidAt = new Date();
    if (req.body.notes) commission.notes = req.body.notes;
    await commission.save();

    // Update booking commission status
    await Booking.findByIdAndUpdate(commission.booking, { commissionStatus: "paid" });

    res.json({ success: true, commission });
  } catch (e) {
    next(e);
  }
});

// PATCH admin mark commission as pending
router.patch("/admin/commission/:id/pending", authorize("admin"), async (req, res, next) => {
  try {
    const commission = await Commission.findById(req.params.id);
    if (!commission) return res.status(404).json({ success: false, message: "Commission not found" });

    commission.status = "pending";
    commission.paidAt = null;
    if (req.body.notes) commission.notes = req.body.notes;
    await commission.save();

    await Booking.findByIdAndUpdate(commission.booking, { commissionStatus: "pending" });

    res.json({ success: true, commission });
  } catch (e) {
    next(e);
  }
});

// GET admin all commissions
router.get("/admin/commissions", authorize("admin"), async (req, res, next) => {
  try {
    const commissions = await Commission.find({})
      .populate({ path: "creator", populate: { path: "user", select: "name email" } })
      .populate("booking", "clientName eventType amount leadSource")
      .sort("-createdAt");
    res.json({ success: true, commissions });
  } catch (e) {
    next(e);
  }
});

// GET admin all invoices
router.get("/admin/invoices", authorize("admin"), async (req, res, next) => {
  try {
    const invoices = await Invoice.find({})
      .populate({ path: "creator", populate: { path: "user", select: "name email" } })
      .sort("-createdAt");
    res.json({ success: true, invoices });
  } catch (e) {
    next(e);
  }
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// COMMISSION CALCULATION HELPER (used by booking routes)
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

// POST calculate and create commission for a booking (called when amount is set)
router.post("/calculate", authorize("creator"), async (req, res, next) => {
  try {
    const { bookingId } = req.body;
    if (!bookingId) return res.status(400).json({ success: false, message: "bookingId required" });

    const creator = await Creator.findOne({ user: req.user._id });
    const booking = await Booking.findOne({ _id: bookingId, creator: creator._id });
    if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });

    // Load commission rates from database
    const configService = require("../services/configService");
    const commSettings = await configService.getCommissionSettings();

    const leadSource = booking.leadSource || "bookmyshot";
    const commissionPercent = leadSource === "creator"
      ? (commSettings.inquiryCommissionPercent || commSettings.creatorLeadCommissionPercent || 3)
      : (commSettings.bmsLeadCommissionPercent || 5);
    const amount = booking.amount || 0;
    const commissionAmount = Math.round((amount * commissionPercent) / 100);
    const creatorReceivable = amount - commissionAmount;

    // Update booking
    booking.leadSource = leadSource;
    booking.commissionPercent = commissionPercent;
    booking.commissionAmount = commissionAmount;
    booking.creatorReceivable = creatorReceivable;
    booking.commissionStatus = "pending";
    await booking.save();

    // Create or update commission record
    let commission = await Commission.findOne({ booking: booking._id });
    if (commission) {
      commission.totalAmount = amount;
      commission.leadSource = leadSource;
      commission.commissionPercent = commissionPercent;
      commission.commissionAmount = commissionAmount;
      commission.creatorEarning = creatorReceivable;
      await commission.save();
    } else {
      commission = await Commission.create({
        booking: booking._id,
        creator: creator._id,
        user: booking.user,
        totalAmount: amount,
        leadSource,
        commissionPercent,
        commissionAmount,
        creatorEarning: creatorReceivable,
        status: "pending",
      });

      // Create invoice for commission
      await Invoice.create({
        creator: creator._id,
        invoiceNumber: "BMS-COM-" + Date.now(),
        type: "commission",
        description: `Commission for ${booking.eventType} - ${booking.clientName}`,
        amount: commissionAmount,
        status: "pending",
        booking: booking._id,
        commission: commission._id,
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      });
    }

    res.json({ success: true, booking, commission });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
