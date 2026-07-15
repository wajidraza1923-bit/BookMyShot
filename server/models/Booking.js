const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    creator: { type: mongoose.Schema.Types.ObjectId, ref: "Creator", required: true },
    clientName: { type: String, required: true },
    clientEmail: { type: String, required: true },
    clientPhone: { type: String, required: true },
    eventType: { type: String, required: true },
    eventDate: { type: Date, required: true },
    eventTime: { type: String, default: "" },
    eventLocation: { type: String, default: "" },
    budget: { type: Number, default: 0 },
    highestBudget: { type: Number, default: 0 }, // Never decreases — commission always based on this
    message: { type: String, default: "" },
    status: {
      type: String,
      enum: [
        "Booking Created",
        "Creator Accepted",
        "Payment Submitted",
        "Payment Approved",
        "Event Scheduled",
        "Completed",
        "rejected",
        "cancelled"
      ],
      default: "Booking Created",
    },
    bookingStatus: {
      type: String,
      enum: ["waiting", "confirmed", "in-progress", "completed", "cancelled"],
      default: "waiting",
    },
    paymentStatus: {
      type: String,
      enum: ["unpaid", "partial", "proof-submitted", "pending-verification", "verified", "rejected", "paid"],
      default: "unpaid",
    },
    amount: { type: Number, default: 0 },
    advancePaid: { type: Number, default: 0 },
    remaining: { type: Number, default: 0 },
    creatorNotes: { type: String, default: "" },
    invoiceNumber: { type: String, default: "" },
    // Event scheduling fields (set by creator)
    scheduledDate: { type: Date },
    scheduledTime: { type: String, default: "" },
    scheduledLocation: { type: String, default: "" },
    // Package info
    packageName: { type: String, default: "Standard" },
    // Lead & Commission fields
    leadSource: { type: String, enum: ["bookmyshot", "creator", ""], default: "" },
    commissionPercent: { type: Number, default: 0 },
    commissionAmount: { type: Number, default: 0 },
    creatorReceivable: { type: Number, default: 0 },
    commissionStatus: { type: String, enum: ["pending", "paid", "waived", ""], default: "" },
    commissionLocked: { type: Boolean, default: false },
    commissionLockedAmount: { type: Number, default: 0 },
    // Booking Fee (5% paid by customer to BookMyShot)
    bookingFeePaid: { type: Boolean, default: false },
    bookingFeeAmount: { type: Number, default: 0 },
    bookingFeePaymentId: { type: String, default: "" },
    bookingFeeOrderId: { type: String, default: "" },
    bookingFeePaidAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Booking", bookingSchema);