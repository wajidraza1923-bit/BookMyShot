const express = require("express");
const Creator = require("../models/Creator");
const CreatorWalletTransaction = require("../models/CreatorWallet");
const CreatorWithdrawal = require("../models/CreatorWithdrawal");
const MasterSettings = require("../models/MasterSettings");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

// ═══ CREATOR: Get wallet overview ═══
router.get("/my", protect, authorize("creator"), async (req, res, next) => {
  try {
    const creator = await Creator.findOne({ user: req.user._id });
    if (!creator) return res.status(404).json({ success: false, message: "Creator not found" });

    const transactions = await CreatorWalletTransaction.find({ creator: creator._id }).sort("-createdAt").limit(50);
    const pendingWithdrawals = await CreatorWithdrawal.find({ creator: creator._id, status: "pending" });
    const pendingAmount = pendingWithdrawals.reduce((s, w) => s + w.amount, 0);

    res.json({
      success: true,
      data: {
        walletBalance: creator.walletBalance || 0,
        totalCashbackEarned: creator.totalCashbackEarned || 0,
        totalWithdrawn: creator.totalWithdrawn || 0,
        pendingWithdrawal: pendingAmount,
        transactions,
      }
    });
  } catch (e) { next(e); }
});

// ═══ CREATOR: Get withdrawal history ═══
router.get("/withdrawals", protect, authorize("creator"), async (req, res, next) => {
  try {
    const creator = await Creator.findOne({ user: req.user._id });
    const withdrawals = await CreatorWithdrawal.find({ creator: creator._id }).sort("-createdAt");
    res.json({ success: true, data: withdrawals });
  } catch (e) { next(e); }
});

// ═══ CREATOR: Request withdrawal ═══
router.post("/withdraw", protect, authorize("creator"), async (req, res, next) => {
  try {
    const { amount, accountHolderName, bankName, accountNumber, ifscCode, upiId, note } = req.body;
    const creator = await Creator.findOne({ user: req.user._id });
    if (!creator) return res.status(404).json({ success: false, message: "Creator not found" });

    const ms = await MasterSettings.findOne();
    const minAmount = (ms && ms.minWithdrawalAmount) || 100;
    const maxAmount = (ms && ms.maxWithdrawalAmount) || 50000;

    if (!amount || amount <= 0) return res.status(400).json({ success: false, message: "Valid amount required" });
    if (amount < minAmount) return res.status(400).json({ success: false, message: `Minimum withdrawal is ₹${minAmount}` });
    if (amount > maxAmount) return res.status(400).json({ success: false, message: `Maximum withdrawal is ₹${maxAmount}` });
    if (amount > (creator.walletBalance || 0)) return res.status(400).json({ success: false, message: "Insufficient balance" });
    if (!accountHolderName && !upiId) return res.status(400).json({ success: false, message: "Bank details or UPI required" });

    // Check for pending withdrawal
    const pending = await CreatorWithdrawal.findOne({ creator: creator._id, status: "pending" });
    if (pending) return res.status(400).json({ success: false, message: "You already have a pending withdrawal request" });

    const withdrawal = await CreatorWithdrawal.create({
      creator: creator._id, amount,
      accountHolderName: accountHolderName || "",
      bankName: bankName || "",
      accountNumber: accountNumber || "",
      ifscCode: ifscCode || "",
      upiId: upiId || "",
      note: note || "",
    });

    // Deduct from wallet immediately (hold)
    const balBefore = creator.walletBalance || 0;
    creator.walletBalance = balBefore - amount;
    await creator.save();

    await CreatorWalletTransaction.create({
      creator: creator._id, type: "withdrawal", amount,
      balanceBefore: balBefore, balanceAfter: creator.walletBalance,
      reason: "Withdrawal request submitted", referenceId: withdrawal._id.toString(),
      status: "pending",
    });

    // Notify admins
    try {
      const Notification = require("../models/Notification");
      const User = require("../models/User");
      const admins = await User.find({ role: "admin" });
      for (const admin of admins) {
        await Notification.create({ user: admin._id, type: "payment", title: "💸 Creator Withdrawal Request", message: `${req.user.name} requested ₹${amount} withdrawal` });
      }
    } catch {}

    res.json({ success: true, message: "Withdrawal request submitted", data: withdrawal });
  } catch (e) { next(e); }
});

// ═══ ADMIN: Get all creator wallets ═══
router.get("/admin/all", protect, authorize("admin"), async (req, res, next) => {
  try {
    const creators = await Creator.find({ status: { $ne: "deleted" } }).populate("user", "name email phone").select("walletBalance totalCashbackEarned totalWithdrawn user creatorId").lean();
    res.json({ success: true, data: creators });
  } catch (e) { next(e); }
});

// ═══ ADMIN: Get creator wallet detail ═══
router.get("/admin/:creatorId", protect, authorize("admin"), async (req, res, next) => {
  try {
    const creator = await Creator.findById(req.params.creatorId).populate("user", "name email phone");
    if (!creator) return res.status(404).json({ success: false, message: "Creator not found" });
    const transactions = await CreatorWalletTransaction.find({ creator: creator._id }).sort("-createdAt").limit(100);
    const withdrawals = await CreatorWithdrawal.find({ creator: creator._id }).sort("-createdAt");
    res.json({ success: true, data: { creator: { _id: creator._id, name: creator.user?.name, walletBalance: creator.walletBalance, totalCashbackEarned: creator.totalCashbackEarned, totalWithdrawn: creator.totalWithdrawn }, transactions, withdrawals } });
  } catch (e) { next(e); }
});

// ═══ ADMIN: Manual credit/debit creator wallet ═══
router.post("/admin/:creatorId/adjust", protect, authorize("admin"), async (req, res, next) => {
  try {
    const { amount, type, reason } = req.body;
    if (!amount || !reason) return res.status(400).json({ success: false, message: "Amount and reason required" });
    const creator = await Creator.findById(req.params.creatorId);
    if (!creator) return res.status(404).json({ success: false, message: "Creator not found" });

    const balBefore = creator.walletBalance || 0;
    if (type === "credit" || type === "admin_credit") {
      creator.walletBalance = balBefore + Number(amount);
    } else {
      creator.walletBalance = Math.max(0, balBefore - Number(amount));
    }
    await creator.save();

    await CreatorWalletTransaction.create({
      creator: creator._id, type: type === "credit" ? "admin_credit" : "admin_debit",
      amount: Number(amount), balanceBefore: balBefore, balanceAfter: creator.walletBalance,
      reason, adminId: req.user._id, adminName: req.user.name || "Admin",
    });

    res.json({ success: true, message: `₹${amount} ${type === 'credit' ? 'credited' : 'debited'}`, newBalance: creator.walletBalance });
  } catch (e) { next(e); }
});

// ═══ ADMIN: Get all withdrawals ═══
router.get("/admin/withdrawals/all", protect, authorize("admin"), async (req, res, next) => {
  try {
    const withdrawals = await CreatorWithdrawal.find().populate({ path: "creator", populate: { path: "user", select: "name email" } }).sort("-createdAt");
    res.json({ success: true, data: withdrawals });
  } catch (e) { next(e); }
});

// ═══ ADMIN: Process withdrawal (approve/reject/paid) ═══
router.patch("/admin/withdrawals/:id", protect, authorize("admin"), async (req, res, next) => {
  try {
    const { status, remarks, transactionId } = req.body;
    const withdrawal = await CreatorWithdrawal.findById(req.params.id);
    if (!withdrawal) return res.status(404).json({ success: false, message: "Withdrawal not found" });

    withdrawal.status = status;
    withdrawal.adminId = req.user._id;
    withdrawal.adminRemarks = remarks || "";
    if (transactionId) withdrawal.transactionId = transactionId;
    if (status === "paid" || status === "approved") withdrawal.processedAt = new Date();

    // If rejected, refund to wallet
    if (status === "rejected") {
      const creator = await Creator.findById(withdrawal.creator);
      if (creator) {
        const balBefore = creator.walletBalance || 0;
        creator.walletBalance = balBefore + withdrawal.amount;
        creator.totalWithdrawn = Math.max(0, (creator.totalWithdrawn || 0) - withdrawal.amount);
        await creator.save();
        await CreatorWalletTransaction.create({
          creator: creator._id, type: "admin_credit", amount: withdrawal.amount,
          balanceBefore: balBefore, balanceAfter: creator.walletBalance,
          reason: "Withdrawal rejected - refunded", adminId: req.user._id, adminName: req.user.name,
          referenceId: withdrawal._id.toString(),
        });
      }
    }

    if (status === "paid") {
      const creator = await Creator.findById(withdrawal.creator);
      if (creator) { creator.totalWithdrawn = (creator.totalWithdrawn || 0) + withdrawal.amount; await creator.save(); }
    }

    await withdrawal.save();

    // Notify creator
    try {
      const creator = await Creator.findById(withdrawal.creator);
      const Notification = require("../models/Notification");
      if (creator) {
        const msg = status === "paid" ? `Your withdrawal of ₹${withdrawal.amount} has been processed!` : status === "rejected" ? `Your withdrawal of ₹${withdrawal.amount} was rejected. Amount refunded.` : `Withdrawal status: ${status}`;
        await Notification.create({ user: creator.user, type: "payment", title: status === "paid" ? "✅ Withdrawal Paid" : status === "rejected" ? "❌ Withdrawal Rejected" : "💰 Withdrawal Update", message: msg });
      }
    } catch {}

    res.json({ success: true, data: withdrawal });
  } catch (e) { next(e); }
});

module.exports = router;
