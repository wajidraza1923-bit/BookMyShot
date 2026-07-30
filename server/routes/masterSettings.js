const express = require("express");
const MasterSettings = require("../models/MasterSettings");
const { protect, authorize } = require("../middleware/auth");
const router = express.Router();

// GET / — Public: fetch global settings
router.get("/", async (req, res, next) => {
  try {
    let settings = await MasterSettings.findOne();
    if (!settings) {
      settings = await MasterSettings.create({});
    }
    res.json({ success: true, data: settings });
  } catch (e) { next(e); }
});

// PUT / — Admin only: update global settings
router.put("/", protect, authorize("admin"), async (req, res, next) => {
  try {
    const { supportEmail, supportPhone, bookingCommission, cashbackPercentage, discountPercentage, monthlySubscriptionPrice, subscriptionMode, freeMonthlyLimit } = req.body;
    let settings = await MasterSettings.findOne();
    if (!settings) settings = new MasterSettings();
    if (supportEmail !== undefined) settings.supportEmail = supportEmail;
    if (supportPhone !== undefined) settings.supportPhone = supportPhone;
    if (bookingCommission !== undefined) settings.bookingCommission = Number(bookingCommission);
    if (cashbackPercentage !== undefined) settings.cashbackPercentage = Number(cashbackPercentage);
    if (discountPercentage !== undefined) settings.discountPercentage = Number(discountPercentage);
    if (monthlySubscriptionPrice !== undefined) settings.monthlySubscriptionPrice = Number(monthlySubscriptionPrice);
    if (subscriptionMode !== undefined) settings.subscriptionMode = subscriptionMode;
    if (freeMonthlyLimit !== undefined) settings.freeMonthlyLimit = Number(freeMonthlyLimit);
    await settings.save();
    res.json({ success: true, data: settings, message: "Settings updated successfully" });
  } catch (e) { next(e); }
});

module.exports = router;
