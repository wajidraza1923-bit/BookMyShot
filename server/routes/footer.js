const express = require("express");
const FooterSettings = require("../models/FooterSettings");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

// ═══ PUBLIC: Get footer data ═══
router.get("/", async (req, res, next) => {
  try {
    const settings = await FooterSettings.getSettings();
    if (!settings.enabled) {
      return res.json({ success: true, data: null });
    }
    res.json({ success: true, data: settings });
  } catch (e) { next(e); }
});

// ═══ ADMIN: Get footer settings ═══
router.get("/admin", protect, authorize("admin"), async (req, res, next) => {
  try {
    const settings = await FooterSettings.getSettings();
    res.json({ success: true, data: settings });
  } catch (e) { next(e); }
});

// ═══ ADMIN: Update footer settings ═══
router.put("/admin", protect, authorize("admin"), async (req, res, next) => {
  try {
    const settings = await FooterSettings.updateSettings(req.body);
    res.json({ success: true, data: settings });
  } catch (e) { next(e); }
});

module.exports = router;
