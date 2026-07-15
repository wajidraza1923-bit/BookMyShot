const mongoose = require("mongoose");

const platformSettingsSchema = new mongoose.Schema(
  {
    siteName: { type: String, default: "BookMyShot" },
    siteDescription: { type: String, default: "Premium Photography Booking Platform" },
    supportEmail: { type: String, default: "support@bookmyshot.in" },
    supportPhone: { type: String, default: "8492922173" },
    currency: { type: String, default: "INR" },
    maintenanceMode: { type: Boolean, default: false },
    platformStatus: {
      type: String,
      enum: ["active", "maintenance", "offline"],
      default: "active",
    },
    // Cashback percentage shown on Hero section (admin configurable)
    cashbackPercentage: { type: Number, default: 10 },
    // Hero Banner configurable content
    heroTitle: { type: String, default: "Your Dream Wedding," },
    heroTitleAccent: { type: String, default: "More Rewards!" },
    heroSubtitle: { type: String, default: "Book verified wedding creators and get exciting cashback on every successful booking." },
    heroEyebrow: { type: String, default: "CELEBRATE BEAUTIFULLY. SAVE MORE." },
    heroCta1Text: { type: String, default: "Find Creator" },
    heroCta2Text: { type: String, default: "Get Free Quote" },
  },
  { timestamps: true }
);

// Single-document pattern: ensure only one document exists
platformSettingsSchema.statics.getSettings = async function () {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

platformSettingsSchema.statics.updateSettings = async function (updates) {
  const settings = await this.findOneAndUpdate(
    {},
    { $set: updates },
    { new: true, upsert: true, runValidators: true }
  );
  return settings;
};

module.exports = mongoose.model("PlatformSettings", platformSettingsSchema);
