const mongoose = require("mongoose");

const serviceLocationSchema = new mongoose.Schema(
  {
    state: { type: String, required: true },
    district: { type: String, required: true },
    city: { type: String, required: true },
    pincode: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Indexes for fast lookup
serviceLocationSchema.index({ state: 1, district: 1, city: 1 });
serviceLocationSchema.index({ state: 1, isActive: 1 });
serviceLocationSchema.index({ district: 1, isActive: 1 });

module.exports = mongoose.model("ServiceLocation", serviceLocationSchema);
