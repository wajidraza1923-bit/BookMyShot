const mongoose = require("mongoose");

const calendarEventSchema = new mongoose.Schema(
  {
    creator: { type: mongoose.Schema.Types.ObjectId, ref: "Creator", required: true },
    type: {
      type: String,
      enum: ["private", "unavailable", "reminder", "booking", "event"],
      required: true,
    },
    title: { type: String, default: "" },
    date: { type: Date, required: true },
    endDate: { type: Date },
    notes: { type: String, default: "" },
    reminder: { type: Boolean, default: false },
    // New fields for personal calendar events
    clientName: { type: String, default: "" },
    functionName: { type: String, default: "" },
    bookingDate: { type: Date },
    eventDate: { type: Date },
    advanceReceived: { type: Number, default: 0 },
    remainingAmount: { type: Number, default: 0 },
    bookingAmount: { type: Number, default: 0 },
    amount: { type: Number, default: 0 },
    category: {
      type: String,
      enum: ["Shoot", "Meeting", "Travel", "Personal", ""],
      default: "Shoot",
    },
    eventType: {
      type: String,
      enum: ["Wedding", "Mehndi", "Haldi", "Lunch", "Reception", "Shoot", "Other", ""],
      default: "",
    },
    location: { type: String, default: "" },
    time: { type: String, default: "" },
    status: {
      type: String,
      enum: ["Upcoming", "Completed", "Cancelled", ""],
      default: "Upcoming",
    },
  },
  { timestamps: true }
);

calendarEventSchema.index({ creator: 1, date: 1 });

module.exports = mongoose.model("CalendarEvent", calendarEventSchema);