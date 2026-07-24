/**
 * SupportTicket — In-app support system
 */
const mongoose = require("mongoose");

const supportTicketSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    subject: { type: String, required: true },
    message: { type: String, required: true },
    category: { type: String, enum: ["booking", "payment", "technical", "account", "other"], default: "other" },
    priority: { type: String, enum: ["low", "medium", "high", "urgent"], default: "medium" },
    status: { type: String, enum: ["open", "pending", "in-progress", "resolved", "closed"], default: "open" },
    // Admin response
    replies: [{
      message: { type: String, required: true },
      author: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      authorRole: { type: String, enum: ["user", "admin"], default: "admin" },
      createdAt: { type: Date, default: Date.now },
    }],
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    resolvedAt: { type: Date, default: null },
    closedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

supportTicketSchema.index({ user: 1, status: 1, createdAt: -1 });
supportTicketSchema.index({ status: 1, priority: 1 });

module.exports = mongoose.model("SupportTicket", supportTicketSchema);
