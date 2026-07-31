const express = require("express");
const User = require("../models/User");
const WalletTransaction = require("../models/WalletTransaction");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();
router.use(protect, authorize("admin"));

// Safely load CashbackTransaction (may not exist in all deployments)
let CashbackTransaction;
try {
  CashbackTransaction = require("../models/CashbackTransaction");
} catch (e) {
  CashbackTransaction = null;
}

// GET /user/:userId/wallet - Get user wallet overview + transactions
router.get("/user/:userId/wallet", async (req, res, next) => {
  try {
    const user = await User.findById(req.params.userId).select(
      "name email phone walletBalance avatar"
    );
    if (!user)
      return res.status(404).json({ success: false, message: "User not found" });

    const transactions = await WalletTransaction.find({ user: req.params.userId })
      .sort("-createdAt")
      .limit(50);

    let cashbackTxs = [];
    if (CashbackTransaction) {
      try {
        cashbackTxs = await CashbackTransaction.find({ user: req.params.userId })
          .sort("-createdAt")
          .limit(50);
      } catch (e) {
        cashbackTxs = [];
      }
    }

    // Merge wallet transactions + cashback transactions into one timeline
    const mergedTransactions = [
      ...transactions.map(t => ({ ...t.toObject(), source: 'wallet' })),
      ...cashbackTxs.map(t => ({
        _id: t._id,
        type: t.amount > 0 ? 'cashback_credit' : 'cashback_debit',
        amount: Math.abs(t.amount || 0),
        balanceBefore: 0,
        balanceAfter: 0,
        reason: t.notes || `Cashback ${t.status} — ${t.percentage || 0}% of ₹${t.bookingAmount || 0}`,
        status: t.status === 'credited' ? 'completed' : t.status === 'pending' ? 'pending' : 'cancelled',
        createdAt: t.creditedAt || t.createdAt,
        source: 'cashback',
      })),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 50);

    // Calculate totals
    const allTx = await WalletTransaction.find({ user: req.params.userId });
    const totalCredits = allTx
      .filter((t) => t.type.includes("credit"))
      .reduce((s, t) => s + t.amount, 0);
    const totalDebits = allTx
      .filter((t) => t.type.includes("debit"))
      .reduce((s, t) => s + t.amount, 0);
    const totalCashback = (cashbackTxs || [])
      .filter((t) => t.status === "credited")
      .reduce((s, t) => s + (t.amount || 0), 0);
    const pendingCashback = (cashbackTxs || [])
      .filter((t) => t.status === "pending")
      .reduce((s, t) => s + (t.amount || 0), 0);

    res.json({
      success: true,
      data: {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          avatar: user.avatar,
          walletBalance: user.walletBalance || 0,
        },
        stats: {
          walletBalance: user.walletBalance || 0,
          totalCredits: totalCredits + totalCashback,
          totalDebits,
          totalCashback,
          pendingCashback,
        },
        transactions: mergedTransactions,
        cashbackHistory: cashbackTxs || [],
      },
    });
  } catch (e) {
    next(e);
  }
});

// POST /user/:userId/wallet/credit - Credit wallet
router.post("/user/:userId/wallet/credit", async (req, res, next) => {
  try {
    const { amount, reason, type } = req.body;
    if (!amount || amount <= 0)
      return res.status(400).json({ success: false, message: "Valid amount required" });
    if (!reason)
      return res.status(400).json({ success: false, message: "Reason is required" });

    const user = await User.findById(req.params.userId);
    if (!user)
      return res.status(404).json({ success: false, message: "User not found" });

    const balanceBefore = user.walletBalance || 0;
    user.walletBalance = balanceBefore + Number(amount);
    await user.save();

    const tx = await WalletTransaction.create({
      user: user._id,
      type: type || "credit",
      amount: Number(amount),
      balanceBefore,
      balanceAfter: user.walletBalance,
      reason,
      adminId: req.user._id,
      adminName: req.user.name || "Admin",
    });

    res.json({
      success: true,
      message: `₹${amount} credited successfully`,
      transaction: tx,
      newBalance: user.walletBalance,
    });
  } catch (e) {
    next(e);
  }
});

// POST /user/:userId/wallet/debit - Debit wallet
router.post("/user/:userId/wallet/debit", async (req, res, next) => {
  try {
    const { amount, reason, type } = req.body;
    if (!amount || amount <= 0)
      return res.status(400).json({ success: false, message: "Valid amount required" });
    if (!reason)
      return res.status(400).json({ success: false, message: "Reason is required" });

    const user = await User.findById(req.params.userId);
    if (!user)
      return res.status(404).json({ success: false, message: "User not found" });

    const balanceBefore = user.walletBalance || 0;
    user.walletBalance = Math.max(0, balanceBefore - Number(amount));
    await user.save();

    const tx = await WalletTransaction.create({
      user: user._id,
      type: type || "debit",
      amount: Number(amount),
      balanceBefore,
      balanceAfter: user.walletBalance,
      reason,
      adminId: req.user._id,
      adminName: req.user.name || "Admin",
    });

    res.json({
      success: true,
      message: `₹${amount} debited successfully`,
      transaction: tx,
      newBalance: user.walletBalance,
    });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
