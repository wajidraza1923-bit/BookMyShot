const express = require("express");
const WithdrawalRequest = require("../models/WithdrawalRequest");
const CashbackTransaction = require("../models/CashbackTransaction");
const { protect, authorize } = require("../middleware/auth");
const router = express.Router();

// ═══ CUSTOMER: Submit withdrawal request ═══
router.post("/request", protect, async (req, res, next) => {
  try {
    const { amount, accountHolderName, bankAccountNumber, ifscCode, upiId } = req.body;
    if (!amount || amount < 100) return res.status(400).json({ success: false, message: "Minimum withdrawal is ₹100" });
    if (!accountHolderName || !bankAccountNumber || !ifscCode) return res.status(400).json({ success: false, message: "Bank details required" });

    // Check available balance
    const credited = await CashbackTransaction.aggregate([{ $match: { user: req.user._id, status: "credited" } }, { $group: { _id: null, total: { $sum: "$amount" } } }]);
    const withdrawn = await WithdrawalRequest.aggregate([{ $match: { user: req.user._id, status: { $in: ["pending", "approved", "paid"] } } }, { $group: { _id: null, total: { $sum: "$amount" } } }]);
    const available = (credited[0]?.total || 0) - (withdrawn[0]?.total || 0);

    if (amount > available) return res.status(400).json({ success: false, message: `Only ₹${available} available` });

    // Check no pending request
    const pending = await WithdrawalRequest.findOne({ user: req.user._id, status: "pending" });
    if (pending) return res.status(400).json({ success: false, message: "You already have a pending withdrawal request" });

    const request = await WithdrawalRequest.create({ user: req.user._id, amount, accountHolderName, bankAccountNumber, ifscCode, upiId: upiId || "" });
    res.status(201).json({ success: true, data: request });
  } catch (e) { next(e); }
});

// ═══ CUSTOMER: My withdrawal requests ═══
router.get("/my-requests", protect, async (req, res, next) => {
  try {
    const requests = await WithdrawalRequest.find({ user: req.user._id }).sort("-createdAt").limit(20);
    res.json({ success: true, data: requests });
  } catch (e) { next(e); }
});

// ═══ ADMIN: Get all requests ═══
router.get("/admin/all", protect, authorize("admin"), async (req, res, next) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};
    const requests = await WithdrawalRequest.find(filter).sort("-createdAt").populate("user", "name email phone");

    // Enrich each request with user's cashback summary
    const enriched = await Promise.all(requests.map(async (req_item) => {
      const userId = req_item.user?._id || req_item.user;
      const [credited, withdrawn] = await Promise.all([
        CashbackTransaction.aggregate([{ $match: { user: userId, status: "credited" } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
        WithdrawalRequest.aggregate([{ $match: { user: userId, status: { $in: ["pending", "approved", "paid"] } } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
      ]);
      const totalEarned = credited[0]?.total || 0;
      const totalWithdrawn = withdrawn[0]?.total || 0;
      const availableBalance = totalEarned - totalWithdrawn;
      return { ...req_item.toObject(), totalEarned, totalWithdrawn, availableBalance };
    }));

    res.json({ success: true, data: enriched });
  } catch (e) { next(e); }
});

// ═══ ADMIN: Get customer full cashback history for a withdrawal ═══
router.get("/admin/customer-history/:userId", protect, authorize("admin"), async (req, res, next) => {
  try {
    const userId = require("mongoose").Types.ObjectId(req.params.userId);
    const Booking = require("../models/Booking");

    const [cashbackTxns, withdrawals, bookings] = await Promise.all([
      CashbackTransaction.find({ user: userId }).sort("-createdAt").populate("booking", "eventType eventDate status amount totalAmount bookingFeePaid bookingFeeAmount bookingFeePaidAt clientName"),
      WithdrawalRequest.find({ user: userId }).sort("-createdAt"),
      Booking.find({ user: userId, bookingFeePaid: true }).sort("-createdAt").select("eventType eventDate status amount totalAmount bookingFeeAmount bookingFeePaidAt clientName createdAt customerConfirmedCompletion"),
    ]);

    // Build timeline
    const timeline = [];

    // Booking fee payments
    bookings.forEach(b => {
      timeline.push({
        type: "booking_fee",
        date: b.bookingFeePaidAt || b.createdAt,
        description: `Paid 5% booking fee for ${b.eventType}`,
        amount: b.bookingFeeAmount || 0,
        bookingStatus: b.status,
        eventDate: b.eventDate,
        bookingId: b._id,
      });
    });

    // Cashback credits
    cashbackTxns.forEach(tx => {
      timeline.push({
        type: tx.status === "cancelled" ? "cashback_cancelled" : "cashback_credited",
        date: tx.creditedAt || tx.createdAt,
        description: tx.status === "cancelled"
          ? `Cashback reversed (booking cancelled)`
          : `${tx.percentage}% cashback on ₹${tx.bookingAmount} booking`,
        amount: tx.amount,
        status: tx.status,
        bookingId: tx.booking?._id,
        bookingStatus: tx.booking?.status,
      });
    });

    // Withdrawals
    withdrawals.forEach(w => {
      timeline.push({
        type: "withdrawal",
        date: w.paidAt || w.approvedAt || w.createdAt,
        description: `Withdrawal ₹${w.amount} — ${w.status}`,
        amount: w.amount,
        status: w.status,
        utrNumber: w.utrNumber,
        withdrawalId: w._id,
      });
    });

    // Sort by date desc
    timeline.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Summary
    const totalCredited = cashbackTxns.filter(t => t.status === "credited").reduce((s, t) => s + t.amount, 0);
    const totalCancelled = cashbackTxns.filter(t => t.status === "cancelled").reduce((s, t) => s + t.amount, 0);
    const totalWithdrawnPaid = withdrawals.filter(w => w.status === "paid").reduce((s, w) => s + w.amount, 0);
    const totalPendingWithdraw = withdrawals.filter(w => ["pending", "approved"].includes(w.status)).reduce((s, w) => s + w.amount, 0);
    const availableBalance = totalCredited - totalWithdrawnPaid - totalPendingWithdraw;

    res.json({
      success: true,
      data: {
        timeline,
        summary: { totalCredited, totalCancelled, totalWithdrawnPaid, totalPendingWithdraw, availableBalance },
        cashbackTxns,
        withdrawals,
        bookings,
      },
    });
  } catch (e) { next(e); }
});

// ═══ ADMIN: Approve ═══
router.put("/admin/approve/:id", protect, authorize("admin"), async (req, res, next) => {
  try {
    const request = await WithdrawalRequest.findByIdAndUpdate(req.params.id, { status: "approved", approvedBy: req.user._id, approvedAt: new Date() }, { new: true });
    res.json({ success: true, data: request });
  } catch (e) { next(e); }
});

// ═══ ADMIN: Mark as Paid ═══
router.put("/admin/pay/:id", protect, authorize("admin"), async (req, res, next) => {
  try {
    const { utrNumber, paymentDate, adminNotes } = req.body;
    if (!utrNumber) return res.status(400).json({ success: false, message: "UTR number required" });
    const request = await WithdrawalRequest.findByIdAndUpdate(req.params.id, { status: "paid", utrNumber, paymentDate: paymentDate || new Date(), adminNotes: adminNotes || "", paidAt: new Date() }, { new: true });
    res.json({ success: true, data: request, message: "Withdrawal marked as paid" });
  } catch (e) { next(e); }
});

// ═══ ADMIN: Reject ═══
router.put("/admin/reject/:id", protect, authorize("admin"), async (req, res, next) => {
  try {
    const { rejectionReason } = req.body;
    if (!rejectionReason) return res.status(400).json({ success: false, message: "Rejection reason required" });
    const request = await WithdrawalRequest.findByIdAndUpdate(req.params.id, { status: "rejected", rejectionReason, rejectedAt: new Date() }, { new: true });
    res.json({ success: true, data: request });
  } catch (e) { next(e); }
});

module.exports = router;
