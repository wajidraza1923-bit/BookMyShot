const mongoose = require("mongoose");

const emailLogSchema = new mongoose.Schema(
  {
    to: { type: String, required: true },
    from: { type: String, default: "BookMyShot <support@bookmyshot.in>" },
    subject: { type: String, required: true },
    type: {
      type: String,
      enum: [
        "otp_verification",
        "otp_password_reset",
        "subscription_activated",
        "subscription_renewed",
        "subscription_expired",
        "subscription_expiry_reminder",
        "payment_success",
        "payment_failed",
        "promotion_activated",
        "admin_new_subscription",
        "admin_payment_success",
        "admin_payment_failed",
        "admin_subscription_expired",
        "admin_promotion_purchase",
        "welcome",
        "other",
      ],
      default: "other",
    },
    status: { type: String, enum: ["sent", "failed", "queued"], default: "queued" },
    resendId: { type: String, default: "" },
    error: { type: String, default: "" },
    // Reference data
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    creator: { type: mongoose.Schema.Types.ObjectId, ref: "Creator" },
    meta: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

emailLogSchema.index({ to: 1, type: 1, createdAt: -1 });
emailLogSchema.index({ status: 1, createdAt: -1 });
emailLogSchema.index({ user: 1 });

module.exports = mongoose.model("EmailLog", emailLogSchema);
