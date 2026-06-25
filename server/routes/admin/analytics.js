/**
 * Admin Analytics — Complete Earnings & Revenue Dashboard
 * All data from live MongoDB — no hardcoded values
 */
const express = require("express");
const router = express.Router();
const Creator = require("../../models/Creator");
const Booking = require("../../models/Booking");
const Commission = require("../../models/Commission");
const PaymentRecord = require("../../models/PaymentRecord");
const PaymentProof = require("../../models/PaymentProof");
const configService = require("../../services/configService");

// GET / — Complete analytics dashboard data
router.get("/", async (req, res, next) => {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart); weekStart.setDate(weekStart.getDate() - 7);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const yearStart = new Date(now.getFullYear(), 0, 1);

    const subSettings = await configService.getSubscriptionSettings();
    const monthlyPrice = subSettings.monthlyPlanPrice || 299;

    // ═══ REVENUE ═══
    const allBookings = await Booking.find({}).lean();
    const completedBookings = allBookings.filter(b => b.status === "Completed");
    const lifetimeRevenue = allBookings.reduce((s, b) => s + (b.amount || b.budget || 0), 0);
    const todayRevenue = allBookings.filter(b => new Date(b.createdAt) >= todayStart).reduce((s, b) => s + (b.amount || b.budget || 0), 0);
    const weekRevenue = allBookings.filter(b => new Date(b.createdAt) >= weekStart).reduce((s, b) => s + (b.amount || b.budget || 0), 0);
    const monthRevenue = allBookings.filter(b => new Date(b.createdAt) >= monthStart).reduce((s, b) => s + (b.amount || b.budget || 0), 0);
    const yearRevenue = allBookings.filter(b => new Date(b.createdAt) >= yearStart).reduce((s, b) => s + (b.amount || b.budget || 0), 0);

    // Averages
    const daysSinceFirst = allBookings.length > 0 ? Math.max(1, Math.ceil((now - new Date(allBookings[allBookings.length - 1]?.createdAt || now)) / 86400000)) : 1;
    const avgDaily = Math.round(lifetimeRevenue / daysSinceFirst);
    const avgMonthly = Math.round(lifetimeRevenue / Math.max(1, Math.ceil(daysSinceFirst / 30)));

    // ═══ COMMISSION ═══
    const allCommissions = await Commission.find({}).lean();
    const totalCommission = allCommissions.reduce((s, c) => s + (c.commissionAmount || 0), 0);
    const todayComm = allCommissions.filter(c => new Date(c.createdAt) >= todayStart).reduce((s, c) => s + (c.commissionAmount || 0), 0);
    const monthComm = allCommissions.filter(c => new Date(c.createdAt) >= monthStart).reduce((s, c) => s + (c.commissionAmount || 0), 0);
    const paidComm = allCommissions.filter(c => c.status === "paid").reduce((s, c) => s + (c.commissionAmount || 0), 0);
    const pendingComm = allCommissions.filter(c => ["pending", "overdue"].includes(c.status)).reduce((s, c) => s + (c.commissionAmount || 0), 0);
    const creatorEarnings = allCommissions.filter(c => c.status === "paid").reduce((s, c) => s + (c.creatorEarning || 0), 0);
    const platformEarnings = paidComm;

    // ═══ SUBSCRIPTIONS ═══
    const allCreators = await Creator.find({ status: { $ne: "deleted" } }).lean();
    const activeSubs = allCreators.filter(c => c.subscriptionStatus === "active").length;
    const pendingSubs = allCreators.filter(c => c.subscriptionStatus === "pending_payment").length;
    const expiredSubs = allCreators.filter(c => c.subscriptionStatus === "expired").length;
    const suspendedSubs = allCreators.filter(c => c.subscriptionStatus === "suspended").length;
    const trialSubs = allCreators.filter(c => c.subscriptionStatus === "trial").length;

    // ═══ FUTURE FORECAST ═══
    const activeSubCreators = allCreators.filter(c => c.subscriptionStatus === "active" && c.autoRenew !== false);
    const monthlySubRevenue = activeSubCreators.length * monthlyPrice;
    const forecast7 = Math.round(monthlySubRevenue / 4);
    const forecast30 = monthlySubRevenue;
    const forecast90 = monthlySubRevenue * 3;
    const forecast180 = monthlySubRevenue * 6;
    const forecast365 = monthlySubRevenue * 12;

    // ═══ PAYMENTS ═══
    let successPayments = 0, failedPayments = 0, pendingPayments = 0;
    try {
      successPayments = await PaymentProof.countDocuments({ status: "verified" });
      failedPayments = await PaymentProof.countDocuments({ status: "rejected" });
      pendingPayments = await PaymentProof.countDocuments({ status: "pending" });
    } catch {}

    // ═══ CREATORS ═══
    const totalCreators = allCreators.length;
    const activeCreators = allCreators.filter(c => c.status === "approved").length;
    const pendingApproval = allCreators.filter(c => c.status === "pending").length;
    const suspendedCreators = allCreators.filter(c => c.status === "suspended").length;
    const verifiedCreators = allCreators.filter(c => c.verified).length;

    // Top earning creators
    const creatorEarningsMap = {};
    allCommissions.filter(c => c.status === "paid").forEach(c => {
      const cid = c.creator?.toString() || "";
      creatorEarningsMap[cid] = (creatorEarningsMap[cid] || 0) + (c.creatorEarning || 0);
    });
    const topEarners = Object.entries(creatorEarningsMap).sort((a, b) => b[1] - a[1]).slice(0, 5);

    // ═══ BOOKINGS ═══
    const totalBookingsCount = allBookings.length;
    const pendingBookings = allBookings.filter(b => ["Booking Created", "Pending"].includes(b.status)).length;
    const acceptedBookings = allBookings.filter(b => b.status === "Creator Accepted").length;
    const completedCount = completedBookings.length;
    const cancelledBookings = allBookings.filter(b => ["Cancelled", "cancelled"].includes(b.status)).length;
    const rejectedBookings = allBookings.filter(b => ["Rejected", "rejected"].includes(b.status)).length;
    const todayBookings = allBookings.filter(b => new Date(b.createdAt) >= todayStart).length;
    const monthlyBookings = allBookings.filter(b => new Date(b.createdAt) >= monthStart).length;

    // ═══ TRENDS (last 7 days) ═══
    const revenueTrend = [];
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(todayStart); dayStart.setDate(dayStart.getDate() - i);
      const dayEnd = new Date(dayStart); dayEnd.setDate(dayEnd.getDate() + 1);
      const dayRev = allBookings.filter(b => { const d = new Date(b.createdAt); return d >= dayStart && d < dayEnd; }).reduce((s, b) => s + (b.amount || b.budget || 0), 0);
      revenueTrend.push({ date: dayStart.toISOString().split('T')[0], revenue: dayRev });
    }

    res.json({
      success: true,
      data: {
        revenue: { lifetime: lifetimeRevenue, today: todayRevenue, week: weekRevenue, month: monthRevenue, year: yearRevenue, avgDaily, avgMonthly },
        commission: { total: totalCommission, today: todayComm, month: monthComm, pending: pendingComm, paid: paidComm, creatorEarnings, platformEarnings },
        subscriptions: { total: allCreators.length, active: activeSubs, pending: pendingSubs, expired: expiredSubs, suspended: suspendedSubs, trial: trialSubs },
        forecast: { next7: forecast7, next30: forecast30, next90: forecast90, next180: forecast180, next365: forecast365 },
        payments: { successful: successPayments, failed: failedPayments, pending: pendingPayments },
        creators: { total: totalCreators, active: activeCreators, pending: pendingApproval, suspended: suspendedCreators, verified: verifiedCreators },
        bookings: { total: totalBookingsCount, pending: pendingBookings, accepted: acceptedBookings, completed: completedCount, cancelled: cancelledBookings, rejected: rejectedBookings, today: todayBookings, monthly: monthlyBookings },
        trends: { revenue: revenueTrend },
      },
    });
  } catch (e) { next(e); }
});

module.exports = router;
