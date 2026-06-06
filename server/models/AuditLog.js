const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    admin: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    adminName: { type: String, default: "" },
    action: { type: String, required: true },
    target: { type: String, default: "" }, // "creator", "booking", "payment", etc.
    targetId: { type: String, default: "" },
    targetType: { type: String, default: "" }, // "creator", "settings", "payment", etc.
    details: { type: String, default: "" },
    previousValues: { type: mongoose.Schema.Types.Mixed, default: null },
    newValues: { type: mongoose.Schema.Types.Mixed, default: null },
    ip: { type: String, default: "" },
  },
  { timestamps: true }
);

auditLogSchema.index({ admin: 1, createdAt: -1 });
auditLogSchema.index({ target: 1, targetId: 1 });

module.exports = mongoose.model("AuditLog", auditLogSchema);
