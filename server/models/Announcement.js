const mongoose = require("mongoose");

const announcementSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: {
      type: String,
      enum: ["general", "maintenance", "offer", "subscription_reminder", "emergency"],
      required: true,
    },
    audience: {
      type: String,
      enum: ["all_creators", "all_users", "selected_creators", "selected_users"],
      required: true,
    },
    recipientIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    recipientCount: { type: Number, default: 0 },
    isPopup: { type: Boolean, default: false },
    sentBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Announcement", announcementSchema);
