const express = require("express");
const router = express.Router();
const { validateCommissionSettings } = require("../../middleware/validate");
const configService = require("../../services/configService");
const auditService = require("../../services/auditService");
const CommissionSettings = require("../../models/CommissionSettings");

// GET / - Return current commission settings
router.get("/", async (req, res, next) => {
  try {
    const settings = await CommissionSettings.getSettings();
    res.json({ success: true, data: settings });
  } catch (err) {
    next(err);
  }
});

// PUT / - Update commission settings
router.put("/", validateCommissionSettings, async (req, res, next) => {
  try {
    // Fetch previous values before update
    const previous = await CommissionSettings.getSettings();
    const previousValues = {
      bmsLeadCommissionPercent: previous.bmsLeadCommissionPercent,
      creatorLeadCommissionPercent: previous.creatorLeadCommissionPercent,
      latePaymentFeePercent: previous.latePaymentFeePercent,
      manualAdjustmentPercent: previous.manualAdjustmentPercent,
    };

    // Persist changes
    const settings = await CommissionSettings.updateSettings(req.body);

    // Invalidate config cache
    configService.invalidateCache("commission");

    // Log to audit trail
    await auditService.logAction({
      adminId: req.user._id,
      adminName: req.user.name,
      action: "update_commission_settings",
      target: "settings",
      targetId: settings._id.toString(),
      previousValues,
      newValues: {
        bmsLeadCommissionPercent: settings.bmsLeadCommissionPercent,
        creatorLeadCommissionPercent: settings.creatorLeadCommissionPercent,
        latePaymentFeePercent: settings.latePaymentFeePercent,
        manualAdjustmentPercent: settings.manualAdjustmentPercent,
      },
      ip: req.ip,
    });

    res.json({ success: true, data: settings });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
