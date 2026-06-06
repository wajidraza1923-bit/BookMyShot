const mongoose = require("mongoose");

const commissionSettingsSchema = new mongoose.Schema(
  {
    bmsLeadCommissionPercent: { type: Number, default: 5 },
    creatorLeadCommissionPercent: { type: Number, default: 3 },
    latePaymentFeePercent: { type: Number, default: 2 },
    manualAdjustmentPercent: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Single-document pattern: ensure only one document exists
commissionSettingsSchema.statics.getSettings = async function () {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

commissionSettingsSchema.statics.updateSettings = async function (updates) {
  const settings = await this.findOneAndUpdate(
    {},
    { $set: updates },
    { new: true, upsert: true, runValidators: true }
  );
  return settings;
};

module.exports = mongoose.model("CommissionSettings", commissionSettingsSchema);
