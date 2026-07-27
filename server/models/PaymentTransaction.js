const mongoose = require("mongoose");

const paymentTransactionSchema = new mongoose.Schema(
  {
    razorpayPaymentId: { type: String, default: "" },
    razorpayOrderId: { type: String, default: "" },
    razorpaySignature: { type: String, default: "" },
    amount: { type: Number, required: true },
    currency: { type: String, default: "INR" },
    status: {
      type: String,
      enum: ["created", "authorized", "captured", "failed", "refunded"],
      default: "created",
    },
    type: {
      type: String,
      enum: ["booking_fee", "subscription", "commission", "promotion", "lead_unlock", "unknown"],
      default: "unknown",
    },
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", default: null },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    creatorId: { type: mongoose.Schema.Types.ObjectId, ref: "Creator", default: null },
    method: { type: String, default: "" }, // upi, card, netbanking, wallet
    webhookEvent: { type: String, default: "" },
    rawPayload: { type: String, default: "" },
    notes: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

// Index for quick lookups
paymentTransactionSchema.index({ razorpayPaymentId: 1 });
paymentTransactionSchema.index({ bookingId: 1 });
paymentTransactionSchema.index({ customerId: 1 });
paymentTransactionSchema.index({ creatorId: 1 });
paymentTransactionSchema.index({ status: 1, type: 1 });

module.exports = mongoose.model("PaymentTransaction", paymentTransactionSchema);
