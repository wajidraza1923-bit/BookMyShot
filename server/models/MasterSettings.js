const mongoose = require("mongoose");

const masterSettingsSchema = new mongoose.Schema({
  supportEmail: { type: String, default: "bookmyshott@gmail.com" },
  supportPhone: { type: String, default: "8492922173" },
}, { timestamps: true });

module.exports = mongoose.model("MasterSettings", masterSettingsSchema);
