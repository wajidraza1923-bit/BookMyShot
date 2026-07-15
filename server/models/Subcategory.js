const mongoose = require("mongoose");

const subcategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true },
    parentCategory: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
    parentCategorySlug: { type: String, required: true },
    icon: { type: String, default: "ellipse-outline" },
    imageUrl: { type: String, default: "" },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    description: { type: String, default: "" },
  },
  { timestamps: true }
);

subcategorySchema.index({ parentCategorySlug: 1, isActive: 1, sortOrder: 1 });
subcategorySchema.index({ slug: 1 }, { unique: true });

module.exports = mongoose.model("Subcategory", subcategorySchema);
