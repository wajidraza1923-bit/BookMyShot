const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    description: { type: String, default: '' },
    featured: { type: Boolean, default: false },
    slug: { type: String, unique: true, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Category', categorySchema);
