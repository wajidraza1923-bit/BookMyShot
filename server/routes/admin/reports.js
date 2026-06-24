/**
 * Admin Reports & Statements Management
 * 
 * - GET /earnings — Platform earnings report
 * - GET /bookings — Bookings report
 * - GET /creator-statement/:id — Individual creator statement
 * - POST /send-statement/:id — Send live report to specific creator
 * - POST /send-monthly-statements — Send to all qualifying creators
 * - GET /sent-reports — History of all sent reports
 * - POST /resend/:reportId — Resend a specific report
 */
const express = require("express");
const router = express.Router();
const Creator = require("../../models/Creator");
const Booking = require("../../models/Booking");
const Commission = require("../../models/Commission");
const ReportLog = require("../../models/ReportLog");
const emailService = require("../../services/emailService");

const SITE_URL = process.env.SITE_URL || "https://site--bookmyshot--ykz2mr8mzlrv.code.run";

// ═══════════════════════════════════════════════════════════════
// DOWNLOADABLE REPORTS
// ═══════════════════════════════════════════════════════════════

// GET /earnings — Platform earnings report
router.get("/earnings", async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const dateFilter = {};
    if (from) dateFilter.$gte = new Date(from);
    if (to) dateFilter.$lte = new Date(to);
    const match = Object.keys(dateFilter).length ? { createdAt: dateFilter } : {};

    const commissions = await Commission.find({ ...match, status: "paid" })
      .populate({ path: "creator", populate: { path: "user", select: "name email" } })
      .populate("booking", "eventType eventDate clientName amount")
      .sort("-createdAt").lean();

    const total = commissions.reduce((s, c) => s + (c.commissionAmount || 0), 0);
    const creatorTotal = commissions.reduce((s, c) => s + (c.creatorEarning || 0), 0);

    res.json({
      success: true,
      report: {
        generatedAt: new Date().toISOString(),
        period: { from: from || "all-time", to: to || "now" },
        summary: { totalCommissions: commissions.length, platformEarnings: total, creatorEarnings: creatorTotal, totalTransactions: total + creatorTotal },
        data: commissions.map(c => ({
          date: c.createdAt, creator: c.creator?.user?.name || "—", email: c.creator?.user?.email || "—",
          booking: c.booking?.eventType || "—", totalAmount: c.totalAmount,
          commissionPercent: c.commissionPercent, platformEarning: c.commissionAmount, creatorEarning: c.creatorEarning,
        })),
      },
    });
  } catch (e) { next(e); }
});

// GET /bookings — Bookings report
router.get("/bookings", async (req, res, next) => {
  try {
    const { from, to, status } = req.query;
    const filter = {};
    if (from || to) { filter.createdAt = {}; if (from) filter.createdAt.$gte = new Date(from); if (to) filter.createdAt.$lte = new Date(to); }
    if (status) filter.status = status;

    const bookings = await Booking.find(filter)
      .populate({ path: "creator", populate: { path: "user", select: "name" } })
      .populate("user", "name email phone").sort("-createdAt").lean();

    const totalRevenue = bookings.reduce((s, b) => s + (b.amount || b.budget || 0), 0);
    res.json({
      success: true,
      report: {
        generatedAt: new Date().toISOString(),
        summary: { totalBookings: bookings.length, totalRevenue,
          statusBreakdown: { pending: bookings.filter(b => b.status === "Pending").length, accepted: bookings.filter(b => b.status === "Creator Accepted").length, completed: bookings.filter(b => b.status === "Completed").length, cancelled: bookings.filter(b => b.status === "Cancelled").length }
        },
        data: bookings.map(b => ({ date: b.createdAt, client: b.clientName, creator: b.creator?.user?.name || "—", eventType: b.eventType, eventDate: b.eventDate, amount: b.amount || b.budget, status: b.status })),
      },
    });
  } catch (e) { next(e); }
});

// ═══════════════════════════════════════════════════════════════
// CREATOR STATEMENTS
// ═══════════════════════════════════════════════════════════════

// GET /creator-statement/:id — Get live statement data (downloadable)
router.get("/creator-statement/:id", async (req, res, next) => {
  try {
    const data = await generateCreatorStatement(req.params.id);
    res.json({ success: true, statement: data });
  } catch (e) { next(e); }
});

// POST /send-statement/:id — Send live report to specific creator NOW
router.post("/send-statement/:id", async (req, res, next) => {
  try {
    const data = await generateCreatorStatement(req.params.id);
    const creator = await Creator.findById(req.params.id).populate("user", "name email");
    if (!creator?.user?.email) return res.status(400).json({ success: false, message: "Creator has no email" });

    const html = buildStatementHtml(data, "Live Report");
    const result = await emailService.sendEmail({
      to: creator.user.email,
      subject: `📊 Your Live Performance Report | BookMyShot`,
      html,
      type: "statement",
      userId: creator.user._id,
      creatorId: creator._id,
      meta: { type: "live" },
    });

    // Log the report
    await ReportLog.create({
      creator: creator._id,
      creatorName: creator.user.name,
      creatorEmail: creator.user.email,
      type: "live",
      period: "Live data as of " + new Date().toLocaleDateString("en-IN"),
      status: result.success ? "sent" : "failed",
      error: result.success ? "" : (result.error || "Unknown"),
      sentAt: new Date(),
      sentBy: req.user._id,
      reportData: {
        totalBookings: data.financials.totalBookings,
        completedBookings: data.financials.completedBookings,
        cancelledBookings: data.financials.cancelledBookings,
        totalEarnings: data.financials.totalEarnings,
        pendingCommission: data.financials.pendingCommission,
        paidCommission: data.financials.totalCommissionPaid,
        totalRevenue: data.financials.totalRevenue,
        subscriptionStatus: data.creator.subscriptionStatus,
        promotionStatus: data.creator.rank ? `#${data.creator.rank}` : data.creator.featured ? "Featured" : "None",
      },
    });

    res.json({ success: true, message: `Report sent to ${creator.user.email}` });
  } catch (e) { next(e); }
});

// POST /send-monthly-statements — Send to all qualifying creators
router.post("/send-monthly-statements", async (req, res, next) => {
  try {
    const { sendMonthlyStatements } = require("../../services/creatorStatements");
    const result = await sendMonthlyStatements();
    res.json({ success: true, message: "Monthly statements sent", ...result });
  } catch (e) { next(e); }
});

// GET /sent-reports — History of all sent reports
router.get("/sent-reports", async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const reports = await ReportLog.find().sort("-createdAt").limit(limit)
      .populate({ path: "creator", populate: { path: "user", select: "name" } })
      .populate("sentBy", "name")
      .lean();
    const stats = {
      total: await ReportLog.countDocuments(),
      sent: await ReportLog.countDocuments({ status: "sent" }),
      failed: await ReportLog.countDocuments({ status: "failed" }),
    };
    res.json({ success: true, data: reports, stats });
  } catch (e) { next(e); }
});

// POST /resend/:reportId — Resend a specific report
router.post("/resend/:reportId", async (req, res, next) => {
  try {
    const report = await ReportLog.findById(req.params.reportId);
    if (!report) return res.status(404).json({ success: false, message: "Report not found" });

    const data = await generateCreatorStatement(report.creator);
    const creator = await Creator.findById(report.creator).populate("user", "name email");
    if (!creator?.user?.email) return res.status(400).json({ success: false, message: "Creator has no email" });

    const html = buildStatementHtml(data, "Resent Report");
    const result = await emailService.sendEmail({
      to: creator.user.email,
      subject: `📊 Your Performance Report (Resent) | BookMyShot`,
      html,
      type: "statement",
      userId: creator.user._id,
      creatorId: creator._id,
    });

    report.status = result.success ? "sent" : "failed";
    report.sentAt = new Date();
    await report.save();

    res.json({ success: true, message: `Report resent to ${creator.user.email}` });
  } catch (e) { next(e); }
});

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

async function generateCreatorStatement(creatorId) {
  const creator = await Creator.findById(creatorId).populate("user", "name email phone");
  if (!creator) throw new Error("Creator not found");

  const bookings = await Booking.find({ creator: creator._id }).sort("-createdAt").lean();
  const commissions = await Commission.find({ creator: creator._id }).sort("-createdAt").lean();

  const completedBookings = bookings.filter(b => b.status === "Completed").length;
  const cancelledBookings = bookings.filter(b => ["Cancelled", "cancelled", "Rejected"].includes(b.status)).length;
  const totalRevenue = bookings.reduce((s, b) => s + (b.amount || b.budget || 0), 0);
  const totalCommissionPaid = commissions.filter(c => c.status === "paid").reduce((s, c) => s + (c.commissionAmount || 0), 0);
  const totalEarnings = commissions.filter(c => c.status === "paid").reduce((s, c) => s + (c.creatorEarning || 0), 0);
  const pendingCommission = commissions.filter(c => c.status === "pending").reduce((s, c) => s + (c.commissionAmount || 0), 0);

  return {
    generatedAt: new Date().toISOString(),
    creator: {
      id: creator._id, creatorId: creator.creatorId, name: creator.user?.name, email: creator.user?.email,
      phone: creator.user?.phone, status: creator.status, subscriptionStatus: creator.subscriptionStatus,
      subscriptionEndDate: creator.subscriptionEndDate, rank: creator.rank, featured: creator.featured, joinedAt: creator.createdAt,
    },
    financials: {
      totalBookings: bookings.length, completedBookings, cancelledBookings, totalRevenue,
      totalCommissionPaid, totalEarnings, pendingCommission, netBalance: totalEarnings,
    },
    recentBookings: bookings.slice(0, 20).map(b => ({ date: b.createdAt, eventType: b.eventType, client: b.clientName, amount: b.amount || b.budget, status: b.status })),
    recentCommissions: commissions.slice(0, 20).map(c => ({ date: c.createdAt, amount: c.totalAmount, commission: c.commissionAmount, earning: c.creatorEarning, status: c.status })),
  };
}

function buildStatementHtml(data, title) {
  const c = data.creator;
  const f = data.financials;
  const subStatus = c.subscriptionStatus === "active" ? "✅ Active" : c.subscriptionStatus === "trial" ? "🎁 Trial" : "⚠️ " + (c.subscriptionStatus || "Inactive");
  const promoStatus = c.rank ? `#${c.rank} Ranked` : c.featured ? "⭐ Featured" : "None";
  const subExpiry = c.subscriptionEndDate ? new Date(c.subscriptionEndDate).toLocaleDateString("en-IN") : "—";

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#0a0806;font-family:'Segoe UI',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0806;padding:24px 16px"><tr><td align="center">
<table width="580" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%;background:#111;border-radius:16px;overflow:hidden;border:1px solid rgba(218,175,55,.12)">
  <tr><td style="background:linear-gradient(135deg,#1a1410,#0d0b08);padding:24px 32px;border-bottom:1px solid rgba(218,175,55,.15)">
    <span style="font-size:22px;font-weight:700;color:#DAAF37">BookMyShot</span>
    <span style="float:right;font-size:11px;color:#8a7e72;margin-top:6px">${title}</span>
  </td></tr>
  <tr><td style="height:3px;background:linear-gradient(90deg,#DAAF37,#F4C542,#DAAF37)"></td></tr>
  <tr><td style="padding:32px">
    <p style="margin:0 0 6px;color:#b9aa98;font-size:14px">Hello <strong style="color:#f6eee7">${c.name}</strong>,</p>
    <h2 style="margin:0 0 20px;color:#DAAF37;font-size:18px">📊 Performance Report</h2>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px"><tr>
      <td style="width:33%;padding:12px;background:#1a1512;border-radius:10px 0 0 10px;border:1px solid rgba(218,175,55,.08);text-align:center"><div style="font-size:20px;font-weight:700;color:#DAAF37">${f.totalBookings}</div><div style="font-size:10px;color:#8a7e72;margin-top:2px">Bookings</div></td>
      <td style="width:33%;padding:12px;background:#1a1512;border:1px solid rgba(218,175,55,.08);border-left:0;text-align:center"><div style="font-size:20px;font-weight:700;color:#10b981">${f.completedBookings}</div><div style="font-size:10px;color:#8a7e72;margin-top:2px">Completed</div></td>
      <td style="width:33%;padding:12px;background:#1a1512;border-radius:0 10px 10px 0;border:1px solid rgba(218,175,55,.08);border-left:0;text-align:center"><div style="font-size:20px;font-weight:700;color:#DAAF37">₹${f.totalEarnings.toLocaleString("en-IN")}</div><div style="font-size:10px;color:#8a7e72;margin-top:2px">Earnings</div></td>
    </tr></table>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#1a1512;border:1px solid rgba(218,175,55,.08);border-radius:10px;margin:0 0 20px;font-size:12px">
      <tr><td style="padding:8px 14px;color:#8a7e72;border-bottom:1px solid rgba(255,255,255,.03)">Total Revenue</td><td style="padding:8px 14px;text-align:right;color:#f6eee7;border-bottom:1px solid rgba(255,255,255,.03)">₹${f.totalRevenue.toLocaleString("en-IN")}</td></tr>
      <tr><td style="padding:8px 14px;color:#8a7e72;border-bottom:1px solid rgba(255,255,255,.03)">Cancelled Bookings</td><td style="padding:8px 14px;text-align:right;color:#f6eee7;border-bottom:1px solid rgba(255,255,255,.03)">${f.cancelledBookings}</td></tr>
      <tr><td style="padding:8px 14px;color:#8a7e72;border-bottom:1px solid rgba(255,255,255,.03)">Commission Paid</td><td style="padding:8px 14px;text-align:right;color:#f6eee7;border-bottom:1px solid rgba(255,255,255,.03)">₹${f.totalCommissionPaid.toLocaleString("en-IN")}</td></tr>
      <tr><td style="padding:8px 14px;color:#8a7e72;border-bottom:1px solid rgba(255,255,255,.03)">Pending Commission</td><td style="padding:8px 14px;text-align:right;color:${f.pendingCommission > 0 ? '#f59e0b' : '#f6eee7'};font-weight:${f.pendingCommission > 0 ? '600' : '400'};border-bottom:1px solid rgba(255,255,255,.03)">₹${f.pendingCommission.toLocaleString("en-IN")}</td></tr>
      <tr><td style="padding:8px 14px;color:#8a7e72;border-bottom:1px solid rgba(255,255,255,.03)">Subscription</td><td style="padding:8px 14px;text-align:right;color:#f6eee7;border-bottom:1px solid rgba(255,255,255,.03)">${subStatus} (exp: ${subExpiry})</td></tr>
      <tr><td style="padding:8px 14px;color:#8a7e72">Promotion</td><td style="padding:8px 14px;text-align:right;color:#DAAF37;font-weight:600">${promoStatus}</td></tr>
    </table>
    <p style="margin:0;color:#8a7e72;font-size:10px">ID: ${c.creatorId || '—'} | Generated: ${new Date().toLocaleDateString("en-IN")} ${new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</p>
  </td></tr>
  <tr><td style="padding:0 32px 28px"><table cellpadding="0" cellspacing="0"><tr><td style="background:linear-gradient(135deg,#DAAF37,#F4C542);border-radius:10px;padding:12px 24px"><a href="${SITE_URL}/creator/dashboard.html" style="color:#111;font-size:13px;font-weight:700;text-decoration:none">Open Dashboard →</a></td></tr></table></td></tr>
  <tr><td style="padding:16px 32px;border-top:1px solid rgba(255,255,255,.04)"><p style="margin:0;font-size:10px;color:rgba(255,255,255,.15)">© 2026 BookMyShot | <a href="${SITE_URL}" style="color:rgba(218,175,55,.3)">bookmyshot.in</a></p></td></tr>
</table></td></tr></table></body></html>`;
}

module.exports = router;
