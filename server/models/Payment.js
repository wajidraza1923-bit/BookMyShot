const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    booking: { type: mongoose.Schema.Types.ObjectId, ref: "Booking" },
    razorpayOrderId: String,
    razorpayPaymentId: String,
    razorpaySignature: String,
    amount: { type: Number, default: 0 },
    currency: { type: String, default: "INR" },
    method: { type: String },
    status: { type: String, enum: ["created", "paid", "failed"], default: "created" },
    meta: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Payment", paymentSchema);
