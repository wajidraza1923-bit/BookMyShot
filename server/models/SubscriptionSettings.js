const mongoose = require("mongoose");

const subscriptionSettingsSchema = new mongoose.Schema(
  {
    monthlyPlanPrice: { type: Number, default: 299 },
    yearlyPlanPrice: { type: Number, default: 2999 },
    trialDays: { type: Number, default: 30 },
    freeTrialEnabled: { type: Boolean, default: true },
    autoRenewDefault: { type: Boolean, default: true },
    gracePeriodDays: { type: Number, default: 7 },
    featuredPortfolioPrice: { type: Number, default: 999 },
    searchBoostPrice: { type: Number, default: 499 },
    homepageFeaturedPrice: { type: Number, default: 1499 },
    rank1Price: { type: Number, default: 1999 },
    rank2Price: { type: Number, default: 1499 },
    rank3Price: { type: Number, default: 999 },
    rank4Price: { type: Number, default: 799 },
  },
  { timestamps: true }
);

// Single-document pattern: ensure only one document exists
subscriptionSettingsSchema.statics.getSettings = async function () {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

subscriptionSettingsSchema.statics.updateSettings = async function (updates) {
  const settings = await this.findOneAndUpdate(
    {},
    { $set: updates },
    { new: true, upsert: true, runValidators: true }
  );
  return settings;
};

module.exports = mongoose.model("SubscriptionSettings", subscriptionSettingsSchema);
