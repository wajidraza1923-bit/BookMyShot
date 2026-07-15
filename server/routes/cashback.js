const express = require("express");
const CashbackSettings = require("../models/CashbackSettings");
const CashbackTransaction = require("../models/CashbackTransaction");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

// ═══ PUBLIC: Get current cashback settings ═══
router.get("/settings", async (req, res, next) => {
  try {
    const settings = await CashbackSettings.getSettings();
    const now = new Date();
    const isActive = settings.enabled &&
      (!settings.startDate || new Date(settings.startDate) <= now) &&
      (!settings.endDate || new Date(settings.endDate) >= now);

    res.json({
      success: true,
      data: {
        percentage: settings.percentage,
        enabled: isActive,
        maxAmount: settings.maxAmount,
        minBookingAmount: settings.minBookingAmount,
        termsAndConditions: settings.termsAndConditions,
        title: settings.title,
        subtitle: settings.subtitle,
        showBanner: settings.showBanner,
      },
    });
  } catch (e) { next(e); }
});

// ═══ CUSTOMER: Get my cashback wallet ═══
router.get("/wallet", protect, async (req, res, next) => {
  try {
    const userId = req.user._id;
    const [transactions, totals] = await Promise.all([
      CashbackTransaction.find({ user: userId }).sort("-createdAt").limit(50).populate("booking", "status totalAmount"),
      CashbackTransaction.aggregate([
        { $match: { user: userId } },
        { $group: { _id: "$status", total: { $sum: "$amount" } } },
      ]),
    ]);

    const earned = totals.find(t => t._id === "credited")?.total || 0;
    const pending = totals.find(t => t._id === "pending")?.total || 0;

    res.json({
      success: true,
      data: {
        earned,
        pending,
        totalCashback: earned + pending,
        transactions,
      },
    });
  } catch (e) { next(e); }
});

// ═══ ADMIN: Get cashback settings ═══
router.get("/admin/settings", protect, authorize("admin"), async (req, res, next) => {
  try {
    const settings = await CashbackSettings.getSettings();
    res.json({ success: true, data: settings });
  } catch (e) { next(e); }
});

// ═══ ADMIN: Update cashback settings ═══
router.put("/admin/settings", protect, authorize("admin"), async (req, res, next) => {
  try {
    const { percentage, enabled, maxAmount, minBookingAmount, termsAndConditions, startDate, endDate, title, subtitle, showBanner, eligibleCategories, eligibleCities } = req.body;
    const updates = {};
    if (percentage !== undefined) updates.percentage = Math.min(100, Math.max(0, percentage));
    if (enabled !== undefined) updates.enabled = enabled;
    if (maxAmount !== undefined) updates.maxAmount = maxAmount;
    if (minBookingAmount !== undefined) updates.minBookingAmount = minBookingAmount;
    if (termsAndConditions !== undefined) updates.termsAndConditions = termsAndConditions;
    if (startDate !== undefined) updates.startDate = startDate || null;
    if (endDate !== undefined) updates.endDate = endDate || null;
    if (title !== undefined) updates.title = title;
    if (subtitle !== undefined) updates.subtitle = subtitle;
    if (showBanner !== undefined) updates.showBanner = showBanner;
    if (eligibleCategories !== undefined) updates.eligibleCategories = eligibleCategories;
    if (eligibleCities !== undefined) updates.eligibleCities = eligibleCities;

    const settings = await CashbackSettings.updateSettings(updates);
    res.json({ success: true, data: settings });
  } catch (e) { next(e); }
});

// ═══ ADMIN: Get all cashback transactions ═══
router.get("/admin/transactions", protect, authorize("admin"), async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    const transactions = await CashbackTransaction.find(filter)
      .sort("-createdAt")
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .populate("user", "name email")
      .populate("booking", "status totalAmount");
    const total = await CashbackTransaction.countDocuments(filter);
    res.json({ success: true, data: transactions, total, page: Number(page) });
  } catch (e) { next(e); }
});

// ═══ ADMIN: Cashback Reports ═══
router.get("/admin/reports", protect, authorize("admin"), async (req, res, next) => {
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const [totalGiven, todayGiven, monthGiven, pending] = await Promise.all([
      CashbackTransaction.aggregate([{ $match: { status: "credited" } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
      CashbackTransaction.aggregate([{ $match: { status: "credited", creditedAt: { $gte: today } } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
      CashbackTransaction.aggregate([{ $match: { status: "credited", creditedAt: { $gte: monthStart } } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
      CashbackTransaction.aggregate([{ $match: { status: "pending" } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
    ]);

    res.json({
      success: true,
      data: {
        totalCashbackGiven: totalGiven[0]?.total || 0,
        todayCashback: todayGiven[0]?.total || 0,
        monthlyCashback: monthGiven[0]?.total || 0,
        pendingCashback: pending[0]?.total || 0,
      },
    });
  } catch (e) { next(e); }
});

// ═══ CUSTOMER: Confirm booking completion & trigger cashback ═══
router.post("/confirm-completion", protect, async (req, res, next) => {
  try {
    const { bookingId } = req.body;
    if (!bookingId) return res.status(400).json({ success: false, message: "bookingId required" });

    const Booking = require("../models/Booking");
    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });

    // Validate eligibility
    if (!booking.bookingFeePaid) return res.status(400).json({ success: false, message: "Booking fee was not paid" });
    if (booking.status === "Cancelled" || booking.status === "Refunded") return res.status(400).json({ success: false, message: "Cancelled/refunded bookings are not eligible" });

    // Check if already credited
    const existing = await CashbackTransaction.findOne({ booking: bookingId });
    if (existing) return res.json({ success: true, data: existing, message: "Cashback already credited" });

    // Get settings & calculate
    const settings = await CashbackSettings.getSettings();
    const now = new Date();
    const isActive = settings.enabled && (!settings.startDate || new Date(settings.startDate) <= now) && (!settings.endDate || new Date(settings.endDate) >= now);

    if (!isActive) return res.status(400).json({ success: false, message: "Cashback is currently not active" });

    const bookingAmount = booking.totalAmount || booking.quotedAmount || booking.amount || 0;
    if (bookingAmount < settings.minBookingAmount) return res.status(400).json({ success: false, message: `Minimum ₹${settings.minBookingAmount} required for cashback` });

    let cashbackAmount = Math.round((bookingAmount * settings.percentage) / 100);
    if (cashbackAmount > settings.maxAmount) cashbackAmount = settings.maxAmount;

    // Credit cashback
    const transaction = await CashbackTransaction.create({
      user: req.user._id,
      booking: bookingId,
      amount: cashbackAmount,
      percentage: settings.percentage,
      bookingAmount,
      status: "credited",
      creditedAt: new Date(),
    });

    // Update booking
    await Booking.findByIdAndUpdate(bookingId, { $set: { customerConfirmedCompletion: true } });

    res.status(201).json({
      success: true,
      message: `🎉 ₹${cashbackAmount} cashback credited to your wallet!`,
      data: transaction,
    });
  } catch (e) {
    if (e.code === 11000) return res.json({ success: true, message: "Cashback already credited" });
    next(e);
  }
});

// ═══ CUSTOMER: Apply wallet cashback to booking fee ═══
router.post("/apply-to-booking", protect, async (req, res, next) => {
  try {
    const { bookingId, amountToApply } = req.body;
    if (!bookingId || !amountToApply) return res.status(400).json({ success: false, message: "bookingId and amountToApply required" });

    // Get wallet balance
    const totals = await CashbackTransaction.aggregate([
      { $match: { user: req.user._id, status: "credited" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const balance = totals[0]?.total || 0;

    // Get already used amount
    const used = await CashbackTransaction.aggregate([
      { $match: { user: req.user._id, status: "used" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const usedAmount = used[0]?.total || 0;
    const available = balance - usedAmount;

    if (amountToApply > available) return res.status(400).json({ success: false, message: `Only ₹${available} available in wallet` });

    res.json({
      success: true,
      data: {
        applied: amountToApply,
        remainingBalance: available - amountToApply,
      },
    });
  } catch (e) { next(e); }
});

// ═══ INTERNAL: Credit cashback for a completed booking ═══
router.post("/credit", protect, async (req, res, next) => {
  try {
    const { bookingId, bookingAmount } = req.body;
    if (!bookingId || !bookingAmount) return res.status(400).json({ success: false, message: "bookingId and bookingAmount required" });

    // Check if cashback already exists for this booking
    const existing = await CashbackTransaction.findOne({ booking: bookingId });
    if (existing) return res.status(409).json({ success: false, message: "Cashback already processed for this booking" });

    // Get settings
    const settings = await CashbackSettings.getSettings();
    const now = new Date();
    const isActive = settings.enabled &&
      (!settings.startDate || new Date(settings.startDate) <= now) &&
      (!settings.endDate || new Date(settings.endDate) >= now);

    if (!isActive) return res.status(400).json({ success: false, message: "Cashback is not active" });
    if (bookingAmount < settings.minBookingAmount) return res.status(400).json({ success: false, message: `Minimum booking amount is ₹${settings.minBookingAmount}` });

    // Calculate cashback
    let cashbackAmount = Math.round((bookingAmount * settings.percentage) / 100);
    if (cashbackAmount > settings.maxAmount) cashbackAmount = settings.maxAmount;

    const transaction = await CashbackTransaction.create({
      user: req.user._id,
      booking: bookingId,
      amount: cashbackAmount,
      percentage: settings.percentage,
      bookingAmount,
      status: "credited",
      creditedAt: new Date(),
    });

    res.status(201).json({ success: true, data: transaction });
  } catch (e) {
    if (e.code === 11000) return res.status(409).json({ success: false, message: "Cashback already processed" });
    next(e);
  }
});

module.exports = router;
