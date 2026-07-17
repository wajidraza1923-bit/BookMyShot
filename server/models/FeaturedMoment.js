const mongoose = require("mongoose");

const featuredMomentSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, default: "" },
    coverImage: { type: String, required: true }, // Cloudinary URL
    coverImagePublicId: { type: String, default: "" }, // Cloudinary public_id for deletion
    galleryImages: [{
      url: { type: String, required: true },
      publicId: { type: String, default: "" },
      sortOrder: { type: Number, default: 0 },
      status: { type: String, enum: ["active", "inactive"], default: "active" },
      uploadedAt: { type: Date, default: Date.now },
    }],
    category: { type: String, required: true },
    creator: { type: mongoose.Schema.Types.ObjectId, ref: "Creator" },
    creatorName: { type: String, default: "" },
    city: { type: String, required: true },
    views: { type: Number, default: 0 },
    likes: { type: Number, default: 0 },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    isFeatured: { type: Boolean, default: true },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

featuredMomentSchema.index({ status: 1, isFeatured: 1, sortOrder: 1 });

module.exports = mongoose.model("FeaturedMoment", featuredMomentSchema);
