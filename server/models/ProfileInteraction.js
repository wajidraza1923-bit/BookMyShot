/**
 * ProfileInteraction — Tracks likes, saves, shares, views for creator profiles
 */
const mongoose = require("mongoose");

const profileInteractionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    creator: { type: mongoose.Schema.Types.ObjectId, ref: "Creator", required: true },
    type: { type: String, enum: ["like", "save", "share", "view"], required: true },
  },
  { timestamps: true }
);

// Prevent duplicate likes/saves per user per creator
profileInteractionSchema.index({ user: 1, creator: 1, type: 1 }, { unique: true });
profileInteractionSchema.index({ creator: 1, type: 1 });

module.exports = mongoose.model("ProfileInteraction", profileInteractionSchema);
