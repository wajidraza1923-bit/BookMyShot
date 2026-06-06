const mongoose = require("mongoose");

const weddingPackageSchema = new mongoose.Schema(
  {
    creator: { type: mongoose.Schema.Types.ObjectId, ref: "Creator", required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    currency: { type: String, default: "INR" },
    description: String,
    features: [String],
    eventTypes: [String],
    isFeatured: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("WeddingPackage", weddingPackageSchema);
