const mongoose = require("mongoose");

const extensionSchema = new mongoose.Schema({
  daysAdded: { type: Number, required: true },
  previousExpiry: { type: Date },
  newExpiry: { type: Date },
  method: { type: String, enum: ["payment", "admin"], default: "payment" },
  amount: { type: Number, default: 0 },
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  timestamp: { type: Date, default: Date.now },
});

const promotionRequestSchema = new mongoose.Schema(
  {
    creator: { type: mongoose.Schema.Types.ObjectId, ref: "Creator", required: true },
    creatorName: { type: String, default: "" },
    planType: {
      type: String,
      enum: ["homepage_featured", "featured_1", "featured_2", "featured_3", "featured_4", "rank_1", "rank_2", "rank_3", "rank_4"],
      required: true,
    },
    slotNumber: { type: Number, default: 0 },
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
    lastExtendedDate: { type: Date },
    lastPaymentDate: { type: Date },
    totalDaysPurchased: { type: Number, default: 30 },
    extensionHistory: [extensionSchema],
    adminNote: { type: String, default: "" },
  },
  { timestamps: true }
);

promotionRequestSchema.index({ creator: 1, status: 1 });
promotionRequestSchema.index({ expiryDate: 1, status: 1 });

module.exports = mongoose.model("PromotionRequest", promotionRequestSchema);
