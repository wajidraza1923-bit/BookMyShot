const mongoose = require("mongoose");

const backupLogSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["daily", "weekly", "manual"], default: "daily" },
    filename: { type: String, required: true },
    status: { type: String, enum: ["in_progress", "completed", "failed"], default: "in_progress" },
    sizeBytes: { type: Number, default: 0 },
    filePath: { type: String, default: "" },
    error: { type: String, default: "" },
    startedAt: { type: Date },
    completedAt: { type: Date },
    triggeredBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("BackupLog", backupLogSchema);
