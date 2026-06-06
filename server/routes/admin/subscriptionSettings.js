const express = require("express");
const router = express.Router();
const { validateSubscriptionSettings } = require("../../middleware/validate");
const configService = require("../../services/configService");
const auditService = require("../../services/auditService");
const SubscriptionSettings = require("../../models/SubscriptionSettings");

// GET / - Return current subscription settings
router.get("/", async (req, res, next) => {
  try {
    const settings = await SubscriptionSettings.getSettings();
    res.json({ success: true, data: settings });
  } catch (err) {
    next(err);
  }
});

// PUT / - Update subscription settings
router.put("/", validateSubscriptionSettings, async (req, res, next) => {
  try {
    // Fetch previous values before update
    const previous = await SubscriptionSettings.getSettings();
    const previousValues = previous.toObject
      ? previous.toObject()
      : { ...previous };

    // Persist changes
    const settings = await SubscriptionSettings.updateSettings(req.body);

    // Invalidate the config cache
    configService.invalidateCache("subscription");

    // Log to AuditLog
    await auditService.logAction({
      adminId: req.user._id,
      adminName: req.user.name || "",
      action: "update_subscription_settings",
      target: "settings",
      targetId: "subscription_settings",
      previousValues,
      newValues: settings.toObject ? settings.toObject() : { ...settings },
      ip: req.ip,
    });

    res.json({ success: true, data: settings });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
