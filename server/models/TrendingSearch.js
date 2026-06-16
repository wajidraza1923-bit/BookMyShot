const mongoose = require("mongoose");

const trendingSearchSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    icon: { type: String, default: "📷" },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("TrendingSearch", trendingSearchSchema);
