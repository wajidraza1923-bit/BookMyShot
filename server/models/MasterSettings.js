const mongoose = require("mongoose");

const masterSettingsSchema = new mongoose.Schema({
  supportEmail: { type: String, default: "bookmyshott@gmail.com" },
  supportPhone: { type: String, default: "8492922173" },
  bookingCommission: { type: Number, default: 2.5 },
  cashbackPercentage: { type: Number, default: 2.5 },
  discountPercentage: { type: Number, default: 10 },
  // Subscription Settings
  monthlySubscriptionPrice: { type: Number, default: 199 },
  yearlySubscriptionPrice: { type: Number, default: 1499 },
  subscriptionMode: { type: String, enum: ["lead", "booking"], default: "lead" },
  freeMonthlyLimit: { type: Number, default: 3 },
  freeBookingsLimit: { type: Number, default: 3 },
  perLeadUnlockPrice: { type: Number, default: 70 },
}, { timestamps: true });

module.exports = mongoose.model("MasterSettings", masterSettingsSchema);
