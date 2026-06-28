const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    booking: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true, index: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    receiver: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    content: { type: String, required: true, maxlength: 2000 },
    // Delivery status
    delivered: { type: Boolean, default: false },
    read: { type: Boolean, default: false },
    readAt: { type: Date },
    // Message type (for future: image, file, etc.)
    messageType: { type: String, enum: ["text", "image", "system"], default: "text" },
  },
  { timestamps: true }
);

// Index for fast conversation queries
messageSchema.index({ booking: 1, createdAt: 1 });
messageSchema.index({ sender: 1, receiver: 1, booking: 1 });

module.exports = mongoose.model("Message", messageSchema);
