const mongoose = require("mongoose");

const searchBoostSchema = new mongoose.Schema(
  {
    creator: { type: mongoose.Schema.Types.ObjectId, ref: "Creator", required: true },
    boostType: {
      type: String,
      enum: ["top_search", "category_priority", "homepage_spotlight"],
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "active", "expired", "rejected"],
      default: "pending",
    },
    startDate: { type: Date },
    endDate: { type: Date },
    paymentStatus: { type: String, enum: ["pending", "paid", "refunded"], default: "pending" },
    paymentAmount: { type: Number, default: 0 },
    rejectionReason: { type: String, default: "" },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

searchBoostSchema.index({ creator: 1, status: 1 });
searchBoostSchema.index({ endDate: 1, status: 1 });

module.exports = mongoose.model("SearchBoost", searchBoostSchema);
