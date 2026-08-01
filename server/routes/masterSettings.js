const express = require("express");
const MasterSettings = require("../models/MasterSettings");
const { protect, authorize } = require("../middleware/auth");
const router = express.Router();

// GET / — Public: fetch global settings (client-safe fields only)
router.get("/", async (req, res, next) => {
  try {
    let settings = await MasterSettings.findOne();
    if (!settings) {
      settings = await MasterSettings.create({});
    }
    // Return only client-needed fields (hide internal business limits)
    res.json({ success: true, data: {
      supportEmail: settings.supportEmail,
      supportPhone: settings.supportPhone,
      bookingCommission: settings.bookingCommission,
      cashbackPercentage: settings.cashbackPercentage,
      discountPercentage: settings.discountPercentage,
      monthlySubscriptionPrice: settings.monthlySubscriptionPrice,
      yearlySubscriptionPrice: settings.yearlySubscriptionPrice,
      subscriptionMode: settings.subscriptionMode,
      freeMonthlyLimit: settings.freeMonthlyLimit,
      freeBookingsLimit: settings.freeBookingsLimit,
      perLeadUnlockPrice: settings.perLeadUnlockPrice,
      cashbackDeadlineDays: settings.cashbackDeadlineDays,
      cashbackEnabled: settings.cashbackEnabled,
      creatorCashbackPercent: settings.creatorCashbackPercent,
      customerCashbackPercent: settings.customerCashbackPercent,
      showGrowthPromotion: settings.showGrowthPromotion !== false,
    }});
  } catch (e) { next(e); }
});

// PUT / — Admin only: update global settings
router.put("/", protect, authorize("admin"), async (req, res, next) => {
  try {
    const { supportEmail, supportPhone, bookingCommission, cashbackPercentage, discountPercentage, monthlySubscriptionPrice, yearlySubscriptionPrice, subscriptionMode, freeMonthlyLimit, freeBookingsLimit, perLeadUnlockPrice, cashbackDeadlineDays, creatorCashbackPercent, customerCashbackPercent, creatorCashbackAutoCredit, cashbackEnabled, minWithdrawalAmount, maxWithdrawalAmount } = req.body;
    let settings = await MasterSettings.findOne();
    if (!settings) settings = new MasterSettings();
    if (supportEmail !== undefined) settings.supportEmail = supportEmail;
    if (supportPhone !== undefined) settings.supportPhone = supportPhone;
    if (bookingCommission !== undefined) settings.bookingCommission = Number(bookingCommission);
    if (cashbackPercentage !== undefined) settings.cashbackPercentage = Number(cashbackPercentage);
    if (discountPercentage !== undefined) settings.discountPercentage = Number(discountPercentage);
    if (monthlySubscriptionPrice !== undefined) settings.monthlySubscriptionPrice = Number(monthlySubscriptionPrice);
    if (yearlySubscriptionPrice !== undefined) settings.yearlySubscriptionPrice = Number(yearlySubscriptionPrice);
    if (subscriptionMode !== undefined) settings.subscriptionMode = subscriptionMode;
    if (freeMonthlyLimit !== undefined) settings.freeMonthlyLimit = Number(freeMonthlyLimit);
    if (freeBookingsLimit !== undefined) settings.freeBookingsLimit = Number(freeBookingsLimit);
    if (perLeadUnlockPrice !== undefined) settings.perLeadUnlockPrice = Number(perLeadUnlockPrice);
    if (cashbackDeadlineDays !== undefined) settings.cashbackDeadlineDays = Number(cashbackDeadlineDays);
    if (creatorCashbackPercent !== undefined) settings.creatorCashbackPercent = Number(creatorCashbackPercent);
    if (customerCashbackPercent !== undefined) settings.customerCashbackPercent = Number(customerCashbackPercent);
    if (creatorCashbackAutoCredit !== undefined) settings.creatorCashbackAutoCredit = creatorCashbackAutoCredit;
    if (cashbackEnabled !== undefined) settings.cashbackEnabled = cashbackEnabled;
    if (minWithdrawalAmount !== undefined) settings.minWithdrawalAmount = Number(minWithdrawalAmount);
    if (maxWithdrawalAmount !== undefined) settings.maxWithdrawalAmount = Number(maxWithdrawalAmount);
    if (req.body.showGrowthPromotion !== undefined) settings.showGrowthPromotion = req.body.showGrowthPromotion;
    await settings.save();
    res.json({ success: true, data: settings, message: "Settings updated successfully" });
  } catch (e) { next(e); }
});

module.exports = router;
