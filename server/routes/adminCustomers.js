/**
 * Admin Customer Management — Complete customer profile with all activity
 */
const express = require("express");
const mongoose = require("mongoose");
const User = require("../models/User");
const Booking = require("../models/Booking");
const CashbackTransaction = require("../models/CashbackTransaction");
const WithdrawalRequest = require("../models/WithdrawalRequest");
const Payment = require("../models/Payment");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();
router.use(protect, authorize("admin"));

// ═══ GET ALL CUSTOMERS (with summary stats) ═══
router.get("/", async (req, res, next) => {
  try {
    const { search, page = 1, limit = 50 } = req.query;
    const filter = { role: "user" };
    if (search) {
      filter.$or = [
        { name: new RegExp(search, "i") },
        { email: new RegExp(search, "i") },
        { phone: new RegExp(search, "i") },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [customers, total] = await Promise.all([
      User.find(filter).select("-password").sort("-createdAt").skip(skip).limit(Number(limit)).lean(),
      User.countDocuments(filter),
    ]);

    // Enrich with quick stats
    const enriched = await Promise.all(customers.map(async (c) => {
      const [bookingCount, cashbackAgg, withdrawnAgg] = await Promise.all([
        Booking.countDocuments({ user: c._id }),
        CashbackTransaction.aggregate([
          { $match: { user: c._id } },
          { $group: { _id: "$status", total: { $sum: "$amount" } } },
        ]),
        WithdrawalRequest.aggregate([
          { $match: { user: c._id, status: { $in: ["pending", "approved", "paid"] } } },
          { $group: { _id: null, total: { $sum: "$amount" } } },
        ]),
      ]);
      const totalEarned = cashbackAgg.find(t => t._id === "credited")?.total || 0;
      const pendingCashback = cashbackAgg.find(t => t._id === "pending")?.total || 0;
      const totalWithdrawn = withdrawnAgg[0]?.total || 0;
      return { ...c, bookingCount, totalEarned, pendingCashback, totalWithdrawn, walletBalance: totalEarned - totalWithdrawn };
    }));

    res.json({ success: true, data: enriched, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (e) { next(e); }
});

// ═══ GET FULL CUSTOMER PROFILE ═══
router.get("/:id", async (req, res, next) => {
  try {
    const userId = mongoose.Types.ObjectId(req.params.id);
    const user = await User.findById(userId).select("-password").lean();
    if (!user) return res.status(404).json({ success: false, message: "Customer not found" });

    // Parallel fetch all data
    const [bookings, cashbackTxns, withdrawals, payments] = await Promise.all([
      Booking.find({ user: userId }).sort("-createdAt").populate({ path: "creator", select: "user businessName category", populate: { path: "user", select: "name" } }).lean(),
      CashbackTransaction.find({ user: userId }).sort("-createdAt").populate("booking", "eventType eventDate status amount").lean(),
      WithdrawalRequest.find({ user: userId }).sort("-createdAt").lean(),
      Payment.find({ user: userId }).sort("-createdAt").lean(),
    ]);

    // Calculate wallet & cashback summary
    const totalCredited = cashbackTxns.filter(t => t.status === "credited").reduce((s, t) => s + t.amount, 0);
    const totalPending = cashbackTxns.filter(t => t.status === "pending").reduce((s, t) => s + t.amount, 0);
    const totalCancelled = cashbackTxns.filter(t => t.status === "cancelled").reduce((s, t) => s + t.amount, 0);
    const totalWithdrawnPaid = withdrawals.filter(w => w.status === "paid").reduce((s, w) => s + w.amount, 0);
    const totalWithdrawnPending = withdrawals.filter(w => ["pending", "approved"].includes(w.status)).reduce((s, w) => s + w.amount, 0);
    const walletBalance = totalCredited - totalWithdrawnPaid - totalWithdrawnPending;

    // Payment summary
    const totalSpent = bookings.filter(b => b.bookingFeePaid).reduce((s, b) => s + (b.bookingFeeAmount || 0), 0);
    const totalBookingValue = bookings.reduce((s, b) => s + (b.amount || b.budget || 0), 0);

    // Balance verification
    const expectedBalance = totalCredited - totalWithdrawnPaid - totalWithdrawnPending;
    const balanceMismatch = Math.abs(walletBalance - expectedBalance) > 0.01;

    // Build timeline
    const timeline = [];
    timeline.push({ type: "account_created", date: user.createdAt, desc: "Account created" });
    bookings.forEach(b => {
      timeline.push({ type: "inquiry_sent", date: b.createdAt, desc: `Inquiry: ${b.eventType} on ${new Date(b.eventDate).toLocaleDateString('en-IN')}` });
      if (b.status === "Creator Accepted") timeline.push({ type: "creator_accepted", date: b.updatedAt, desc: `Creator accepted: ₹${b.amount || b.budget}` });
      if (b.bookingFeePaid) timeline.push({ type: "advance_paid", date: b.bookingFeePaidAt, desc: `Booking fee paid: ₹${b.bookingFeeAmount}` });
      if (b.status === "Completed") timeline.push({ type: "booking_completed", date: b.updatedAt, desc: `Booking completed: ${b.eventType}` });
      if (b.status === "cancelled") timeline.push({ type: "booking_cancelled", date: b.updatedAt, desc: `Booking cancelled: ${b.eventType}` });
    });
    cashbackTxns.forEach(tx => {
      if (tx.status === "credited") timeline.push({ type: "cashback_added", date: tx.creditedAt || tx.createdAt, desc: `Cashback ₹${tx.amount} credited` });
      if (tx.status === "cancelled") timeline.push({ type: "cashback_cancelled", date: tx.updatedAt, desc: `Cashback ₹${tx.amount} reversed` });
    });
    withdrawals.forEach(w => {
      timeline.push({ type: "withdrawal_" + w.status, date: w.paidAt || w.approvedAt || w.createdAt, desc: `Withdrawal ₹${w.amount} — ${w.status}` });
    });
    timeline.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json({
      success: true,
      data: {
        user,
        summary: {
          totalBookings: bookings.length,
          totalInquiries: bookings.length,
          totalSpent,
          totalBookingValue,
          walletBalance,
          totalCredited,
          totalPending,
          totalCancelled,
          totalWithdrawnPaid,
          totalWithdrawnPending,
          balanceMismatch,
          expectedBalance,
        },
        bookings,
        cashbackTxns,
        withdrawals,
        payments,
        timeline,
      },
    });
  } catch (e) { next(e); }
});

// ═══ ADMIN: Add manual cashback ═══
router.post("/:id/add-cashback", async (req, res, next) => {
  try {
    const { amount, reason } = req.body;
    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ success: false, message: "Valid amount required" });
    }

    const userId = req.params.id;

    // Verify user exists
    const userExists = await User.findById(userId);
    if (!userExists) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const tx = await CashbackTransaction.create({
      user: userId,
      amount: Number(amount),
      percentage: 0,
      bookingAmount: 0,
      status: "credited",
      creditedAt: new Date(),
      notes: `Manual credit by admin: ${reason || 'Admin adjustment'}`,
    });

    // Calculate updated balance
    const totals = await CashbackTransaction.aggregate([
      { $match: { user: userExists._id, status: "credited" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const cashbackBalance = totals[0]?.total || 0;

    return res.json({
      success: true,
      message: `₹${amount} cashback added successfully.`,
      data: tx,
      cashbackBalance,
      transactionId: String(tx._id),
    });
  } catch (e) {
    console.error("[Add Cashback] Error:", e.message, e.stack);
    return res.status(500).json({ success: false, message: e.message || "Internal server error" });
  }
});

// ═══ ADMIN: Deduct cashback ═══
router.post("/:id/deduct-cashback", async (req, res, next) => {
  try {
    const { amount, reason } = req.body;
    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ success: false, message: "Valid amount required" });
    }

    const userId = req.params.id;

    const userExists = await User.findById(userId);
    if (!userExists) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const tx = await CashbackTransaction.create({
      user: userId,
      amount: -Number(amount),
      percentage: 0,
      bookingAmount: 0,
      status: "credited",
      creditedAt: new Date(),
      notes: `Manual deduction by admin: ${reason || 'Admin adjustment'}`,
    });

    const totals = await CashbackTransaction.aggregate([
      { $match: { user: userExists._id, status: "credited" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const cashbackBalance = totals[0]?.total || 0;

    return res.json({
      success: true,
      message: `₹${amount} deducted successfully.`,
      data: tx,
      cashbackBalance,
      transactionId: String(tx._id),
    });
  } catch (e) {
    console.error("[Deduct Cashback] Error:", e.message, e.stack);
    return res.status(500).json({ success: false, message: e.message || "Internal server error" });
  }
});

// ═══ ADMIN: Suspend/Reactivate user ═══
router.patch("/:id/status", async (req, res, next) => {
  try {
    const { status } = req.body; // "active" or "suspended"
    const update = {};
    if (status === "suspended") update.accountDeleteRequested = true;
    else update.accountDeleteRequested = false;
    const user = await User.findByIdAndUpdate(req.params.id, update, { new: true }).select("-password");
    res.json({ success: true, data: user, message: `User ${status}` });
  } catch (e) { next(e); }
});

module.exports = router;
