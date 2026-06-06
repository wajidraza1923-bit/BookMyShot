const mongoose = require("mongoose");

const planningSchema = new mongoose.Schema(
  {
    creator: { type: mongoose.Schema.Types.ObjectId, ref: "Creator", required: true, unique: true },
    eventNotes: { type: String, default: "" },
    cameraChecklist: [{ text: String, done: { type: Boolean, default: false } }],
    lensChecklist: [{ text: String, done: { type: Boolean, default: false } }],
    lightingChecklist: [{ text: String, done: { type: Boolean, default: false } }],
    teamPlanning: { type: String, default: "" },
    shootTimeline: { type: String, default: "" },
    clientRequirements: { type: String, default: "" },
    travelPlanning: { type: String, default: "" },
    customNotes: { type: String, default: "" },
    lastAutoSave: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Planning", planningSchema);
