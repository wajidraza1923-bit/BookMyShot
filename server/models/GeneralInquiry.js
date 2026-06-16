const mongoose = require("mongoose");

const generalInquirySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, default: "" },
    city: { type: String, default: "" },
    eventDate: { type: Date },
    category: { type: String, default: "" },
    preferredCreator: { type: mongoose.Schema.Types.ObjectId, ref: "Creator" },
    message: { type: String, default: "" },
    status: { type: String, enum: ["new", "contacted", "assigned", "closed"], default: "new" },
    assignedCreator: { type: mongoose.Schema.Types.ObjectId, ref: "Creator" },
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    assignedAt: { type: Date },
  },
  { timestamps: true }
);

generalInquirySchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model("GeneralInquiry", generalInquirySchema);
