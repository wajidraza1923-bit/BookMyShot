const mongoose = require("mongoose");

const liveActivitySchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["inquiry", "booking", "creator_joined", "creator_approved", "review", "portfolio_update"], required: true },
    text: { type: String, required: true },
    icon: { type: String, default: "📸" },
    city: { type: String, default: "" },
  },
  { timestamps: true }
);

// Auto-delete after 7 days
liveActivitySchema.index({ createdAt: 1 }, { expireAfterSeconds: 604800 });

module.exports = mongoose.model("LiveActivity", liveActivitySchema);
