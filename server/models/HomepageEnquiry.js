const mongoose = require("mongoose");

const homepageEnquirySchema = new mongoose.Schema(
  {
    // Contact info
    name: { type: String, default: "" },
    email: { type: String, default: "" },
    phone: { type: String, default: "" },
    // Event details
    eventDate: { type: Date },
    eventLocation: { type: String, default: "" },
    eventType: { type: String, default: "General Enquiry" },
    eventCity: { type: String, default: "" },
    venueName: { type: String, default: "" },
    budget: { type: Number, default: 0 },
    budgetRange: { type: String, default: "" },
    guestCount: { type: String, default: "" },
    specialRequirements: { type: String, default: "" },
    message: { type: String, default: "" },
    // Source tracking
    source: { type: String, default: "homepage" },
    type: { type: String, default: "general_enquiry" },
    // Creator selection (user picks from marketplace)
    selectedCreator: { type: mongoose.Schema.Types.ObjectId, ref: "Creator" },
    selectedCreatorName: { type: String, default: "" },
    // Status
    status: {
      type: String,
      enum: ["new", "contacted", "forwarded", "closed"],
      default: "new",
    },
    // Forward tracking
    forwardedTo: { type: mongoose.Schema.Types.ObjectId, ref: "Creator" },
    forwardedAt: { type: Date },
    forwardedBookingId: { type: mongoose.Schema.Types.ObjectId, ref: "Booking" },
    // Optional: logged-in user
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    adminNotes: { type: String, default: "" },
  },
  { timestamps: true }
);

homepageEnquirySchema.index({ status: 1, createdAt: -1 });
homepageEnquirySchema.index({ source: 1 });
homepageEnquirySchema.index({ selectedCreator: 1 });

module.exports = mongoose.model("HomepageEnquiry", homepageEnquirySchema);
