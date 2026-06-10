const mongoose = require("mongoose");

const homepageEnquirySchema = new mongoose.Schema(
  {
    name: { type: String, default: "" },
    email: { type: String, default: "" },
    phone: { type: String, default: "" },
    eventDate: { type: Date },
    eventLocation: { type: String, default: "" },
    eventType: { type: String, default: "General Enquiry" },
    message: { type: String, default: "" },
    budget: { type: Number, default: 0 },
    source: { type: String, default: "homepage" },
    type: { type: String, default: "general_enquiry" },
    status: {
      type: String,
      enum: ["new", "contacted", "closed"],
      default: "new",
    },
    // Optional: if user was logged in
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    adminNotes: { type: String, default: "" },
  },
  { timestamps: true }
);

homepageEnquirySchema.index({ status: 1, createdAt: -1 });
homepageEnquirySchema.index({ source: 1 });

module.exports = mongoose.model("HomepageEnquiry", homepageEnquirySchema);
