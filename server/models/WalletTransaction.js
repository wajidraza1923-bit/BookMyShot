const mongoose = require("mongoose");

const walletTransactionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: {
      type: String,
      enum: ["credit", "debit", "cashback_credit", "cashback_debit", "bonus_credit", "bonus_debit"],
      required: true,
    },
    amount: { type: Number, required: true },
    balanceBefore: { type: Number, default: 0 },
    balanceAfter: { type: Number, default: 0 },
    reason: { type: String, default: "" },
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    adminName: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("WalletTransaction", walletTransactionSchema);
