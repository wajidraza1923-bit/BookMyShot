const mongoose = require("mongoose");

const homepageSchema = new mongoose.Schema(
  {
    heroTitle: { type: String, default: "Capture Your Dream Wedding" },
    heroSubtitle: { type: String, default: "Premium wedding photography" },
    heroImage: { type: String, default: "" },
    featuredCreatorIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Creator" }],
    testimonials: [
      {
        name: String,
        event: String,
        text: String,
        avatar: String,
        stars: { type: Number, default: 5 },
      },
    ],
    gallery: [{ url: String, label: String }],
    videoShowcase: [{ url: String, title: String }],
    services: [{ icon: String, title: String, description: String }],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Homepage", homepageSchema);
