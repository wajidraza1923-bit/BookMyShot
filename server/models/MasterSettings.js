const mongoose = require("mongoose");

const masterSettingsSchema = new mongoose.Schema({
  supportEmail: { type: String, default: "bookmyshott@gmail.com" },
  supportPhone: { type: String, default: "8492922173" },
  bookingCommission: { type: Number, default: 2.5 },
  cashbackPercentage: { type: Number, default: 2.5 },
  discountPercentage: { type: Number, default: 10 },
  // Subscription Settings
  monthlySubscriptionPrice: { type: Number, default: 499 },
  subscriptionMode: { type: String, enum: ["lead", "booking"], default: "lead" },
  freeMonthlyLimit: { type: Number, default: 3 },
}, { timestamps: true });

module.exports = mongoose.model("MasterSettings", masterSettingsSchema);
