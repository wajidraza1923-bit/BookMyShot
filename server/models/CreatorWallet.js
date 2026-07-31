const mongoose = require("mongoose");

const creatorWalletTransactionSchema = new mongoose.Schema({
  creator: { type: mongoose.Schema.Types.ObjectId, ref: "Creator", required: true },
  type: { type: String, enum: ["cashback_credit", "withdrawal", "admin_credit", "admin_debit", "adjustment"], required: true },
  amount: { type: Number, required: true },
  balanceBefore: { type: Number, default: 0 },
  balanceAfter: { type: Number, default: 0 },
  reason: { type: String, default: "" },
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: "Booking" },
  customerName: { type: String, default: "" },
  cashbackPercent: { type: Number, default: 0 },
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  adminName: { type: String, default: "" },
  referenceId: { type: String, default: "" },
  status: { type: String, enum: ["completed", "pending", "cancelled"], default: "completed" },
}, { timestamps: true });

creatorWalletTransactionSchema.index({ creator: 1, createdAt: -1 });

module.exports = mongoose.model("CreatorWalletTransaction", creatorWalletTransactionSchema);
