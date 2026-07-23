const mongoose = require("mongoose");

const leadSettingsSchema = new mongoose.Schema(
  {
    // ═══ BUSINESS MODEL SETTINGS (Admin Controlled) ═══
    // Unlock mode: "booking" = count bookings, "lead" = count inquiries
    leadCountMode: { type: String, enum: ["booking", "lead"], default: "booking" },
    // Free quota
    freeLeadLimit: { type: Number, default: 3 },
    // Per-lead unlock price (₹)
    leadUnlockPrice: { type: Number, default: 70 },
    // Monthly subscription price (₹)
    monthlyPrice: { type: Number, default: 199 },
    yearlyPrice: { type: Number, default: 1999 },
    // Toggles
    enableLeadLimit: { type: Boolean, default: true },
    enablePerLeadPurchase: { type: Boolean, default: true },
    enableSubscription: { type: Boolean, default: true },
    showLeadDashboardCard: { type: Boolean, default: true },
    subscriptionEnabled: { type: Boolean, default: true },
    // Benefits lists
    benefits: {
      type: [String],
      default: [
        "Unlimited Leads",
        "Unlimited Bookings",
        "Full Customer Details",
        "Better Visibility",
        "Higher Search Ranking",
        "Premium Badge",
      ],
    },
    freePlanBenefits: {
      type: [String],
      default: [
        "3 Free Bookings/Leads",
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
