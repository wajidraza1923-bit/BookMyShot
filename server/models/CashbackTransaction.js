const mongoose = require("mongoose");

const cashbackTransactionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    booking: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true },
    amount: { type: Number, required: true }, // Cashback amount in INR
    percentage: { type: Number, required: true }, // Percentage applied
    bookingAmount: { type: Number, required: true }, // Original booking amount
    status: {
      type: String,
      enum: ["pending", "credited", "expired", "cancelled"],
      default: "pending",
    },
    creditedAt: { type: Date, default: null },
    expiresAt: { type: Date, default: null },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

cashbackTransactionSchema.index({ user: 1, status: 1, createdAt: -1 });
cashbackTransactionSchema.index({ booking: 1 }, { unique: true });

module.exports = mongoose.model("CashbackTransaction", cashbackTransactionSchema);
