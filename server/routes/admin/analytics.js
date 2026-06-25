/**
 * Admin Analytics — ADMIN REVENUE ONLY
 * Shows platform commission as revenue, NOT booking amounts
 * Admin Revenue = SUM(all platform commissions)
 */
const express = require("express");
const router = express.Router();
const Creator = require("../../models/Creator");
const Booking = require("../../models/Booking");
const Commission = require("../../models/Commission");
const PaymentProof = require("../../models/PaymentProof");
const configService = require("../../services/configService");

// GET /full — Admin Revenue Dashboard (commission-based)
router.get("/full", async (req, res, next) => {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart); weekStart.setDate(weekStart.getDate() - 7);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const yearStart = new Date(now.getFullYear(), 0, 1);

    let monthlyPrice = 299;
    try { const sub = await configService.getSubscriptionSettings(); monthlyPrice = sub.monthlyPlanPrice || 299; } catch {}

    // ═══ ALL COMMISSIONS (source of admin revenue) ═══
    const allCommissions = await Commission.find({}).select("commissionAmount creatorEarning totalAmount status creator createdAt dueDate").lean();

    // ADMIN REVENUE = only paid commissions (money actually received by platform)
    const paidComms = allCommissions.filter(c => c.status === "paid");
    const pendingComms = allCommissions.filter(c => ["pending", "overdue"].includes(c.status));

    // ═══ ADMIN REVENUE (commission only) ═══
    const lifetimeAdminRevenue = paidComms.reduce((s, c) => s + (c.commissionAmount || 0), 0);
    const todayAdminRevenue = paidComms.filter(c => new Date(c.createdAt) >= todayStart).reduce((s, c) => s + (c.commissionAmount || 0), 0);
    const weekAdminRevenue = paidComms.filter(c => new Date(c.createdAt) >= weekStart).reduce((s, c) => s + (c.commissionAmount || 0), 0);
    const monthAdminRevenue = paidComms.filter(c => new Date(c.createdAt) >= monthStart).reduce((s, c) => s + (c.commissionAmount || 0), 0);
    const yearAdminRevenue = paidComms.filter(c => new Date(c.createdAt) >= yearStart).reduce((s, c) => s + (c.commissionAmount || 0), 0);

    // Add subscription revenue (paid subscriptions = admin revenue)
    const allCreators = await Creator.find({ status: { $ne: "deleted" } }).select("status subscriptionStatus autoRenew verified lastPaymentDate subscriptionEndDate").lean();
    const activeSubCreators = allCreators.filter(c => c.subscriptionStatus === "active");
    const subscriptionRevenue = activeSubCreators.length * monthlyPrice;
    const lifetimeTotal = lifetimeAdminRevenue + subscriptionRevenue;

    // Averages
    const daysSinceFirst = paidComms.length > 0 ? Math.max(1, Math.ceil((now - new Date(paidComms[paidComms.length - 1]?.createdAt || now)) / 86400000)) : 1;
    const avgDaily = Math.round(lifetimeTotal / Math.max(daysSinceFirst, 30));
    const avgMonthly = Math.round(lifetimeTotal / Math.max(1, Math.ceil(daysSinceFirst / 30)));

    // ═══ COMMISSION ANALYTICS ═══
    const totalCommission = allCommissions.reduce((s, c) => s + (c.commissionAmount || 0), 0);
    const paidCommission = paidComms.reduce((s, c) => s + (c.commissionAmount || 0), 0);
    const pendingCommission = pendingComms.reduce((s, c) => s + (c.commissionAmount || 0), 0);
    const todayComm = allCommissions.filter(c => new Date(c.createdAt) >= todayStart).reduce((s, c) => s + (c.commissionAmount || 0), 0);
    const monthComm = allCommissions.filter(c => new Date(c.createdAt) >= monthStart).reduce((s, c) => s + (c.commissionAmount || 0), 0);

    // Creator earnings (separate informational section)
    const creatorEarnings = paidComms.reduce((s, c) => s + (c.creatorEarning || 0), 0);
    const totalBookingValue = allCommissions.reduce((s, c) => s + (c.totalAmount || 0), 0);

    // ═══ SUBSCRIPTIONS ═══
    const activeSubs = allCreators.filter(c => c.subscriptionStatus === "active").length;
    const pendingSubs = allCreators.filter(c => c.subscriptionStatus === "pending_payment").length;
    const expiredSubs = allCreators.filter(c => c.subscriptionStatus === "expired").length;
    const suspendedSubs = allCreators.filter(c => c.subscriptionStatus === "suspended").length;
    const trialSubs = allCreators.filter(c => c.subscriptionStatus === "trial").length;

    // ═══ FORECAST (admin commission only) ═══
    const monthlySubRevenue = activeSubCreators.length * monthlyPrice;
    const avgMonthlyComm = daysSinceFirst > 30 ? Math.round(lifetimeAdminRevenue / Math.ceil(daysSinceFirst / 30)) : lifetimeAdminRevenue;
    const forecast7 = Math.round((monthlySubRevenue + avgMonthlyComm) / 4);
    const forecast30 = monthlySubRevenue + avgMonthlyComm;
    const forecast90 = (monthlySubRevenue + avgMonthlyComm) * 3;
    const forecast180 = (monthlySubRevenue + avgMonthlyComm) * 6;
    const forecast365 = (monthlySubRevenue + avgMonthlyComm) * 12;

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

    // ═══ BOOKINGS ═══
    const allBookings = await Booking.find({}).select("status createdAt").lean();
    const todayBookings = allBookings.filter(b => new Date(b.createdAt) >= todayStart).length;
    const monthlyBookings = allBookings.filter(b => new Date(b.createdAt) >= monthStart).length;
    const completedBookings = allBookings.filter(b => b.status === "Completed").length;
    const cancelledBookings = allBookings.filter(b => ["Cancelled", "cancelled"].includes(b.status)).length;

    // ═══ REVENUE TREND (last 7 days — admin commission only) ═══
    const revenueTrend = [];
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(todayStart); dayStart.setDate(dayStart.getDate() - i);
      const dayEnd = new Date(dayStart); dayEnd.setDate(dayEnd.getDate() + 1);
      const dayRev = paidComms.filter(c => { const d = new Date(c.createdAt); return d >= dayStart && d < dayEnd; }).reduce((s, c) => s + (c.commissionAmount || 0), 0);
      revenueTrend.push({ date: dayStart.toISOString().split('T')[0], revenue: dayRev });
    }

    res.json({
      success: true,
      data: {
        revenue: { lifetime: lifetimeTotal, commissionRevenue: lifetimeAdminRevenue, subscriptionRevenue, today: todayAdminRevenue, week: weekAdminRevenue, month: monthAdminRevenue, year: yearAdminRevenue, avgDaily, avgMonthly },
        commission: { total: totalCommission, pending: pendingCommission, paid: paidCommission, today: todayComm, month: monthComm },
        creatorInfo: { totalEarnings: creatorEarnings, totalBookingValue },
        subscriptions: { total: allCreators.length, active: activeSubs, pending: pendingSubs, expired: expiredSubs, suspended: suspendedSubs, trial: trialSubs },
        forecast: { next7: forecast7, next30: forecast30, next90: forecast90, next180: forecast180, next365: forecast365 },
        payments: { successful: successPayments, failed: failedPayments, pending: pendingPayments },
        creators: { total: totalCreators, active: activeCreators, pending: pendingApproval, suspended: suspendedCreators },
        bookings: { total: allBookings.length, today: todayBookings, monthly: monthlyBookings, completed: completedBookings, cancelled: cancelledBookings },
        trends: { revenue: revenueTrend },
      },
    });
  } catch (e) {
    console.error("[Analytics] Error:", e.message);
    res.status(500).json({ success: false, message: "Analytics error: " + e.message });
  }
});

module.exports = router;
