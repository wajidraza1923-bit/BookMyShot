/**
 * App Version & Download Management
 * - GET /api/app-version — returns current version info (mobile checks this on startup)
 * - PUT /api/app-version — admin updates version info
 * - GET /api/app-version/download — redirects to latest APK
 */
const express = require("express");
const router = express.Router();

// In-memory version state (initialized with defaults, can be updated via PUT)
const CURRENT_VERSION = {
  version: "2.0.0",
  versionCode: 1,
  minVersion: "2.0.0",
  minVersionCode: 1,
  releaseNotes: "Initial release — Book verified wedding creators across India",
  downloadUrl: "https://expo.dev/artifacts/eas/NitjZjSGB4Dlb8xZdawVQ8ueAbpJktqHwzlYXV9tjB8.apk",
  playStoreUrl: "",
  forceUpdate: false,
  updateMessage: "A new version of BookMyShot is available with exciting new features!",
};

// GET /api/app-version — check for updates
router.get("/", (req, res) => {
  res.json({ success: true, ...CURRENT_VERSION });
});

// GET /api/app-version/download — direct download redirect
router.get("/download", (req, res) => {
  const url = CURRENT_VERSION.playStoreUrl || CURRENT_VERSION.downloadUrl;
  if (!url) return res.status(404).json({ success: false, message: "No download URL configured" });
  res.redirect(302, url);
});

// PUT /api/app-version — admin updates version info
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
  res.json({ success: true, message: "Version updated", ...CURRENT_VERSION });
});

module.exports = router;
