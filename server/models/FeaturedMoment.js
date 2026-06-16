const mongoose = require("mongoose");

const featuredMomentSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    location: { type: String, default: "" },
    imageUrl: { type: String, required: true },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

featuredMomentSchema.index({ isActive: 1, sortOrder: 1 });

module.exports = mongoose.model("FeaturedMoment", featuredMomentSchema);
