const mongoose = require("mongoose");

const paymentProofSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    booking: { type: mongoose.Schema.Types.ObjectId, ref: "Booking" },
    inquiry: { type: mongoose.Schema.Types.ObjectId, ref: "Inquiry" },
    creator: { type: mongoose.Schema.Types.ObjectId, ref: "Creator", required: true },
    amount: { type: Number, required: true },
    screenshot: { type: String, default: "" },
    transactionId: { type: String, default: "" },
    note: { type: String, default: "" },
    status: {
      type: String,
      enum: ["pending", "verified", "rejected"],
      default: "pending",
    },
    adminNote: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PaymentProof", paymentProofSchema);