const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    creator: { type: mongoose.Schema.Types.ObjectId, ref: "Creator", required: true },
    booking: { type: mongoose.Schema.Types.ObjectId, ref: "Booking" },
    phone: { type: String, default: "" }, // For guest reviews (10-digit)
    name: { type: String, default: "" }, // Guest reviewer name
    rating: { type: Number, min: 1, max: 5, required: true },
    title: { type: String, default: "" },
    text: { type: String, default: "" },
    approved: { type: Boolean, default: true },
    hidden: { type: Boolean, default: false },
    hiddenBy: { type: String, enum: ["admin", "creator", ""], default: "" },
    reported: { type: Boolean, default: false },
    reportReason: { type: String, default: "" },
  },
  { timestamps: true }
);

// One review per user per creator (for logged-in users)
reviewSchema.index({ user: 1, creator: 1 }, { unique: true, sparse: true });
// One review per phone per creator (for guest users)
reviewSchema.index({ phone: 1, creator: 1 }, { unique: true, sparse: true });
// Query index
reviewSchema.index({ creator: 1, approved: 1, hidden: 1 });

module.exports = mongoose.model("Review", reviewSchema);
