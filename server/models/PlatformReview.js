const mongoose = require("mongoose");

const platformReviewSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    phone: { type: String, default: "" }, // For guest reviews (10-digit)
    name: { type: String, required: true },
    rating: { type: Number, min: 1, max: 5, required: true },
    text: { type: String, required: true },
    city: { type: String, default: "" },
    featured: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    addedBy: { type: String, enum: ["user", "admin", "guest"], default: "user" },
  },
  { timestamps: true }
);

// One review per user for the platform (logged-in)
platformReviewSchema.index({ user: 1 }, { unique: true, sparse: true });
// One review per phone for the platform (guest)
platformReviewSchema.index({ phone: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model("PlatformReview", platformReviewSchema);
