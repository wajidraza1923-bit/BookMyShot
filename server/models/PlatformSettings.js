const mongoose = require("mongoose");

const platformSettingsSchema = new mongoose.Schema(
  {
    siteName: { type: String, default: "BookMyShot" },
    siteDescription: { type: String, default: "Premium Photography Booking Platform" },
    supportEmail: { type: String, default: "support@bookmyshot.com" },
    supportPhone: { type: String, default: "" },
    currency: { type: String, default: "INR" },
    maintenanceMode: { type: Boolean, default: false },
    platformStatus: {
      type: String,
      enum: ["active", "maintenance", "offline"],
      default: "active",
    },
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
