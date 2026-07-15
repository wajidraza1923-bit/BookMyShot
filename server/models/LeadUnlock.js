const mongoose = require("mongoose");

const leadUnlockSchema = new mongoose.Schema(
  {
    creator: { type: mongoose.Schema.Types.ObjectId, ref: "Creator", required: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    booking: { type: mongoose.Schema.Types.ObjectId, ref: "Booking" },
    isFree: { type: Boolean, default: false }, // true = used free quota
    unlockedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

leadUnlockSchema.index({ creator: 1, customer: 1 }, { unique: true });
leadUnlockSchema.index({ creator: 1, isFree: 1 });

module.exports = mongoose.model("LeadUnlock", leadUnlockSchema);
