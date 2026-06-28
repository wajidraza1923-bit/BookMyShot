/**
 * App Version & Update API — GitHub Releases Based
 * 
 * PUBLIC (no auth):
 *   GET  /api/app-version          — Mobile checks on every startup
 *   GET  /api/app-version/download — Redirects to latest APK (GitHub Release URL)
 * 
 * ADMIN (auth required):
 *   GET  /api/app-version/history  — All published versions
 *   POST /api/app-version/publish  — Publish new version (GitHub Release URL + metadata)
 *   PUT  /api/app-version/:id      — Edit existing version
 *   DELETE /api/app-version/:id    — Remove version
 */
const express = require("express");
const router = express.Router();
const AppVersion = require("../models/AppVersion");
const { protect, authorize } = require("../middleware/auth");

// ═══════════════════════════════════════════════════════════════
// PUBLIC: Mobile app calls this on EVERY startup
// Returns the latest published version. Mobile compares versionCode.
// ═══════════════════════════════════════════════════════════════
router.get("/", async (req, res) => {
  try {
    const latest = await AppVersion.findOne({ published: true }).sort("-versionCode").lean();
    if (!latest) {
      return res.json({ success: true, versionCode: 0, forceUpdate: false, optionalUpdate: false });
    }
    res.json({
      success: true,
      version: latest.version,
      versionCode: latest.versionCode,
      title: latest.title || "Update Available",
      description: latest.description || "",
      downloadUrl: latest.downloadUrl,
      forceUpdate: latest.forceUpdate,
      optionalUpdate: latest.optionalUpdate,
      minVersionCode: latest.minVersionCode,
      publishedAt: latest.createdAt,
      releaseNotes: latest.releaseNotes || latest.description || "",
      // Aliases for compatibility
      latest_version: latest.version,
      version_code: latest.versionCode,
      force_update: latest.forceUpdate,
      optional_update: latest.optionalUpdate,
      apk_url: latest.downloadUrl,
      release_notes: latest.releaseNotes || latest.description || "",
    });
  } catch (e) {
    res.json({ success: true, versionCode: 0, forceUpdate: false, optionalUpdate: false });
  }
});

// ═══════════════════════════════════════════════════════════════
// PUBLIC: Redirect to latest APK download (GitHub Release URL)
// Used by website "Download App" button
// ═══════════════════════════════════════════════════════════════
router.get("/download", async (req, res) => {
  try {
    const latest = await AppVersion.findOne({ published: true, downloadUrl: { $ne: "" } }).sort("-versionCode").lean();
    if (!latest || !latest.downloadUrl) {
      return res.status(404).json({ success: false, message: "No APK available. Please check back later." });
    }
    res.redirect(302, latest.downloadUrl);
  } catch (e) {
    res.status(500).json({ success: false, message: "Error fetching download link" });
  }
});

// ═══════════════════════════════════════════════════════════════
// ADMIN: Version history
// ═══════════════════════════════════════════════════════════════
router.get("/history", protect, authorize("admin"), async (req, res) => {
  try {
    const versions = await AppVersion.find().sort("-versionCode").lean();
    res.json({ success: true, versions });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// ADMIN: Publish new version (GitHub Release URL + metadata only)
// No file upload — admin pastes the GitHub Release APK URL
// ═══════════════════════════════════════════════════════════════
router.post("/publish", protect, authorize("admin"), async (req, res) => {
  try {
    const { version, versionCode, title, description, downloadUrl, forceUpdate, optionalUpdate, minVersionCode } = req.body;

    // Validation
    if (!version || !versionCode) {
      return res.status(400).json({ success: false, message: "Version name and version code are required" });
    }
    if (!downloadUrl || !downloadUrl.trim()) {
      return res.status(400).json({ success: false, message: "APK Download URL is required. Upload APK to GitHub Releases and paste the direct download link." });
    }

    const code = parseInt(versionCode);
    if (isNaN(code) || code < 1) {
      return res.status(400).json({ success: false, message: "Version code must be a positive number" });
    }

    // Check duplicates
    const existingCode = await AppVersion.findOne({ versionCode: code });
    if (existingCode) {
      return res.status(400).json({ success: false, message: `Version code ${code} already exists. Use a higher number.` });
    }
    const existingName = await AppVersion.findOne({ version: version.trim() });
    if (existingName) {
      return res.status(400).json({ success: false, message: `Version "${version}" already exists.` });
    }

    // Check version code is greater than latest
    const latest = await AppVersion.findOne({ published: true }).sort("-versionCode").lean();
    if (latest && code <= latest.versionCode) {
      return res.status(400).json({ success: false, message: `Version code must be greater than current (${latest.versionCode}). Use ${latest.versionCode + 1} or higher.` });
    }

    const record = await AppVersion.create({
      version: version.trim(),
      versionCode: code,
      title: title || `BookMyShot v${version}`,
      description: description || "",
      releaseNotes: description || "",
      downloadUrl: downloadUrl.trim(),
      forceUpdate: forceUpdate === "true" || forceUpdate === true,
      optionalUpdate: optionalUpdate !== "false" && optionalUpdate !== false,
      minVersionCode: parseInt(minVersionCode) || 1,
      published: true,
    });

    // Real-time notify admin panel
    try {
      const socketService = require("../services/socketService");
      socketService.emitToRole("admin", "appVersion:published", {
        version: record.version,
        versionCode: code,
        downloadUrl: record.downloadUrl,
        forceUpdate: record.forceUpdate,
      });
    } catch (e) {}

    // Push notification to all app users
    try {
      const pushService = require("../services/pushService");
      const updateTitle = record.forceUpdate ? "🔴 Critical App Update Required" : "📲 App Update Available";
      const updateBody = record.forceUpdate
        ? `BookMyShot v${version} is required. Please update now for continued access.`
        : `BookMyShot v${version} is available with new features and improvements. Update now!`;
      await pushService.broadcast(updateTitle, updateBody, { type: "app_update", targetScreen: "Settings" });
    } catch (e) { console.log("[AppVersion] Push broadcast failed (non-fatal):", e.message); }

    console.log(`[AppVersion] ✅ Published v${version} (code ${code}) — ${downloadUrl}`);
    res.status(201).json({ success: true, message: `v${version} published successfully!`, data: record });
  } catch (e) {
    console.error("[AppVersion] Publish error:", e.message);
    res.status(500).json({ success: false, message: e.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// ADMIN: Edit existing version
// ═══════════════════════════════════════════════════════════════
router.put("/:id", protect, authorize("admin"), async (req, res) => {
  try {
    const record = await AppVersion.findById(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: "Version not found" });

    const { version, versionCode, title, description, forceUpdate, optionalUpdate, downloadUrl, minVersionCode, published } = req.body;

    if (version) record.version = version;
    if (versionCode) record.versionCode = parseInt(versionCode);
    if (title !== undefined) record.title = title;
    if (description !== undefined) { record.description = description; record.releaseNotes = description; }
    if (forceUpdate !== undefined) record.forceUpdate = forceUpdate === "true" || forceUpdate === true;
    if (optionalUpdate !== undefined) record.optionalUpdate = optionalUpdate === "true" || optionalUpdate === true;
    if (downloadUrl) record.downloadUrl = downloadUrl;
    if (minVersionCode) record.minVersionCode = parseInt(minVersionCode);
    if (published !== undefined) record.published = published === "true" || published === true;

    await record.save();

    try {
      const socketService = require("../services/socketService");
      socketService.emitToRole("admin", "appVersion:published", { version: record.version, versionCode: record.versionCode, forceUpdate: record.forceUpdate });
    } catch (e) {}

    res.json({ success: true, message: "Version updated", data: record });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// ADMIN: Delete version
// ═══════════════════════════════════════════════════════════════
router.delete("/:id", protect, authorize("admin"), async (req, res) => {
  try {
    await AppVersion.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Version deleted" });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

module.exports = router;
