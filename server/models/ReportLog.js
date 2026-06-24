const mongoose = require("mongoose");

const reportLogSchema = new mongoose.Schema(
  {
    creator: { type: mongoose.Schema.Types.ObjectId, ref: "Creator", required: true },
    creatorName: { type: String, default: "" },
    creatorEmail: { type: String, default: "" },
    type: { type: String, enum: ["monthly", "manual", "live"], default: "monthly" },
    period: { type: String, default: "" },
    status: { type: String, enum: ["sent", "failed", "pending"], default: "pending" },
    error: { type: String, default: "" },
    sentAt: { type: Date },
    sentBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reportData: {
      totalBookings: { type: Number, default: 0 },
      completedBookings: { type: Number, default: 0 },
      cancelledBookings: { type: Number, default: 0 },
      totalEarnings: { type: Number, default: 0 },
      pendingCommission: { type: Number, default: 0 },
      paidCommission: { type: Number, default: 0 },
      totalRevenue: { type: Number, default: 0 },
      subscriptionStatus: { type: String, default: "" },
      promotionStatus: { type: String, default: "" },
    },
  },
  { timestamps: true }
);

reportLogSchema.index({ creator: 1, createdAt: -1 });
reportLogSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model("ReportLog", reportLogSchema);
