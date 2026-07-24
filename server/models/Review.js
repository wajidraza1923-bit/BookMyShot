/**
 * Review — Verified customer reviews for creators
 * Only customers with completed bookings can leave reviews.
 */
const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    creator: { type: mongoose.Schema.Types.ObjectId, ref: "Creator", required: true },
    booking: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    title: { type: String, default: "" },
    text: { type: String, default: "" },
    photos: [{ type: String }], // Cloudinary URLs
    // Creator reply
    reply: { type: String, default: "" },
    repliedAt: { type: Date, default: null },
    // Moderation
    status: { type: String, enum: ["active", "hidden", "reported", "removed"], default: "active" },
    reportReason: { type: String, default: "" },
    reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    // Helpful votes
    helpfulCount: { type: Number, default: 0 },
    helpfulUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

// One review per user per booking
reviewSchema.index({ user: 1, booking: 1 }, { unique: true });
reviewSchema.index({ creator: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model("Review", reviewSchema);
