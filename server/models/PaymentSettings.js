const mongoose = require("mongoose");

const paymentSettingsSchema = new mongoose.Schema(
  {
    upiId: { type: String, default: "" },
    accountHolderName: { type: String, default: "" },
    qrImage: { type: String, default: "" },
    qrImagePublicId: { type: String, default: "" },
  },
  { timestamps: true }
);

// Single-document pattern
paymentSettingsSchema.statics.getSettings = async function () {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

paymentSettingsSchema.statics.updateSettings = async function (updates) {
  const settings = await this.findOneAndUpdate(
    {},
    { $set: updates },
    { new: true, upsert: true, runValidators: true }
  );
  return settings;
};

module.exports = mongoose.model("PaymentSettings", paymentSettingsSchema);
