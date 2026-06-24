/**
 * Admin Report Management — Send/track/resend creator reports
 * 
 * GET / — Report history (all sent reports)
 * POST /send/:creatorId — Send live report to a specific creator
 * POST /send-all — Send reports to all qualifying creators
 * POST /resend/:logId — Resend a specific report
 * GET /stats — Report delivery stats
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

// GET / — Report send history
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

// POST /send/:creatorId — Send LIVE report to a specific creator NOW
router.post("/send/:creatorId", async (req, res, next) => {
  try {
    const creator = await Creator.findById(req.params.creatorId).populate("user", "name email");
    if (!creator) return res.status(404).json({ success: false, message: "Creator not found" });
    if (!creator.user?.email) return res.status(400).json({ success: false, message: "Creator has no email" });

    // Generate live data report
    const now = new Date();
    const thirtyDaysAgo = new Date(now - 30 * 86400000);

    let bookings = [];
    let commissions = [];
    try { bookings = await Booking.find({ creator: creator._id }).sort("-createdAt").lean(); } catch {}
    try { commissions = await Commission.find({ creator: creator._id }).lean(); } catch {}

    const recentBookings = bookings.filter(b => new Date(b.createdAt) >= thirtyDaysAgo);
    const recentCommissions = commissions.filter(c => new Date(c.createdAt) >= thirtyDaysAgo);

    const stats = {
      totalBookings: bookings.length,
      recentBookings: recentBookings.length,
      completedBookings: bookings.filter(b => b.status === "Completed").length,
      cancelledBookings: bookings.filter(b => ["Cancelled", "cancelled"].includes(b.status)).length,
      pendingBookings: bookings.filter(b => ["Pending", "Creator Accepted"].includes(b.status)).length,
      totalEarnings: commissions.filter(c => c.status === "paid").reduce((s, c) => s + (c.creatorEarning || 0), 0),
      totalCommissionPaid: commissions.filter(c => c.status === "paid").reduce((s, c) => s + (c.commissionAmount || 0), 0),
      pendingCommission: commissions.filter(c => c.status === "pending").reduce((s, c) => s + (c.commissionAmount || 0), 0),
      totalRevenue: bookings.reduce((s, b) => s + (b.amount || b.budget || 0), 0),
    };

    const html = buildLiveReportEmail({
      name: creator.user.name,
      creatorId: creator.creatorId,
      stats,
      subscriptionStatus: creator.subscriptionStatus,
      subscriptionEndDate: creator.subscriptionEndDate,
      rank: creator.rank,
      featured: creator.featured,
      recentBookings: recentBookings.slice(0, 10),
    });

    const result = await emailService.sendEmail({
      to: creator.user.email,
      subject: `📊 Your Live Performance Report | BookMyShot`,
      html,
      type: "statement",
      userId: creator.user._id,
      creatorId: creator._id,
      meta: { triggeredBy: req.user._id, type: "live_report" },
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

// POST /resend/:logId — Resend a previously sent report
router.post("/resend/:logId", async (req, res, next) => {
  try {
    const log = await EmailLog.findById(req.params.logId);
    if (!log) return res.status(404).json({ success: false, message: "Report log not found" });

    if (!log.creator) return res.status(400).json({ success: false, message: "No creator linked to this report" });

    const creator = await Creator.findById(log.creator).populate("user", "name email");
    if (!creator?.user?.email) return res.status(400).json({ success: false, message: "Creator email not found" });

    // Resend — generate fresh report with live data
    const now = new Date();
    const thirtyDaysAgo = new Date(now - 30 * 86400000);
    let bookings = [];
    let commissions = [];
    try { bookings = await Booking.find({ creator: creator._id }).sort("-createdAt").lean(); } catch {}
    try { commissions = await Commission.find({ creator: creator._id }).lean(); } catch {}

    const recentBookings = bookings.filter(b => new Date(b.createdAt) >= thirtyDaysAgo);
    const stats = {
      totalBookings: bookings.length,
      recentBookings: recentBookings.length,
      completedBookings: bookings.filter(b => b.status === "Completed").length,
      cancelledBookings: bookings.filter(b => ["Cancelled", "cancelled"].includes(b.status)).length,
      pendingBookings: bookings.filter(b => ["Pending", "Creator Accepted"].includes(b.status)).length,
      totalEarnings: commissions.filter(c => c.status === "paid").reduce((s, c) => s + (c.creatorEarning || 0), 0),
      totalCommissionPaid: commissions.filter(c => c.status === "paid").reduce((s, c) => s + (c.commissionAmount || 0), 0),
      pendingCommission: commissions.filter(c => c.status === "pending").reduce((s, c) => s + (c.commissionAmount || 0), 0),
      totalRevenue: bookings.reduce((s, b) => s + (b.amount || b.budget || 0), 0),
    };

    const html = buildLiveReportEmail({
      name: creator.user.name,
      creatorId: creator.creatorId,
      stats,
      subscriptionStatus: creator.subscriptionStatus,
      subscriptionEndDate: creator.subscriptionEndDate,
      rank: creator.rank,
      featured: creator.featured,
      recentBookings: recentBookings.slice(0, 10),
    });

    const result = await emailService.sendEmail({
      to: creator.user.email,
      subject: `📊 Your Live Performance Report | BookMyShot`,
      html,
      type: "statement",
      userId: creator.user._id,
      creatorId: creator._id,
      meta: { triggeredBy: req.user._id, type: "resend" },
    });

    res.json({ success: true, message: `Report resent to ${creator.user.email}`, emailResult: result });
  } catch (e) { next(e); }
});

function buildLiveReportEmail({ name, creatorId, stats, subscriptionStatus, subscriptionEndDate, rank, featured, recentBookings }) {
  const subStatus = subscriptionStatus === "active" ? "✅ Active" : subscriptionStatus === "trial" ? "🎁 Trial" : "⚠️ " + (subscriptionStatus || "Inactive");
  const subExpiry = subscriptionEndDate ? new Date(subscriptionEndDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
  const promoStatus = rank ? `#${rank} Ranked` : featured ? "⭐ Featured" : "None";
  const now = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

  const bookingRows = recentBookings.map(b => 
    `<tr><td style="padding:6px 10px;color:#d4c8bc;font-size:11px;border-bottom:1px solid rgba(255,255,255,.03)">${new Date(b.createdAt).toLocaleDateString("en-IN",{day:"2-digit",month:"short"})}</td><td style="padding:6px 10px;color:#f6eee7;font-size:11px;border-bottom:1px solid rgba(255,255,255,.03)">${b.eventType||"—"}</td><td style="padding:6px 10px;color:#f6eee7;font-size:11px;border-bottom:1px solid rgba(255,255,255,.03)">${b.clientName||"—"}</td><td style="padding:6px 10px;text-align:right;color:#DAAF37;font-size:11px;border-bottom:1px solid rgba(255,255,255,.03)">₹${(b.amount||b.budget||0).toLocaleString("en-IN")}</td><td style="padding:6px 10px;text-align:right;font-size:11px;border-bottom:1px solid rgba(255,255,255,.03);color:${b.status==="Completed"?"#10b981":"#f59e0b"}">${b.status}</td></tr>`
  ).join("");

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#0a0806;font-family:'Segoe UI',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0806;padding:24px 12px"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#111;border-radius:16px;overflow:hidden;border:1px solid rgba(218,175,55,.12)">
  <tr><td style="background:linear-gradient(135deg,#1a1410,#0d0b08);padding:20px 28px;border-bottom:1px solid rgba(218,175,55,.15)">
    <span style="font-size:20px;font-weight:700;color:#DAAF37">BookMyShot</span>
    <span style="float:right;font-size:10px;color:#8a7e72;margin-top:6px">Live Report • ${now}</span>
  </td></tr>
  <tr><td style="height:3px;background:linear-gradient(90deg,#DAAF37,#F4C542,#DAAF37)"></td></tr>
  <tr><td style="padding:28px">
    <p style="margin:0 0 4px;color:#b9aa98;font-size:13px">Hello <strong style="color:#f6eee7">${name}</strong>,</p>
    <h2 style="margin:0 0 16px;color:#DAAF37;font-size:16px">📊 Live Performance Report</h2>
    
    <!-- Stats Grid -->
    <table width="100%" cellpadding="0" cellspacing="4" style="margin:0 0 20px">
      <tr>
        <td style="padding:10px;background:#1a1512;border-radius:8px;border:1px solid rgba(218,175,55,.06);text-align:center;width:33%"><div style="font-size:20px;font-weight:700;color:#DAAF37">${stats.totalBookings}</div><div style="font-size:10px;color:#8a7e72">Total Bookings</div></td>
        <td style="padding:10px;background:#1a1512;border-radius:8px;border:1px solid rgba(218,175,55,.06);text-align:center;width:33%"><div style="font-size:20px;font-weight:700;color:#10b981">${stats.completedBookings}</div><div style="font-size:10px;color:#8a7e72">Completed</div></td>
        <td style="padding:10px;background:#1a1512;border-radius:8px;border:1px solid rgba(218,175,55,.06);text-align:center;width:33%"><div style="font-size:20px;font-weight:700;color:#ef4444">${stats.cancelledBookings}</div><div style="font-size:10px;color:#8a7e72">Cancelled</div></td>
      </tr>
      <tr>
        <td style="padding:10px;background:#1a1512;border-radius:8px;border:1px solid rgba(218,175,55,.06);text-align:center"><div style="font-size:18px;font-weight:700;color:#f6eee7">₹${stats.totalRevenue.toLocaleString("en-IN")}</div><div style="font-size:10px;color:#8a7e72">Total Revenue</div></td>
        <td style="padding:10px;background:#1a1512;border-radius:8px;border:1px solid rgba(218,175,55,.06);text-align:center"><div style="font-size:18px;font-weight:700;color:#DAAF37">₹${stats.totalEarnings.toLocaleString("en-IN")}</div><div style="font-size:10px;color:#8a7e72">Earnings</div></td>
        <td style="padding:10px;background:#1a1512;border-radius:8px;border:1px solid rgba(218,175,55,.06);text-align:center"><div style="font-size:18px;font-weight:700;color:#f59e0b">₹${stats.pendingCommission.toLocaleString("en-IN")}</div><div style="font-size:10px;color:#8a7e72">Pending Comm.</div></td>
      </tr>
    </table>

    <!-- Details Table -->
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#1a1512;border:1px solid rgba(218,175,55,.06);border-radius:8px;margin:0 0 20px;font-size:12px">
      <tr><td style="padding:8px 12px;color:#8a7e72">Subscription</td><td style="padding:8px 12px;text-align:right;color:#f6eee7">${subStatus}</td></tr>
      <tr><td style="padding:8px 12px;color:#8a7e72;border-top:1px solid rgba(255,255,255,.03)">Expiry</td><td style="padding:8px 12px;text-align:right;color:#f6eee7;border-top:1px solid rgba(255,255,255,.03)">${subExpiry}</td></tr>
      <tr><td style="padding:8px 12px;color:#8a7e72;border-top:1px solid rgba(255,255,255,.03)">Promotion</td><td style="padding:8px 12px;text-align:right;color:#DAAF37;font-weight:600;border-top:1px solid rgba(255,255,255,.03)">${promoStatus}</td></tr>
      <tr><td style="padding:8px 12px;color:#8a7e72;border-top:1px solid rgba(255,255,255,.03)">Commission Paid</td><td style="padding:8px 12px;text-align:right;color:#10b981;border-top:1px solid rgba(255,255,255,.03)">₹${stats.totalCommissionPaid.toLocaleString("en-IN")}</td></tr>
      <tr><td style="padding:8px 12px;color:#8a7e72;border-top:1px solid rgba(255,255,255,.03)">Creator ID</td><td style="padding:8px 12px;text-align:right;color:#f6eee7;border-top:1px solid rgba(255,255,255,.03)">${creatorId||"—"}</td></tr>
    </table>

    ${recentBookings.length > 0 ? `
    <!-- Recent Bookings -->
    <h3 style="margin:0 0 8px;color:#f6eee7;font-size:12px;font-weight:600">Recent Bookings (Last 30 Days)</h3>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#1a1512;border:1px solid rgba(218,175,55,.06);border-radius:8px;margin:0 0 20px">
      <tr style="background:rgba(218,175,55,.06)"><td style="padding:6px 10px;color:#DAAF37;font-size:10px;font-weight:600">Date</td><td style="padding:6px 10px;color:#DAAF37;font-size:10px;font-weight:600">Event</td><td style="padding:6px 10px;color:#DAAF37;font-size:10px;font-weight:600">Client</td><td style="padding:6px 10px;text-align:right;color:#DAAF37;font-size:10px;font-weight:600">Amount</td><td style="padding:6px 10px;text-align:right;color:#DAAF37;font-size:10px;font-weight:600">Status</td></tr>
      ${bookingRows}
    </table>` : ''}

  </td></tr>
  <tr><td style="padding:0 28px 28px"><table cellpadding="0" cellspacing="0"><tr><td style="background:linear-gradient(135deg,#DAAF37,#F4C542);border-radius:10px;padding:12px 24px"><a href="${SITE_URL}/creator/dashboard.html" style="color:#111;font-size:13px;font-weight:700;text-decoration:none">Open Dashboard →</a></td></tr></table></td></tr>
  <tr><td style="padding:16px 28px;border-top:1px solid rgba(255,255,255,.04)">
    <p style="margin:0;font-size:9px;color:rgba(255,255,255,.2)">This report was generated from live data at ${now}. Save this email as a permanent record of your business activity.</p>
    <p style="margin:4px 0 0;font-size:9px;color:rgba(255,255,255,.12)">© 2026 BookMyShot | <a href="${SITE_URL}" style="color:rgba(218,175,55,.3)">bookmyshot.in</a></p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}

module.exports = router;
