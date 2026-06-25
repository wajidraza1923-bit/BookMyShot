/**
 * App Version & Force Update API — Production
 * 
 * PUBLIC (no auth):
 *   GET  /api/app-version          — Mobile checks on every startup
 *   GET  /api/app-version/download — Redirects to latest APK
 * 
 * ADMIN (auth required):
 *   GET  /api/app-version/history  — All versions
 *   POST /api/app-version          — Publish new version (with APK upload)
 *   PUT  /api/app-version/:id      — Edit existing version
 *   DELETE /api/app-version/:id    — Remove version
 */
const express = require("express");
const router = express.Router();
const AppVersion = require("../models/AppVersion");
const { protect, authorize } = require("../middleware/auth");
const { uploadApk } = require("../middleware/upload");

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
      // Standard fields (used by mobile app)
      version: latest.version,
      versionCode: latest.versionCode,
      title: latest.title || "Update Available",
      description: latest.description || "",
      downloadUrl: latest.downloadUrl,
      playStoreUrl: latest.playStoreUrl,
      forceUpdate: latest.forceUpdate,
      optionalUpdate: latest.optionalUpdate,
      minVersionCode: latest.minVersionCode,
      publishedAt: latest.createdAt,
      fileSize: latest.fileSize || 0,
      releaseNotes: latest.releaseNotes || latest.description || "",
      // Snake_case aliases (for external consumers)
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
// PUBLIC: Direct APK download
// ═══════════════════════════════════════════════════════════════
router.get("/download", async (req, res) => {
  try {
    const latest = await AppVersion.findOne({ published: true, downloadUrl: { $ne: "" } }).sort("-versionCode").lean();
    if (!latest || !latest.downloadUrl) {
      return res.status(404).json({ success: false, message: "No APK available" });
    }
    res.redirect(302, latest.downloadUrl);
  } catch (e) {
    res.status(500).json({ success: false, message: "Error" });
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
// ADMIN: Publish new version
// ═══════════════════════════════════════════════════════════════
router.post("/", protect, authorize("admin"), uploadApk.single("apk"), async (req, res) => {
  try {
    const { version, versionCode, title, description, forceUpdate, optionalUpdate, downloadUrl, playStoreUrl, minVersionCode } = req.body;

    if (!version || !versionCode) {
      return res.status(400).json({ success: false, message: "Version name and code are required" });
    }

    const code = parseInt(versionCode);
    const existing = await AppVersion.findOne({ versionCode: code });
    if (existing) {
      return res.status(400).json({ success: false, message: `Version code ${code} already exists` });
    }

    // Upload APK if provided
    let apkUrl = downloadUrl || "";
    let fileSize = 0;
    if (req.file) {
      fileSize = req.file.size || 0;
      try {
        const { uploadBuffer, isConfigured } = require("../services/cloudinaryService");
        if (isConfigured()) {
          const result = await uploadBuffer(req.file.buffer, {
            folder: "bookmyshot/releases",
            resourceType: "raw",
            format: "apk",
            publicId: `bookmyshot-v${version}-code${code}`,
          });
          apkUrl = result.url;
        } else {
          const fs = require("fs");
          const path = require("path");
          const dir = path.join(__dirname, "../../public/releases");
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
          const fname = `bookmyshot-v${version}-${code}.apk`;
          fs.writeFileSync(path.join(dir, fname), req.file.buffer);
          apkUrl = `/releases/${fname}`;
        }
      } catch (err) {
        console.error("[AppVersion] Upload error:", err.message);
      }
    }

    const record = await AppVersion.create({
      version,
      versionCode: code,
      title: title || `BookMyShot v${version}`,
      description: description || "",
      releaseNotes: req.body.releaseNotes || description || "",
      downloadUrl: apkUrl,
      playStoreUrl: playStoreUrl || "",
      fileSize,
      forceUpdate: forceUpdate === "true" || forceUpdate === true,
      optionalUpdate: optionalUpdate !== "false" && optionalUpdate !== false,
      minVersionCode: parseInt(minVersionCode) || 1,
      published: true,
    });

    // Real-time: notify all admin clients about the new version
    try {
      const socketService = require("../services/socketService");
      socketService.emitToRole("admin", "appVersion:published", { version, versionCode: code, downloadUrl: apkUrl, forceUpdate: record.forceUpdate });
    } catch (e) {}

    res.status(201).json({ success: true, message: `v${version} published`, data: record });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// ADMIN: Edit version
// ═══════════════════════════════════════════════════════════════
router.put("/:id", protect, authorize("admin"), uploadApk.single("apk"), async (req, res) => {
  try {
    const record = await AppVersion.findById(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: "Not found" });

    const { version, versionCode, title, description, forceUpdate, optionalUpdate, downloadUrl, playStoreUrl, minVersionCode, published } = req.body;

    if (version) record.version = version;
    if (versionCode) record.versionCode = parseInt(versionCode);
    if (title !== undefined) record.title = title;
    if (description !== undefined) record.description = description;
    if (forceUpdate !== undefined) record.forceUpdate = forceUpdate === "true" || forceUpdate === true;
    if (optionalUpdate !== undefined) record.optionalUpdate = optionalUpdate === "true" || optionalUpdate === true;
    if (downloadUrl) record.downloadUrl = downloadUrl;
    if (playStoreUrl !== undefined) record.playStoreUrl = playStoreUrl;
    if (minVersionCode) record.minVersionCode = parseInt(minVersionCode);
    if (published !== undefined) record.published = published === "true" || published === true;

    if (req.file) {
      try {
        const { uploadBuffer, isConfigured } = require("../services/cloudinaryService");
        if (isConfigured()) {
          const result = await uploadBuffer(req.file.buffer, {
            folder: "bookmyshot/releases",
            resourceType: "raw",
            format: "apk",
            publicId: `bookmyshot-v${record.version}-code${record.versionCode}`,
          });
          record.downloadUrl = result.url;
        } else {
          const fs = require("fs");
          const path = require("path");
          const dir = path.join(__dirname, "../../public/releases");
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
          const fname = `bookmyshot-v${record.version}-${record.versionCode}.apk`;
          fs.writeFileSync(path.join(dir, fname), req.file.buffer);
          record.downloadUrl = `/releases/${fname}`;
        }
      } catch (err) {
        console.error("[AppVersion] Upload error:", err.message);
      }
    }

    await record.save();

    // Real-time sync
    try {
      const socketService = require("../services/socketService");
      socketService.emitToRole("admin", "appVersion:published", { version: record.version, versionCode: record.versionCode, forceUpdate: record.forceUpdate });
    } catch (e) {}

    res.json({ success: true, message: "Updated", data: record });
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
    res.json({ success: true, message: "Deleted" });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

module.exports = router;
