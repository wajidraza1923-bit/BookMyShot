/**
 * Admin Report Management — Creator Financial Statements
 * 
 * Features:
 * - Send live financial reports to creators via email
 * - Track sent reports (delivery status, date, recipient)
 * - Report types: 7 days, 30 days, current month, previous month, lifetime
 * - Includes: Revenue, Earnings, Commission, Payment History, Booking History
 * - Acts as financial backup record (saved in creator's email inbox)
 */
const express = require("express");
const router = express.Router();
const Creator = require("../../models/Creator");
const Booking = require("../../models/Booking");
const Commission = require("../../models/Commission");
const EmailLog = require("../../models/EmailLog");
const { sendMonthlyStatements } = require("../../services/creatorStatements");
const emailService = require("../../services/emailService");

const SITE_URL = process.env.SITE_URL || "https://site--bookmyshot--ykz2mr8mzlrv.code.run";

// ═══════════════════════════════════════════════════════════════
// GET / — Report send history with admin visibility
// ═══════════════════════════════════════════════════════════════
router.get("/", async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const logs = await EmailLog.find({ type: "statement" })
      .sort("-createdAt")
      .limit(limit)
      .lean();

    const stats = {
      total: await EmailLog.countDocuments({ type: "statement" }),
      sent: await EmailLog.countDocuments({ type: "statement", status: "sent" }),
      failed: await EmailLog.countDocuments({ type: "statement", status: "failed" }),
    };

    res.json({ success: true, data: logs, stats });
  } catch (e) { next(e); }
});

// GET /stats — Delivery stats
router.get("/stats", async (req, res, next) => {
  try {
    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);

    const monthlyStats = await EmailLog.aggregate([
      { $match: { type: "statement", createdAt: { $gte: thisMonth } } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    const allTime = await EmailLog.aggregate([
      { $match: { type: "statement" } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    res.json({
      success: true,
      data: {
        thisMonth: Object.fromEntries(monthlyStats.map(s => [s._id, s.count])),
        allTime: Object.fromEntries(allTime.map(s => [s._id, s.count])),
        totalReports: await EmailLog.countDocuments({ type: "statement" }),
      },
    });
  } catch (e) { next(e); }
});

// ═══════════════════════════════════════════════════════════════
// POST /send/:creatorId — Send LIVE financial statement
// Query params: ?period=lifetime|30days|7days|current_month|previous_month
// ═══════════════════════════════════════════════════════════════
router.post("/send/:creatorId", async (req, res, next) => {
  try {
    const creator = await Creator.findById(req.params.creatorId).populate("user", "name email phone");
    if (!creator) return res.status(404).json({ success: false, message: "Creator not found" });
    if (!creator.user?.email) return res.status(400).json({ success: false, message: "Creator has no email" });

    const period = req.body.period || req.query.period || "lifetime";
    const reportData = await generateReportData(creator, period);

    const html = buildFinancialStatementEmail(reportData);

    const result = await emailService.sendEmail({
      to: creator.user.email,
      subject: `📊 Financial Statement (${reportData.periodLabel}) | BookMyShot`,
      html,
      type: "statement",
      userId: creator.user._id,
      creatorId: creator._id,
      meta: {
        triggeredBy: req.user._id,
        triggeredByName: req.user.name || "Admin",
        period,
        periodLabel: reportData.periodLabel,
        type: "live_report",
      },
    });

    res.json({ success: true, message: `Report sent to ${creator.user.email}`, emailResult: result });
  } catch (e) { next(e); }
});

// POST /send-all — Send monthly reports to all qualifying creators
router.post("/send-all", async (req, res, next) => {
  try {
    const result = await sendMonthlyStatements();
    res.json({ success: true, message: "Monthly statements triggered", ...result });
  } catch (e) { next(e); }
});

// POST /resend/:logId — Resend report
router.post("/resend/:logId", async (req, res, next) => {
  try {
    const log = await EmailLog.findById(req.params.logId);
    if (!log) return res.status(404).json({ success: false, message: "Report log not found" });
    if (!log.creator) return res.status(400).json({ success: false, message: "No creator linked" });

    const creator = await Creator.findById(log.creator).populate("user", "name email phone");
    if (!creator?.user?.email) return res.status(400).json({ success: false, message: "Creator email not found" });

    const period = log.meta?.period || "lifetime";
    const reportData = await generateReportData(creator, period);
    const html = buildFinancialStatementEmail(reportData);

    const result = await emailService.sendEmail({
      to: creator.user.email,
      subject: `📊 Financial Statement (${reportData.periodLabel}) | BookMyShot`,
      html,
      type: "statement",
      userId: creator.user._id,
      creatorId: creator._id,
      meta: { triggeredBy: req.user._id, type: "resend", period },
    });

    res.json({ success: true, message: `Report resent to ${creator.user.email}`, emailResult: result });
  } catch (e) { next(e); }
});

// ═══════════════════════════════════════════════════════════════
// HELPER: Generate report data from live MongoDB
// ═══════════════════════════════════════════════════════════════
async function generateReportData(creator, period) {
  const now = new Date();
  let dateFrom, dateTo = now, periodLabel;

  switch (period) {
    case "7days":
      dateFrom = new Date(now - 7 * 86400000);
      periodLabel = "Last 7 Days";
      break;
    case "30days":
      dateFrom = new Date(now - 30 * 86400000);
      periodLabel = "Last 30 Days";
      break;
    case "current_month":
      dateFrom = new Date(now.getFullYear(), now.getMonth(), 1);
      periodLabel = now.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
      break;
    case "previous_month":
      dateFrom = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      dateTo = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
      periodLabel = dateFrom.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
      break;
    default: // lifetime
      dateFrom = new Date(0);
      periodLabel = "Lifetime (All Time)";
  }

  // Fetch ALL bookings (lifetime) and period bookings
  let allBookings = [], periodBookings = [], allCommissions = [], periodCommissions = [];
  try { allBookings = await Booking.find({ creator: creator._id }).sort("-createdAt").lean(); } catch {}
  try { allCommissions = await Commission.find({ creator: creator._id }).sort("-createdAt").lean(); } catch {}

  periodBookings = allBookings.filter(b => {
    const d = new Date(b.createdAt);
    return d >= dateFrom && d <= dateTo;
  });
  periodCommissions = allCommissions.filter(c => {
    const d = new Date(c.createdAt);
    return d >= dateFrom && d <= dateTo;
  });

  // LIFETIME financials (always shown regardless of period)
  const lifetimeRevenue = allBookings.reduce((s, b) => s + (b.amount || b.budget || 0), 0);
  const lifetimeEarnings = allCommissions.filter(c => c.status === "paid").reduce((s, c) => s + (c.creatorEarning || 0), 0);
  const lifetimeCommissionPaid = allCommissions.filter(c => c.status === "paid").reduce((s, c) => s + (c.commissionAmount || 0), 0);
  const lifetimePendingCommission = allCommissions.filter(c => c.status === "pending").reduce((s, c) => s + (c.commissionAmount || 0), 0);
  // If no commissions exist, calculate earnings as revenue (creator keeps 100% until commission is created)
  const effectiveEarnings = lifetimeEarnings > 0 ? lifetimeEarnings : lifetimeRevenue - lifetimeCommissionPaid;

  // PERIOD financials
  const periodRevenue = periodBookings.reduce((s, b) => s + (b.amount || b.budget || 0), 0);
  const periodEarnings = periodCommissions.filter(c => c.status === "paid").reduce((s, c) => s + (c.creatorEarning || 0), 0);

  return {
    creator: {
      name: creator.user?.name || "Creator",
      email: creator.user?.email || "",
      phone: creator.user?.phone || "",
      creatorId: creator.creatorId || "—",
      joinedAt: creator.createdAt,
      subscriptionStatus: creator.subscriptionStatus,
      subscriptionEndDate: creator.subscriptionEndDate,
      rank: creator.rank,
      featured: creator.featured,
    },
    period,
    periodLabel,
    dateFrom,
    dateTo,
    generatedAt: now,
    // Lifetime totals (ALWAYS shown)
    lifetime: {
      totalRevenue: lifetimeRevenue,
      totalAmountPaid: effectiveEarnings,
      totalCommissionPaid: lifetimeCommissionPaid,
      pendingCommission: lifetimePendingCommission,
      totalBookings: allBookings.length,
      completedBookings: allBookings.filter(b => b.status === "Completed").length,
      cancelledBookings: allBookings.filter(b => ["Cancelled", "cancelled"].includes(b.status)).length,
    },
    // Period stats
    periodStats: {
      revenue: periodRevenue,
      earnings: periodEarnings,
      bookings: periodBookings.length,
      completed: periodBookings.filter(b => b.status === "Completed").length,
    },
    // Booking history (recent 15)
    bookingHistory: periodBookings.slice(0, 15).map(b => ({
      date: b.createdAt,
      client: b.clientName || "—",
      eventType: b.eventType || "—",
      amount: b.amount || b.budget || 0,
      status: b.status || "—",
    })),
    // Payment/commission history (recent 10)
    paymentHistory: allCommissions.filter(c => c.status === "paid").slice(0, 10).map(c => ({
      date: c.paidAt || c.updatedAt || c.createdAt,
      amount: c.creatorEarning || 0,
      commission: c.commissionAmount || 0,
      status: c.status,
      bookingAmount: c.totalAmount || 0,
    })),
  };
}

// ═══════════════════════════════════════════════════════════════
// HELPER: Build professional financial statement HTML email
// ═══════════════════════════════════════════════════════════════
function buildFinancialStatementEmail(data) {
  const { creator, periodLabel, generatedAt, lifetime, periodStats, bookingHistory, paymentHistory } = data;
  const genDate = new Date(generatedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const subStatus = creator.subscriptionStatus === "active" ? "✅ Active" : creator.subscriptionStatus === "trial" ? "🎁 Trial" : "⚠️ " + (creator.subscriptionStatus || "Inactive");
  const subExpiry = creator.subscriptionEndDate ? new Date(creator.subscriptionEndDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
  const promoStatus = creator.rank ? `#${creator.rank} Ranked` : creator.featured ? "⭐ Featured" : "None";
  const fmt = (n) => "₹" + (n || 0).toLocaleString("en-IN");

  const bookingRows = bookingHistory.map(b =>
    `<tr><td style="padding:5px 8px;color:#d4c8bc;font-size:10px;border-bottom:1px solid rgba(255,255,255,.03)">${new Date(b.date).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"2-digit"})}</td><td style="padding:5px 8px;color:#f6eee7;font-size:10px;border-bottom:1px solid rgba(255,255,255,.03)">${b.client}</td><td style="padding:5px 8px;color:#f6eee7;font-size:10px;border-bottom:1px solid rgba(255,255,255,.03)">${b.eventType}</td><td style="padding:5px 8px;text-align:right;color:#DAAF37;font-size:10px;border-bottom:1px solid rgba(255,255,255,.03)">${fmt(b.amount)}</td><td style="padding:5px 8px;text-align:right;font-size:10px;border-bottom:1px solid rgba(255,255,255,.03);color:${b.status==="Completed"?"#10b981":b.status==="Cancelled"?"#ef4444":"#f59e0b"}">${b.status}</td></tr>`
  ).join("");

  const paymentRows = paymentHistory.map(p =>
    `<tr><td style="padding:5px 8px;color:#d4c8bc;font-size:10px;border-bottom:1px solid rgba(255,255,255,.03)">${new Date(p.date).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"2-digit"})}</td><td style="padding:5px 8px;text-align:right;color:#10b981;font-size:10px;font-weight:600;border-bottom:1px solid rgba(255,255,255,.03)">${fmt(p.amount)}</td><td style="padding:5px 8px;text-align:right;color:#f59e0b;font-size:10px;border-bottom:1px solid rgba(255,255,255,.03)">${fmt(p.commission)}</td><td style="padding:5px 8px;text-align:right;color:#f6eee7;font-size:10px;border-bottom:1px solid rgba(255,255,255,.03)">${fmt(p.bookingAmount)}</td><td style="padding:5px 8px;text-align:center;font-size:10px;border-bottom:1px solid rgba(255,255,255,.03);color:#10b981">✓ Paid</td></tr>`
  ).join("");

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#0a0806;font-family:'Segoe UI',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0806;padding:20px 10px"><tr><td align="center">
<table width="620" cellpadding="0" cellspacing="0" style="max-width:620px;width:100%;background:#111;border-radius:14px;overflow:hidden;border:1px solid rgba(218,175,55,.12)">
  <!-- Header -->
  <tr><td style="background:linear-gradient(135deg,#1a1410,#0d0b08);padding:18px 24px;border-bottom:1px solid rgba(218,175,55,.15)">
    <table width="100%"><tr><td><span style="font-size:18px;font-weight:700;color:#DAAF37">BookMyShot</span><br><span style="font-size:9px;color:#8a7e72">FINANCIAL STATEMENT</span></td><td style="text-align:right"><span style="font-size:9px;color:#8a7e72">Generated: ${genDate}</span><br><span style="font-size:9px;color:#8a7e72">Period: ${periodLabel}</span></td></tr></table>
  </td></tr>
  <tr><td style="height:3px;background:linear-gradient(90deg,#DAAF37,#F4C542,#DAAF37)"></td></tr>

  <tr><td style="padding:24px">
    <!-- Creator Info -->
    <table width="100%" style="margin:0 0 16px;font-size:11px"><tr><td style="color:#8a7e72">Creator: <strong style="color:#f6eee7">${creator.name}</strong></td><td style="text-align:right;color:#8a7e72">ID: <strong style="color:#DAAF37">${creator.creatorId}</strong></td></tr><tr><td style="color:#8a7e72">${creator.email}</td><td style="text-align:right;color:#8a7e72">Sub: ${subStatus} | Exp: ${subExpiry}</td></tr></table>

    <!-- ═══ LIFETIME FINANCIAL SUMMARY ═══ -->
    <div style="background:linear-gradient(135deg,#1a1714,#12100e);border:1px solid rgba(218,175,55,.15);border-radius:10px;padding:16px;margin:0 0 16px">
      <div style="font-size:10px;font-weight:700;color:#DAAF37;letter-spacing:1px;margin:0 0 10px">💰 LIFETIME FINANCIAL SUMMARY</div>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="padding:6px 0;color:#8a7e72;font-size:11px">Total Revenue Till Date</td><td style="padding:6px 0;text-align:right;color:#f6eee7;font-size:13px;font-weight:700">${fmt(lifetime.totalRevenue)}</td></tr>
        <tr><td style="padding:6px 0;color:#8a7e72;font-size:11px;border-top:1px solid rgba(255,255,255,.03)">Total Amount Paid To Creator</td><td style="padding:6px 0;text-align:right;color:#10b981;font-size:13px;font-weight:700;border-top:1px solid rgba(255,255,255,.03)">${fmt(lifetime.totalAmountPaid)}</td></tr>
        <tr><td style="padding:6px 0;color:#8a7e72;font-size:11px;border-top:1px solid rgba(255,255,255,.03)">Commission Paid Till Date</td><td style="padding:6px 0;text-align:right;color:#f6eee7;font-size:11px;border-top:1px solid rgba(255,255,255,.03)">${fmt(lifetime.totalCommissionPaid)}</td></tr>
        <tr><td style="padding:6px 0;color:#8a7e72;font-size:11px;border-top:1px solid rgba(255,255,255,.03)">Pending Commission</td><td style="padding:6px 0;text-align:right;color:#f59e0b;font-size:11px;font-weight:600;border-top:1px solid rgba(255,255,255,.03)">${fmt(lifetime.pendingCommission)}</td></tr>
        <tr><td style="padding:6px 0;color:#8a7e72;font-size:11px;border-top:1px solid rgba(255,255,255,.03)">Total Completed Bookings</td><td style="padding:6px 0;text-align:right;color:#f6eee7;font-size:11px;border-top:1px solid rgba(255,255,255,.03)">${lifetime.completedBookings}</td></tr>
        <tr><td style="padding:6px 0;color:#8a7e72;font-size:11px;border-top:1px solid rgba(255,255,255,.03)">Total Cancelled Bookings</td><td style="padding:6px 0;text-align:right;color:#ef4444;font-size:11px;border-top:1px solid rgba(255,255,255,.03)">${lifetime.cancelledBookings}</td></tr>
      </table>
    </div>

    <!-- Period Stats -->
    <table width="100%" cellpadding="0" cellspacing="4" style="margin:0 0 16px">
      <tr>
        <td style="padding:8px;background:#1a1512;border-radius:6px;text-align:center;border:1px solid rgba(218,175,55,.05)"><div style="font-size:16px;font-weight:700;color:#DAAF37">${periodStats.bookings}</div><div style="font-size:9px;color:#8a7e72">${periodLabel} Bookings</div></td>
        <td style="padding:8px;background:#1a1512;border-radius:6px;text-align:center;border:1px solid rgba(218,175,55,.05)"><div style="font-size:16px;font-weight:700;color:#10b981">${periodStats.completed}</div><div style="font-size:9px;color:#8a7e72">Completed</div></td>
        <td style="padding:8px;background:#1a1512;border-radius:6px;text-align:center;border:1px solid rgba(218,175,55,.05)"><div style="font-size:16px;font-weight:700;color:#f6eee7">${fmt(periodStats.revenue)}</div><div style="font-size:9px;color:#8a7e72">Period Revenue</div></td>
      </tr>
    </table>

    ${bookingHistory.length > 0 ? `
    <!-- BOOKING HISTORY -->
    <div style="font-size:10px;font-weight:700;color:#DAAF37;letter-spacing:0.5px;margin:0 0 6px">📋 BOOKING HISTORY</div>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#1a1512;border:1px solid rgba(218,175,55,.05);border-radius:6px;margin:0 0 16px">
      <tr style="background:rgba(218,175,55,.05)"><td style="padding:5px 8px;color:#DAAF37;font-size:9px;font-weight:600">Date</td><td style="padding:5px 8px;color:#DAAF37;font-size:9px;font-weight:600">Client</td><td style="padding:5px 8px;color:#DAAF37;font-size:9px;font-weight:600">Event</td><td style="padding:5px 8px;text-align:right;color:#DAAF37;font-size:9px;font-weight:600">Amount</td><td style="padding:5px 8px;text-align:right;color:#DAAF37;font-size:9px;font-weight:600">Status</td></tr>
      ${bookingRows}
    </table>` : ''}

    ${paymentHistory.length > 0 ? `
    <!-- PAYMENT HISTORY -->
    <div style="font-size:10px;font-weight:700;color:#10b981;letter-spacing:0.5px;margin:0 0 6px">💳 PAYMENT HISTORY (Creator Payouts)</div>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#1a1512;border:1px solid rgba(16,185,129,.08);border-radius:6px;margin:0 0 16px">
      <tr style="background:rgba(16,185,129,.05)"><td style="padding:5px 8px;color:#10b981;font-size:9px;font-weight:600">Date</td><td style="padding:5px 8px;text-align:right;color:#10b981;font-size:9px;font-weight:600">Paid</td><td style="padding:5px 8px;text-align:right;color:#10b981;font-size:9px;font-weight:600">Commission</td><td style="padding:5px 8px;text-align:right;color:#10b981;font-size:9px;font-weight:600">Booking Amt</td><td style="padding:5px 8px;text-align:center;color:#10b981;font-size:9px;font-weight:600">Status</td></tr>
      ${paymentRows}
    </table>` : ''}

  </td></tr>
  <!-- CTA -->
  <tr><td style="padding:0 24px 20px"><table cellpadding="0" cellspacing="0"><tr><td style="background:linear-gradient(135deg,#DAAF37,#F4C542);border-radius:8px;padding:11px 22px"><a href="${SITE_URL}/creator/dashboard.html" style="color:#111;font-size:12px;font-weight:700;text-decoration:none">Open Dashboard →</a></td></tr></table></td></tr>
  <!-- Footer -->
  <tr><td style="padding:14px 24px;border-top:1px solid rgba(255,255,255,.04);background:rgba(0,0,0,.2)">
    <p style="margin:0;font-size:8px;color:rgba(255,255,255,.25)">This is an official financial statement generated from live BookMyShot data on ${genDate}. Save this email as a permanent record of your business activity. If you believe there is an error, contact support@bookmyshot.in.</p>
    <p style="margin:4px 0 0;font-size:8px;color:rgba(255,255,255,.12)">© 2026 BookMyShot India Private Ltd. | CIN: U74999JK2026PTC000000 | <a href="${SITE_URL}" style="color:rgba(218,175,55,.3)">bookmyshot.in</a></p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}

module.exports = router;
