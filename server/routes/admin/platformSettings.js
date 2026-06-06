const express = require("express");
const { validatePlatformSettings } = require("../../middleware/validate");
const configService = require("../../services/configService");
const auditService = require("../../services/auditService");
const PlatformSettings = require("../../models/PlatformSettings");

const router = express.Router();

// GET / - Return current platform settings
router.get("/", async (req, res, next) => {
  try {
    const settings = await PlatformSettings.getSettings();
    res.json({ success: true, data: settings });
  } catch (err) {
    next(err);
  }
});

// PUT / - Update platform settings
router.put("/", validatePlatformSettings, async (req, res, next) => {
  try {
    // Fetch previous values before update
    const previous = await PlatformSettings.getSettings();
    const previousValues = previous.toObject
      ? previous.toObject()
      : { ...previous };

    // Persist changes
    const settings = await PlatformSettings.updateSettings(req.body);

    // Invalidate config cache so subsequent reads reflect the update
    configService.invalidateCache("platform");

    // Log the change to audit trail
    await auditService.logAction({
      adminId: req.user._id,
      adminName: req.user.name || "",
      action: "update_platform_settings",
      target: "settings",
      targetId: "platform",
      previousValues,
      newValues: req.body,
      ip: req.ip,
    });

    res.json({ success: true, data: settings });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
