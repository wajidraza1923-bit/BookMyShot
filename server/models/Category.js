const mongoose = require("mongoose");

// Field definition for dynamic forms
const fieldDefSchema = new mongoose.Schema({
  key: { type: String, required: true },          // e.g. "cameraBrands"
  label: { type: String, required: true },        // e.g. "Camera Brands"
  type: { type: String, enum: ["text", "number", "textarea", "select", "multiselect", "boolean", "price", "tags"], default: "text" },
  options: [String],                              // for select/multiselect
  placeholder: { type: String, default: "" },
  required: { type: Boolean, default: false },
  unit: { type: String, default: "" },            // e.g. "₹", "guests", "vehicles"
}, { _id: false });

// Search filter definition
const filterDefSchema = new mongoose.Schema({
  key: { type: String, required: true },
  label: { type: String, required: true },
  type: { type: String, enum: ["select", "boolean", "range"], default: "select" },
  options: [String],
}, { _id: false });

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    group: { type: String, default: "Other" },            // e.g. "Photography & Video", "Beauty", "Food"
    icon: { type: String, default: "camera-outline" },    // Ionicons name
    imageUrl: { type: String, default: "" },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    // Dynamic form fields for creator registration & profile
    fields: [fieldDefSchema],
    // Dynamic search filters for this category
    searchFilters: [filterDefSchema],
    // Short description shown in listings
    description: { type: String, default: "" },
  },
  { timestamps: true }
);

categorySchema.index({ isActive: 1, sortOrder: 1 });
categorySchema.index({ group: 1 });

module.exports = mongoose.model("Category", categorySchema);
