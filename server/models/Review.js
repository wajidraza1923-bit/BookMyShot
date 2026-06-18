const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    creator: { type: mongoose.Schema.Types.ObjectId, ref: "Creator", required: true },
    booking: { type: mongoose.Schema.Types.ObjectId, ref: "Booking" },
    phone: { type: String, default: "" },
    name: { type: String, default: "" },
    // Overall rating
    rating: { type: Number, min: 1, max: 5, required: true },
    title: { type: String, default: "" },
    text: { type: String, default: "" },
    // Detailed ratings
    professionalism: { type: Number, min: 1, max: 5, default: 0 },
    qualityOfWork: { type: Number, min: 1, max: 5, default: 0 },
    communication: { type: Number, min: 1, max: 5, default: 0 },
    valueForMoney: { type: Number, min: 1, max: 5, default: 0 },
    wouldRecommend: { type: Boolean, default: true },
    // Event info
    eventType: { type: String, default: "" },
    // Media
    photos: [{ type: String }],
    videos: [{ type: String }],
    // Moderation
    approved: { type: Boolean, default: true },
    hidden: { type: Boolean, default: false },
    hiddenBy: { type: String, enum: ["admin", "creator", ""], default: "" },
    featured: { type: Boolean, default: false },
    reported: { type: Boolean, default: false },
    reportReason: { type: String, default: "" },
    // Creator reply
    reply: { type: String, default: "" },
    repliedAt: { type: Date },
  },
  { timestamps: true }
);

reviewSchema.index({ user: 1, creator: 1 }, { unique: true, sparse: true });
reviewSchema.index({ phone: 1, creator: 1 }, { unique: true, sparse: true });
reviewSchema.index({ creator: 1, approved: 1, hidden: 1 });

module.exports = mongoose.model("Review", reviewSchema);
