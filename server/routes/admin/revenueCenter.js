const express = require("express");
const Creator = require("../../models/Creator");
const Commission = require("../../models/Commission");
const SearchBoost = require("../../models/SearchBoost");
const configService = require("../../services/configService");

const router = express.Router();

/**
 * Calculate the start date for a given period.
 * @param {string} period - One of "today", "week", "month", "year"
 * @returns {{ startDate: Date, endDate: Date }}
 */
function getDateRange(period) {
  const now = new Date();
  let startDate;

  switch (period) {
    case "today": {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    }
    case "week": {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    }
    case "year": {
      startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      break;
    }
    case "month":
    default: {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    }
  }

  return { startDate, endDate: now };
}

// GET / - Revenue breakdown by period
router.get("/", async (req, res, next) => {
  try {
    const period = req.query.period || "month";
    const { startDate, endDate } = getDateRange(period);

    // 1. Subscription Revenue: count active creators with lastPaymentDate in period × monthly price
    const subscriptionSettings = await configService.getSubscriptionSettings();
    const monthlyPrice = subscriptionSettings.monthlyPlanPrice || 299;

    const activeSubscribersInPeriod = await Creator.countDocuments({
      subscriptionStatus: "active",
      lastPaymentDate: { $gte: startDate, $lte: endDate },
    });
    const subscriptionRevenue = activeSubscribersInPeriod * monthlyPrice;

    // 2. BMS Lead Commission: sum commissionAmount where leadSource="bookmyshot", status="paid", createdAt in period
    const bmsCommissionResult = await Commission.aggregate([
      {
        $match: {
          leadSource: "bookmyshot",
          status: "paid",
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$commissionAmount" },
        },
      },
    ]);
    const bmsLeadCommissionRevenue =
      bmsCommissionResult.length > 0 ? bmsCommissionResult[0].total : 0;

    // 3. Creator Lead Commission: sum commissionAmount where leadSource="creator", status="paid", createdAt in period
    const creatorCommissionResult = await Commission.aggregate([
      {
        $match: {
          leadSource: "creator",
          status: "paid",
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$commissionAmount" },
        },
      },
    ]);
    const creatorLeadCommissionRevenue =
      creatorCommissionResult.length > 0 ? creatorCommissionResult[0].total : 0;

    // 4. Featured Portfolio Revenue: count creators with featuredPaymentStatus="paid" and featuredStartDate in period × price
    const featuredPortfolioPrice = subscriptionSettings.featuredPortfolioPrice || 999;

    const featuredCreatorsInPeriod = await Creator.countDocuments({
      featuredPaymentStatus: "paid",
      featuredStartDate: { $gte: startDate, $lte: endDate },
    });
    const featuredPortfolioRevenue = featuredCreatorsInPeriod * featuredPortfolioPrice;

    // 5. Search Boost Revenue: sum paymentAmount where paymentStatus="paid" and createdAt in period
    const searchBoostResult = await SearchBoost.aggregate([
      {
        $match: {
          paymentStatus: "paid",
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$paymentAmount" },
        },
      },
    ]);
    const searchBoostRevenue =
      searchBoostResult.length > 0 ? searchBoostResult[0].total : 0;

    // Calculate total platform revenue
    const totalPlatformRevenue =
      subscriptionRevenue +
      bmsLeadCommissionRevenue +
      creatorLeadCommissionRevenue +
      featuredPortfolioRevenue +
      searchBoostRevenue;

    res.json({
      success: true,
      data: {
        period,
        subscriptionRevenue,
        bmsLeadCommissionRevenue,
        creatorLeadCommissionRevenue,
        featuredPortfolioRevenue,
        searchBoostRevenue,
        totalPlatformRevenue,
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
