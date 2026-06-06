const express = require("express");
const Creator = require("../../models/Creator");
const Commission = require("../../models/Commission");
const SearchBoost = require("../../models/SearchBoost");
const PaymentRecord = require("../../models/PaymentRecord");
const configService = require("../../services/configService");

const router = express.Router();

// GET / - Aggregated platform metrics for dashboard overview
router.get("/", async (req, res, next) => {
  try {
    // Creator counts
    const totalCreators = await Creator.countDocuments();
    const activeCreators = await Creator.countDocuments({ status: "approved" });
    const featuredCreators = await Creator.countDocuments({ featured: true });

    // Revenue calculations
    const subscriptionSettings = await configService.getSubscriptionSettings();
    const monthlyPlanPrice = subscriptionSettings.monthlyPlanPrice || 299;
    const featuredPortfolioPrice = subscriptionSettings.featuredPortfolioPrice || 999;

    // Subscription revenue: active subscription creators × monthly plan price
    const activeSubscriptionCreators = await Creator.countDocuments({
      subscriptionStatus: "active",
    });
    const subscriptionRevenue = activeSubscriptionCreators * monthlyPlanPrice;

    // Commission revenue: sum of commissionAmount where status="paid"
    const commissionResult = await Commission.aggregate([
      { $match: { status: "paid" } },
      { $group: { _id: null, total: { $sum: "$commissionAmount" } } },
    ]);
    const commissionRevenue =
      commissionResult.length > 0 ? commissionResult[0].total : 0;

    // Featured revenue: creators with featuredPaymentStatus="paid" × featured price
    const paidFeaturedCreators = await Creator.countDocuments({
      featuredPaymentStatus: "paid",
    });
    const featuredRevenue = paidFeaturedCreators * featuredPortfolioPrice;

    // Search boost revenue: sum of paymentAmount where paymentStatus="paid"
    const searchBoostResult = await SearchBoost.aggregate([
      { $match: { paymentStatus: "paid" } },
      { $group: { _id: null, total: { $sum: "$paymentAmount" } } },
    ]);
    const searchBoostRevenue =
      searchBoostResult.length > 0 ? searchBoostResult[0].total : 0;

    // Total revenue: sum of all revenue streams
    const totalRevenue =
      subscriptionRevenue + commissionRevenue + featuredRevenue + searchBoostRevenue;

    // Pending counts
    const pendingPayments = await PaymentRecord.countDocuments({ status: "pending" });
    const pendingApprovals = await Creator.countDocuments({ status: "pending" });

    // Currency from platform settings
    const platformSettings = await configService.getPlatformSettings();
    const currency = platformSettings.currency || "INR";

    res.json({
      success: true,
      data: {
        totalCreators,
        activeCreators,
        featuredCreators,
        subscriptionRevenue,
        commissionRevenue,
        featuredRevenue,
        searchBoostRevenue,
        totalRevenue,
        pendingPayments,
        pendingApprovals,
        currency,
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
