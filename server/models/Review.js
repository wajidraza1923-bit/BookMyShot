const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    creator: { type: mongoose.Schema.Types.ObjectId, ref: "Creator", required: true },
    booking: { type: mongoose.Schema.Types.ObjectId, ref: "Booking" },
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

// One review per user per creator
reviewSchema.index({ user: 1, creator: 1 }, { unique: true });
reviewSchema.index({ creator: 1, approved: 1, hidden: 1 });

module.exports = mongoose.model("Review", reviewSchema);
