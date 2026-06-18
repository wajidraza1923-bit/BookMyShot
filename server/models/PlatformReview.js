const mongoose = require("mongoose");

const platformReviewSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    name: { type: String, required: true },
    rating: { type: Number, min: 1, max: 5, required: true },
    text: { type: String, required: true },
    city: { type: String, default: "" },
    featured: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    addedBy: { type: String, enum: ["user", "admin"], default: "user" },
  },
  { timestamps: true }
);

// One review per user for the platform
platformReviewSchema.index({ user: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model("PlatformReview", platformReviewSchema);
