const mongoose = require("mongoose");

const districtSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    state: { type: String, default: "Jammu & Kashmir" },
    imageUrl: { type: String, default: "" },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

districtSchema.index({ isActive: 1, sortOrder: 1 });

module.exports = mongoose.model("District", districtSchema);
