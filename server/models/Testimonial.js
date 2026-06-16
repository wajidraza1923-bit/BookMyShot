const mongoose = require("mongoose");

const testimonialSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    city: { type: String, default: "" },
    eventType: { type: String, default: "Wedding" },
    rating: { type: Number, default: 5, min: 1, max: 5 },
    review: { type: String, required: true },
    imageUrl: { type: String, default: "" },
    verifiedBooking: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

testimonialSchema.index({ isActive: 1, sortOrder: 1 });

module.exports = mongoose.model("Testimonial", testimonialSchema);
