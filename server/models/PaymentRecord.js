const mongoose = require("mongoose");

const paymentRecordSchema = new mongoose.Schema(
  {
    booking: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    creator: { type: mongoose.Schema.Types.ObjectId, ref: "Creator", required: true },
    amount: { type: Number, required: true },
    paymentType: {
      type: String,
      enum: ["advance", "partial", "final", "other", "adjustment", "refund"],
      default: "other",
    },
    notes: { type: String, default: "" },
    proof: { type: String, default: "" },
    addedBy: {
      type: String,
      enum: ["user", "creator", "admin"],
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    rejectionReason: { type: String, default: "" },
  },
  { timestamps: true }
);

paymentRecordSchema.index({ booking: 1, createdAt: -1 });

module.exports = mongoose.model("PaymentRecord", paymentRecordSchema);
