/**
 * CreatorRanking — Single source of truth for all ranking sections
 * 
 * Priority: Paid Promotion > Admin Manual > Automatic (rating-based)
 * Sections: all_creators, best_reviewed, featured, top_creators, trending
 */
const mongoose = require("mongoose");

const creatorRankingSchema = new mongoose.Schema(
  {
    section: {
      type: String,
      enum: ["all_creators", "best_reviewed", "featured", "top_creators", "trending"],
      required: true,
    },
    position: { type: Number, required: true }, // 1, 2, 3, 4...
    creator: { type: mongoose.Schema.Types.ObjectId, ref: "Creator", required: true },
    source: {
      type: String,
      enum: ["promotion", "admin_manual", "automatic"],
      default: "admin_manual",
    },
    // If source is "promotion", link to the PromotionRequest
    promotionId: { type: mongoose.Schema.Types.ObjectId, ref: "PromotionRequest", default: null },
    promotionExpiry: { type: Date, default: null },
    // Admin notes
    note: { type: String, default: "" },
    setBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

// Unique: one creator can only hold one position per section
creatorRankingSchema.index({ section: 1, position: 1 }, { unique: true });
creatorRankingSchema.index({ section: 1, creator: 1 }, { unique: true });

module.exports = mongoose.model("CreatorRanking", creatorRankingSchema);
