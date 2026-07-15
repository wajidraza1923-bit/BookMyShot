const mongoose = require("mongoose");

const footerLinkSchema = new mongoose.Schema({
  label: { type: String, required: true },
  url: { type: String, default: "" },
  screen: { type: String, default: "" }, // For in-app navigation
  enabled: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 },
}, { _id: false });

const footerSettingsSchema = new mongoose.Schema(
  {
    // Branding
    logoUrl: { type: String, default: "" },
    tagline: { type: String, default: "India's Premium Wedding Creator Marketplace" },
    description: { type: String, default: "Book verified photographers, videographers, makeup artists and more. Earn cashback on every booking." },

    // Link sections
    quickLinks: [footerLinkSchema],
    creatorLinks: [footerLinkSchema],
    supportLinks: [footerLinkSchema],

    // Social media
    instagram: { type: String, default: "" },
    facebook: { type: String, default: "" },
    youtube: { type: String, default: "" },
    twitter: { type: String, default: "" },
    linkedin: { type: String, default: "" },

    // App store links
    playStoreUrl: { type: String, default: "" },
    appStoreUrl: { type: String, default: "" },

    // Bottom text
    copyrightText: { type: String, default: "BookMyShot © All Rights Reserved" },
    madeInText: { type: String, default: "Made with ❤️ in India" },

    // Visibility
    enabled: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Single-document pattern
footerSettingsSchema.statics.getSettings = async function () {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({
      quickLinks: [
        { label: "About Us", screen: "Info", url: "", sortOrder: 1 },
        { label: "How It Works", screen: "Info", url: "", sortOrder: 2 },
        { label: "Blog", screen: "Info", url: "", sortOrder: 3 },
        { label: "Careers", screen: "Info", url: "", sortOrder: 4 },
        { label: "Contact Us", screen: "Info", url: "", sortOrder: 5 },
        { label: "FAQ", screen: "Info", url: "", sortOrder: 6 },
      ],
      creatorLinks: [
        { label: "List Your Business", screen: "Account", url: "", sortOrder: 1 },
        { label: "Creator Login", screen: "Account", url: "", sortOrder: 2 },
        { label: "Pricing", screen: "Info", url: "", sortOrder: 3 },
        { label: "Creator Resources", screen: "Info", url: "", sortOrder: 4 },
        { label: "Success Stories", screen: "Info", url: "", sortOrder: 5 },
      ],
      supportLinks: [
        { label: "Help Center", screen: "Info", url: "", sortOrder: 1 },
        { label: "Safety Center", screen: "Info", url: "", sortOrder: 2 },
        { label: "Cancellation Policy", screen: "Info", url: "", sortOrder: 3 },
        { label: "Privacy Policy", screen: "Info", url: "", sortOrder: 4 },
        { label: "Terms & Conditions", screen: "Info", url: "", sortOrder: 5 },
      ],
    });
  }
  return settings;
};

footerSettingsSchema.statics.updateSettings = async function (updates) {
  return this.findOneAndUpdate({}, { $set: updates }, { new: true, upsert: true, runValidators: true });
};

module.exports = mongoose.model("FooterSettings", footerSettingsSchema);
