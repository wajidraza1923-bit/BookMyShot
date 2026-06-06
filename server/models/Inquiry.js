const mongoose = require("mongoose");

const inquirySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    creator: { type: mongoose.Schema.Types.ObjectId, ref: "Creator", required: true },
    name: { type: String, required: true },
    phone: { type: String, required: true },
    city: { type: String, default: "" },
    eventType: { type: String, required: true },
    eventDate: { type: Date, required: true },
    budget: { type: Number, default: 0 },
    message: { type: String, default: "" },
    status: {
      type: String,
      enum: ["pending", "replied", "accepted", "rejected"],
      default: "pending",
    },
    contactUnlocked: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Inquiry", inquirySchema);