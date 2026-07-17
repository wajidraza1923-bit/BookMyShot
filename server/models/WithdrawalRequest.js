const mongoose = require("mongoose");

const withdrawalRequestSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    amount: { type: Number, required: true, min: 100 },
    status: { type: String, enum: ["pending", "approved", "paid", "rejected"], default: "pending" },
    // Bank details
    accountHolderName: { type: String, required: true },
    bankAccountNumber: { type: String, required: true },
    ifscCode: { type: String, required: true },
    upiId: { type: String, default: "" },
    // Admin actions
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    approvedAt: { type: Date },
    paidAt: { type: Date },
    utrNumber: { type: String, default: "" },
    paymentDate: { type: Date },
    adminNotes: { type: String, default: "" },
    rejectionReason: { type: String, default: "" },
    rejectedAt: { type: Date },
  },
  { timestamps: true }
);

withdrawalRequestSchema.index({ user: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model("WithdrawalRequest", withdrawalRequestSchema);
