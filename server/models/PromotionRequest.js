const mongoose = require("mongoose");

const promotionRequestSchema = new mongoose.Schema(
  {
    creator: { type: mongoose.Schema.Types.ObjectId, ref: "Creator", required: true },
    creatorName: { type: String, default: "" },
    planType: {
      type: String,
      enum: ["homepage_featured", "rank_1", "rank_2", "rank_3", "rank_4"],
      required: true,
    },
    price: { type: Number, default: 0 },
    screenshot: { type: String, default: "" },
    utr: { type: String, default: "" },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "expired"],
      default: "pending",
    },
    requestDate: { type: Date, default: Date.now },
    startDate: { type: Date },
    expiryDate: { type: Date },
    adminNote: { type: String, default: "" },
  },
  { timestamps: true }
);

promotionRequestSchema.index({ creator: 1, status: 1 });
promotionRequestSchema.index({ expiryDate: 1, status: 1 });

module.exports = mongoose.model("PromotionRequest", promotionRequestSchema);
