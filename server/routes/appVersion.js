/**
 * App Version Check — Returns current app version + update info
 * Mobile app checks this on startup to show update prompts
 */
const express = require("express");
const router = express.Router();

// Current app version — update this when you deploy a new APK
const CURRENT_VERSION = {
  version: "2.0.0",
  versionCode: 1,
  minVersion: "2.0.0",
  minVersionCode: 1,
  releaseNotes: "Initial release — Book verified wedding creators across India",
  downloadUrl: "https://bookmyshot.in/releases/bookmyshot-latest.apk",
  playStoreUrl: "",
  forceUpdate: false,
  updateMessage: "A new version of BookMyShot is available with exciting new features!",
};

// GET /api/app-version — check for updates
router.get("/", (req, res) => {
  res.json({ success: true, ...CURRENT_VERSION });
});

// Admin can update version info
router.put("/", (req, res) => {
  const { version, versionCode, minVersion, minVersionCode, releaseNotes, downloadUrl, playStoreUrl, forceUpdate, updateMessage } = req.body;
  if (version) CURRENT_VERSION.version = version;
  if (versionCode) CURRENT_VERSION.versionCode = versionCode;
  if (minVersion) CURRENT_VERSION.minVersion = minVersion;
  if (minVersionCode) CURRENT_VERSION.minVersionCode = minVersionCode;
  if (releaseNotes) CURRENT_VERSION.releaseNotes = releaseNotes;
  if (downloadUrl) CURRENT_VERSION.downloadUrl = downloadUrl;
  if (playStoreUrl) CURRENT_VERSION.playStoreUrl = playStoreUrl;
  if (forceUpdate !== undefined) CURRENT_VERSION.forceUpdate = forceUpdate;
  if (updateMessage) CURRENT_VERSION.updateMessage = updateMessage;
  res.json({ success: true, ...CURRENT_VERSION });
});

module.exports = router;
