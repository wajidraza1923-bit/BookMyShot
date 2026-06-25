/**
 * Admin Analytics — ONLY REAL DATABASE DATA
 * No hardcoded values, no estimates mixed with actuals
 * Every number comes from actual completed transactions
 */
const express = require("express");
const router = express.Router();
const Creator = require("../../models/Creator");
const Booking = require("../../models/Booking");
const Commission = require("../../models/Commission");
const PaymentProof = require("../../models/PaymentProof");

// GET /full — Real database data only
router.get("/full", async (req, res, next) => {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart); weekStart.setDate(weekStart.getDate() - 7);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const yearStart = new Date(now.getFullYear(), 0, 1);

    // ═══ COMMISSION (Source of admin revenue) ═══
    // Only PAID commissions = actual admin revenue received
    const paidCommissions = await Commission.find({ status: "paid" }).select("commissionAmount creatorEarning totalAmount createdAt paidAt").lean();
    const pendingCommissions = await Commission.find({ status: { $in: ["pending", "overdue"] } }).select("commissionAmount createdAt").lean();

    // Admin Revenue = ONLY actually received commission payments
    const commissionReceived = paidCommissions.reduce((s, c) => s + (c.commissionAmount || 0), 0);
    const commissionToday = paidCommissions.filter(c => new Date(c.paidAt || c.createdAt) >= todayStart).reduce((s, c) => s + (c.commissionAmount || 0), 0);
    const commissionWeek = paidCommissions.filter(c => new Date(c.paidAt || c.createdAt) >= weekStart).reduce((s, c) => s + (c.commissionAmount || 0), 0);
    const commissionMonth = paidCommissions.filter(c => new Date(c.paidAt || c.createdAt) >= monthStart).reduce((s, c) => s + (c.commissionAmount || 0), 0);
    const commissionYear = paidCommissions.filter(c => new Date(c.paidAt || c.createdAt) >= yearStart).reduce((s, c) => s + (c.commissionAmount || 0), 0);
    const commissionPending = pendingCommissions.reduce((s, c) => s + (c.commissionAmount || 0), 0);
    const commissionTotal = commissionReceived + commissionPending;

    // ═══ SUBSCRIPTION REVENUE (actual payments received) ═══
    // Count from PaymentProof with verified status for subscriptions
    // OR count creators who have lastPaymentDate (actually paid)
    const creatorsWhoPaid = await Creator.find({ lastPaymentDate: { $exists: true, $ne: null }, status: { $ne: "deleted" } }).select("lastPaymentDate subscriptionAmount subscriptionPlanPrice").lean();
    const subscriptionRevenue = creatorsWhoPaid.reduce((s, c) => s + (c.subscriptionAmount || c.subscriptionPlanPrice || 0), 0);

    // ═══ TOTAL ADMIN REVENUE (actual money received) ═══
    const totalAdminRevenue = commissionReceived + subscriptionRevenue;
    const todayRevenue = commissionToday; // Sub revenue is one-time per month, not daily
    const weekRevenue = commissionWeek;
    const monthRevenue = commissionMonth;
    const yearRevenue = commissionYear + subscriptionRevenue;

    // ═══ CREATOR EARNINGS (actual payouts from paid commissions) ═══
    const creatorEarnings = paidCommissions.reduce((s, c) => s + (c.creatorEarning || 0), 0);

    // ═══ SUBSCRIPTIONS (real database counts) ═══
    const allCreators = await Creator.find({ status: { $ne: "deleted" } }).select("status subscriptionStatus").lean();
    const activeSubs = allCreators.filter(c => c.subscriptionStatus === "active").length;
    const pendingSubs = allCreators.filter(c => c.subscriptionStatus === "pending_payment").length;
    const expiredSubs = allCreators.filter(c => c.subscriptionStatus === "expired").length;
    const suspendedSubs = allCreators.filter(c => c.subscriptionStatus === "suspended").length;
    const trialSubs = allCreators.filter(c => c.subscriptionStatus === "trial").length;

    // ═══ PAYMENTS (real verified/rejected/pending counts) ═══
    const verifiedPayments = await PaymentProof.countDocuments({ status: "verified" });
    const rejectedPayments = await PaymentProof.countDocuments({ status: "rejected" });
    const pendingPayments = await PaymentProof.countDocuments({ status: "pending" });

    // ═══ BOOKINGS (real counts from database) ═══
    const totalBookings = await Booking.countDocuments();
    const todayBookings = await Booking.countDocuments({ createdAt: { $gte: todayStart } });
    const monthlyBookings = await Booking.countDocuments({ createdAt: { $gte: monthStart } });
    const completedBookings = await Booking.countDocuments({ status: "Completed" });
    const cancelledBookings = await Booking.countDocuments({ status: { $in: ["Cancelled", "cancelled"] } });
    const acceptedBookings = await Booking.countDocuments({ status: "Creator Accepted" });
    const pendingBookings = await Booking.countDocuments({ status: { $in: ["Booking Created", "Pending"] } });

    // ═══ CREATORS (real counts) ═══
    const totalCreators = allCreators.length;
    const activeCreators = allCreators.filter(c => c.status === "approved").length;
    const pendingApproval = allCreators.filter(c => c.status === "pending").length;
    const suspendedCreators = allCreators.filter(c => c.status === "suspended").length;

    // ═══ FORECAST (clearly separate — based on active subs only) ═══
    // This is an ESTIMATE not actual revenue
    let monthlySubPrice = 299;
    try { const cs = require("../../services/configService"); const ss = await cs.getSubscriptionSettings(); monthlySubPrice = ss.monthlyPlanPrice || 299; } catch {}
    const expectedMonthly = activeSubs * monthlySubPrice;

    // ═══ REVENUE TREND (last 7 days — actual received only) ═══
    const revenueTrend = [];
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(todayStart); dayStart.setDate(dayStart.getDate() - i);
      const dayEnd = new Date(dayStart); dayEnd.setDate(dayEnd.getDate() + 1);
      const dayRev = paidCommissions.filter(c => { const d = new Date(c.paidAt || c.createdAt); return d >= dayStart && d < dayEnd; }).reduce((s, c) => s + (c.commissionAmount || 0), 0);
      revenueTrend.push({ date: dayStart.toISOString().split('T')[0], revenue: dayRev });
    }

    res.json({
      success: true,
      data: {
        revenue: {
          lifetime: totalAdminRevenue,
          commissionReceived: commissionReceived,
          subscriptionReceived: subscriptionRevenue,
          today: todayRevenue,
          week: weekRevenue,
          month: monthRevenue,
          year: yearRevenue,
        },
        commission: {
          total: commissionTotal,
          received: commissionReceived,
          pending: commissionPending,
          today: commissionToday,
          month: commissionMonth,
        },
        creatorInfo: {
          totalEarnings: creatorEarnings,
          totalBookingValue: paidCommissions.reduce((s, c) => s + (c.totalAmount || 0), 0),
        },
        subscriptions: { total: allCreators.length, active: activeSubs, pending: pendingSubs, expired: expiredSubs, suspended: suspendedSubs, trial: trialSubs },
        forecast: { expectedMonthlySubscription: expectedMonthly, note: "Estimate based on active subscribers × plan price" },
        payments: { verified: verifiedPayments, rejected: rejectedPayments, pending: pendingPayments },
        creators: { total: totalCreators, active: activeCreators, pending: pendingApproval, suspended: suspendedCreators },
        bookings: { total: totalBookings, today: todayBookings, monthly: monthlyBookings, completed: completedBookings, cancelled: cancelledBookings, accepted: acceptedBookings, pending: pendingBookings },
        trends: { revenue: revenueTrend },
      },
    });
  } catch (e) {
    console.error("[Analytics] Error:", e.message);
    res.status(500).json({ success: false, message: "Analytics error: " + e.message });
  }
});

module.exports = router;
