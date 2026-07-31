const mongoose = require("mongoose");

const creatorWithdrawalSchema = new mongoose.Schema({
  creator: { type: mongoose.Schema.Types.ObjectId, ref: "Creator", required: true },
  amount: { type: Number, required: true },
  status: { type: String, enum: ["pending", "approved", "rejected", "paid"], default: "pending" },
  // Bank details
  accountHolderName: { type: String, default: "" },
  bankName: { type: String, default: "" },
  accountNumber: { type: String, default: "" },
  ifscCode: { type: String, default: "" },
  upiId: { type: String, default: "" },
  note: { type: String, default: "" },
  // Admin processing
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  adminRemarks: { type: String, default: "" },
  transactionId: { type: String, default: "" },
  processedAt: { type: Date },
}, { timestamps: true });

creatorWithdrawalSchema.index({ creator: 1, status: 1 });

module.exports = mongoose.model("CreatorWithdrawal", creatorWithdrawalSchema);
