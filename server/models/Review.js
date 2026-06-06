const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    creator: { type: mongoose.Schema.Types.ObjectId, ref: "Creator", required: true },
    rating: { type: Number, min: 1, max: 5, required: true },
    title: String,
    text: String,
    approved: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Review", reviewSchema);
