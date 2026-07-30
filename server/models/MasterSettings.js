const mongoose = require("mongoose");

const masterSettingsSchema = new mongoose.Schema({
  supportEmail: { type: String, default: "bookmyshott@gmail.com" },
  supportPhone: { type: String, default: "8492922173" },
  bookingCommission: { type: Number, default: 2.5 },
  cashbackPercentage: { type: Number, default: 2.5 },
  discountPercentage: { type: Number, default: 10 },
}, { timestamps: true });

module.exports = mongoose.model("MasterSettings", masterSettingsSchema);
