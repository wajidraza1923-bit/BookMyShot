const mongoose = require("mongoose");

const subscriptionPaymentSchema = new mongoose.Schema(
  {
    creator: { type: mongoose.Schema.Types.ObjectId, ref: "Creator", required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    amount: { type: Number, required: true },
    screenshot: { type: String, default: "" },
    utr: { type: String, default: "" },
    note: { type: String, default: "" },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    adminNote: { type: String, default: "" },
    // Period this payment covers
    periodStart: { type: Date },
    periodEnd: { type: Date },
    type: { type: String, enum: ["subscription", "commission"], default: "subscription" },
  },
  { timestamps: true }
);

subscriptionPaymentSchema.index({ creator: 1, status: 1 });
subscriptionPaymentSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model("SubscriptionPayment", subscriptionPaymentSchema);
