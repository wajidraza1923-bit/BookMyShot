const mongoose = require("mongoose");

const bookingEventSchema = new mongoose.Schema(
  {
    booking: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true },
    creator: { type: mongoose.Schema.Types.ObjectId, ref: "Creator", required: true },
    eventName: { type: String, required: true },
    eventDate: { type: Date, required: true },
    startTime: { type: String, default: "" },
    endTime: { type: String, default: "" },
    location: { type: String, default: "" },
    notes: { type: String, default: "" },
    assignedTeam: { type: String, default: "" },
    status: {
      type: String,
      enum: ["upcoming", "in-progress", "completed", "cancelled"],
      default: "upcoming",
    },
  },
  { timestamps: true }
);

bookingEventSchema.index({ booking: 1, eventDate: 1 });
bookingEventSchema.index({ creator: 1, eventDate: 1 });

module.exports = mongoose.model("BookingEvent", bookingEventSchema);
