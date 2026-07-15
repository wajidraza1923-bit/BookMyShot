const mongoose = require("mongoose");

const cashbackSettingsSchema = new mongoose.Schema(
  {
    enabled: { type: Boolean, default: true },
    percentage: { type: Number, default: 10, min: 0, max: 100 },
    minBookingAmount: { type: Number, default: 1000 },
    maxAmount: { type: Number, default: 5000 },
    title: { type: String, default: "Cashback Offer" },
    subtitle: { type: String, default: "Earn cashback on every successful booking" },
    showBanner: { type: Boolean, default: true },
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
    eligibleCategories: [{ type: String }], // empty = all categories
    eligibleCities: [{ type: String }], // empty = all cities
    termsAndConditions: { type: String, default: "Cashback is credited after successful booking completion. Maximum cashback per booking is capped. Cashback is non-transferable." },
  },
  { timestamps: true }
);

// Single-document pattern
cashbackSettingsSchema.statics.getSettings = async function () {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

cashbackSettingsSchema.statics.updateSettings = async function (updates) {
  return this.findOneAndUpdate({}, { $set: updates }, { new: true, upsert: true, runValidators: true });
};

module.exports = mongoose.model("CashbackSettings", cashbackSettingsSchema);
