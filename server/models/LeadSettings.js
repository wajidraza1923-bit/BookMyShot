const mongoose = require("mongoose");

const leadSettingsSchema = new mongoose.Schema(
  {
    freeLeadLimit: { type: Number, default: 3 },
    // Lead count mode: "booking" = count on booking creation, "inquiry" = count on inquiry creation
    leadCountMode: { type: String, enum: ["booking", "inquiry"], default: "booking" },
    // Feature toggles
    enableLeadLimit: { type: Boolean, default: true },
    showLeadDashboardCard: { type: Boolean, default: true },
    // Subscription pricing
    monthlyPrice: { type: Number, default: 499 },
    yearlyPrice: { type: Number, default: 4999 },
    subscriptionEnabled: { type: Boolean, default: true },
    benefits: {
      type: [String],
      default: [
        "Unlimited Lead Unlocks",
        "Unlimited Customer Chats",
        "Unlimited Booking Requests",
        "Priority Support",
        "Premium Badge",
      ],
    },
    freePlanBenefits: {
      type: [String],
      default: [
        "3 Free Lead Unlocks",
        "Create Profile & Portfolio",
        "Receive Booking Requests",
        "Basic Chat Access",
      ],
    },
  },
  { timestamps: true }
);

leadSettingsSchema.statics.getSettings = async function () {
  let settings = await this.findOne();
  if (!settings) settings = await this.create({});
  return settings;
};

leadSettingsSchema.statics.updateSettings = async function (updates) {
  return this.findOneAndUpdate({}, { $set: updates }, { new: true, upsert: true, runValidators: true });
};

module.exports = mongoose.model("LeadSettings", leadSettingsSchema);
