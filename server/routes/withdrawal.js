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
    res.json({ success: true, data: requests });
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
