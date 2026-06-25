/**
 * AppVersion — Complete App Update Management
 * Admin controls force update and optional update from website + mobile admin.
 */
const mongoose = require("mongoose");

const appVersionSchema = new mongoose.Schema(
  {
    version: { type: String, required: true },
    versionCode: { type: Number, required: true },
    title: { type: String, default: "" },
    description: { type: String, default: "" },
    releaseNotes: { type: String, default: "" },
    downloadUrl: { type: String, default: "" },
    playStoreUrl: { type: String, default: "" },
    fileSize: { type: Number, default: 0 },
    forceUpdate: { type: Boolean, default: false },
    optionalUpdate: { type: Boolean, default: true },
    published: { type: Boolean, default: true },
    minVersionCode: { type: Number, default: 1 },
  },
  { timestamps: true }
);

appVersionSchema.index({ versionCode: -1 });
appVersionSchema.index({ published: 1, versionCode: -1 });

module.exports = mongoose.model("AppVersion", appVersionSchema);
