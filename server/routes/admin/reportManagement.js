/**
 * Admin Report Management — Creator Financial Statements
 * 
 * PRIMARY FOCUS: Customer Payment Ledger
 * Shows creators: who paid, how much, when, and what's outstanding.
 * 
 * Report types: 7 days, 30 days, current_month, previous_month, lifetime
 */
const express = require("express");
const router = express.Router();
const Creator = require("../../models/Creator");
const Booking = require("../../models/Booking");
const Commission = require("../../models/Commission");
const PaymentProof = require("../../models/PaymentProof");
const EmailLog = require("../../models/EmailLog");
const { sendMonthlyStatements } = require("../../services/creatorStatements");
const emailService = require("../../services/emailService");

const SITE_URL = process.env.SITE_URL || "https://site--bookmyshot--ykz2mr8mzlrv.code.run";

// GET / — Report send history
router.get("/", async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const logs = await EmailLog.find({ type: "statement" }).sort("-createdAt").limit(limit).lean();
    const stats = {
      total: await EmailLog.countDocuments({ type: "statement" }),
      sent: await EmailLog.countDocuments({ type: "statement", status: "sent" }),
      failed: await EmailLog.countDocuments({ type: "statement", status: "failed" }),
    };
    res.json({ success: true, data: logs, stats });
  } catch (e) { next(e); }
});

// GET /stats
router.get("/stats", async (req, res, next) => {
  try {
    const thisMonth = new Date(); thisMonth.setDate(1); thisMonth.setHours(0,0,0,0);
    const monthlyStats = await EmailLog.aggregate([{ $match: { type: "statement", createdAt: { $gte: thisMonth } } }, { $group: { _id: "$status", count: { $sum: 1 } } }]);
    const allTime = await EmailLog.aggregate([{ $match: { type: "statement" } }, { $group: { _id: "$status", count: { $sum: 1 } } }]);
    res.json({ success: true, data: { thisMonth: Object.fromEntries(monthlyStats.map(s => [s._id, s.count])), allTime: Object.fromEntries(allTime.map(s => [s._id, s.count])), totalReports: await EmailLog.countDocuments({ type: "statement" }) } });
  } catch (e) { next(e); }
});

// POST /send/:creatorId — Send live financial statement
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
      html, type: "statement", userId: creator.user._id, creatorId: creator._id,
      meta: { triggeredBy: req.user._id, triggeredByName: req.user.name || "Admin", period, periodLabel: reportData.periodLabel, type: "live_report" },
    });
    res.json({ success: true, message: `Report sent to ${creator.user.email}`, emailResult: result });
  } catch (e) { next(e); }
});

// POST /send-all
router.post("/send-all", async (req, res, next) => {
  try { const result = await sendMonthlyStatements(); res.json({ success: true, message: "Monthly statements triggered", ...result }); } catch (e) { next(e); }
});

// POST /resend/:logId
router.post("/resend/:logId", async (req, res, next) => {
  try {
    const log = await EmailLog.findById(req.params.logId);
    if (!log || !log.creator) return res.status(404).json({ success: false, message: "Report not found" });
    const creator = await Creator.findById(log.creator).populate("user", "name email phone");
    if (!creator?.user?.email) return res.status(400).json({ success: false, message: "Creator email not found" });
    const period = log.meta?.period || "lifetime";
    const reportData = await generateReportData(creator, period);
    const html = buildFinancialStatementEmail(reportData);
    const result = await emailService.sendEmail({ to: creator.user.email, subject: `📊 Financial Statement (${reportData.periodLabel}) | BookMyShot`, html, type: "statement", userId: creator.user._id, creatorId: creator._id, meta: { triggeredBy: req.user._id, type: "resend", period } });
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
    case "7days": dateFrom = new Date(now - 7*86400000); periodLabel = "Last 7 Days"; break;
    case "30days": dateFrom = new Date(now - 30*86400000); periodLabel = "Last 30 Days"; break;
    case "current_month": dateFrom = new Date(now.getFullYear(), now.getMonth(), 1); periodLabel = now.toLocaleDateString("en-IN",{month:"long",year:"numeric"}); break;
    case "previous_month": dateFrom = new Date(now.getFullYear(), now.getMonth()-1, 1); dateTo = new Date(now.getFullYear(), now.getMonth(), 0, 23,59,59); periodLabel = dateFrom.toLocaleDateString("en-IN",{month:"long",year:"numeric"}); break;
    default: dateFrom = new Date(0); periodLabel = "Lifetime (All Time)";
  }

  let allBookings = [], periodBookings = [], paymentProofs = [];
  try { allBookings = await Booking.find({ creator: creator._id }).populate("user","name phone").sort("-createdAt").lean(); } catch {}
  try { paymentProofs = await PaymentProof.find({ creator: creator._id, status: "verified" }).populate("user","name").populate("booking","eventType clientName").sort("-createdAt").lean(); } catch {}

  periodBookings = allBookings.filter(b => { const d = new Date(b.createdAt); return d >= dateFrom && d <= dateTo; });

  // CUSTOMER PAYMENT LEDGER — from bookings
  const lifetimeBookingValue = allBookings.reduce((s,b) => s + (b.amount || b.budget || 0), 0);
  const lifetimeReceived = allBookings.reduce((s,b) => s + (b.advancePaid || 0), 0) + paymentProofs.reduce((s,p) => s + (p.amount || 0), 0);
  const lifetimeOutstanding = lifetimeBookingValue - lifetimeReceived;

  // Build customer payment ledger entries
  const paymentLedger = allBookings.map(b => ({
    date: b.createdAt,
    client: b.clientName || b.user?.name || "—",
    event: b.eventType || "Booking",
    totalAmount: b.amount || b.budget || 0,
    received: b.advancePaid || 0,
    balanceDue: (b.amount || b.budget || 0) - (b.advancePaid || 0),
    paymentStatus: b.paymentStatus || "unpaid",
    bookingStatus: b.status || "—",
  })).filter(b => b.totalAmount > 0);

  // Individual payment receipts from PaymentProof
  const paymentReceipts = paymentProofs.map(p => ({
    date: p.createdAt,
    client: p.booking?.clientName || p.user?.name || "Client",
    amount: p.amount || 0,
    transactionId: p.transactionId || "—",
    event: p.booking?.eventType || "—",
    status: p.status,
  }));

  return {
    creator: { name: creator.user?.name, email: creator.user?.email, phone: creator.user?.phone, creatorId: creator.creatorId, subscriptionStatus: creator.subscriptionStatus, subscriptionEndDate: creator.subscriptionEndDate, rank: creator.rank, featured: creator.featured },
    period, periodLabel, dateFrom, dateTo, generatedAt: now,
    // Lifetime summary
    lifetime: { bookingValue: lifetimeBookingValue, amountReceived: lifetimeReceived, outstanding: lifetimeOutstanding, totalBookings: allBookings.length, completedBookings: allBookings.filter(b=>b.status==="Completed").length, cancelledBookings: allBookings.filter(b=>["Cancelled","cancelled"].includes(b.status)).length, paidBookings: allBookings.filter(b=>b.paymentStatus==="paid"||b.paymentStatus==="verified").length },
    // Period stats
    periodStats: { bookings: periodBookings.length, completed: periodBookings.filter(b=>b.status==="Completed").length, revenue: periodBookings.reduce((s,b)=>s+(b.amount||b.budget||0),0), received: periodBookings.reduce((s,b)=>s+(b.advancePaid||0),0) },
    // Ledger data
    paymentLedger: paymentLedger.slice(0, 20),
    paymentReceipts: paymentReceipts.slice(0, 15),
  };
}

// ═══════════════════════════════════════════════════════════════
// HELPER: Build professional financial statement email
// ═══════════════════════════════════════════════════════════════
function buildFinancialStatementEmail(data) {
  const { creator, periodLabel, generatedAt, lifetime, periodStats, paymentLedger, paymentReceipts } = data;
  const genDate = new Date(generatedAt).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"});
  const subStatus = creator.subscriptionStatus === "active" ? "Active" : creator.subscriptionStatus === "trial" ? "Trial" : (creator.subscriptionStatus || "Inactive");
  const fmt = (n) => "₹" + (n || 0).toLocaleString("en-IN");

  const ledgerRows = paymentLedger.map(b => {
    const statusColor = b.paymentStatus === "paid" || b.paymentStatus === "verified" ? "#10b981" : b.paymentStatus === "partial" ? "#f59e0b" : "#ef4444";
    const statusLabel = b.paymentStatus === "paid" || b.paymentStatus === "verified" ? "Paid" : b.paymentStatus === "partial" ? "Partial" : b.paymentStatus === "proof-submitted" ? "Proof Sent" : "Unpaid";
    return `<tr><td style="padding:5px 6px;color:#b9aa98;font-size:10px;border-bottom:1px solid rgba(255,255,255,.025)">${new Date(b.date).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"2-digit"})}</td><td style="padding:5px 6px;color:#f6eee7;font-size:10px;border-bottom:1px solid rgba(255,255,255,.025)">${b.client}</td><td style="padding:5px 6px;color:#d4c8bc;font-size:10px;border-bottom:1px solid rgba(255,255,255,.025)">${b.event}</td><td style="padding:5px 6px;text-align:right;color:#f6eee7;font-size:10px;border-bottom:1px solid rgba(255,255,255,.025)">${fmt(b.totalAmount)}</td><td style="padding:5px 6px;text-align:right;color:#10b981;font-size:10px;border-bottom:1px solid rgba(255,255,255,.025)">${fmt(b.received)}</td><td style="padding:5px 6px;text-align:right;color:${b.balanceDue>0?'#f59e0b':'#10b981'};font-size:10px;border-bottom:1px solid rgba(255,255,255,.025)">${fmt(b.balanceDue)}</td><td style="padding:5px 6px;text-align:center;font-size:9px;border-bottom:1px solid rgba(255,255,255,.025);color:${statusColor};font-weight:600">${statusLabel}</td></tr>`;
  }).join("");

  const receiptRows = paymentReceipts.map(p =>
    `<tr><td style="padding:5px 6px;color:#b9aa98;font-size:10px;border-bottom:1px solid rgba(255,255,255,.025)">${new Date(p.date).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"2-digit"})}</td><td style="padding:5px 6px;color:#f6eee7;font-size:10px;border-bottom:1px solid rgba(255,255,255,.025)">${p.client}</td><td style="padding:5px 6px;color:#d4c8bc;font-size:10px;border-bottom:1px solid rgba(255,255,255,.025)">${p.event}</td><td style="padding:5px 6px;text-align:right;color:#10b981;font-size:10px;font-weight:600;border-bottom:1px solid rgba(255,255,255,.025)">${fmt(p.amount)}</td><td style="padding:5px 6px;color:#8a7e72;font-size:9px;border-bottom:1px solid rgba(255,255,255,.025)">${p.transactionId}</td><td style="padding:5px 6px;text-align:center;color:#10b981;font-size:9px;border-bottom:1px solid rgba(255,255,255,.025)">✓ Verified</td></tr>`
  ).join("");

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#0a0806;font-family:'Segoe UI',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0806;padding:16px 8px"><tr><td align="center">
<table width="640" cellpadding="0" cellspacing="0" style="max-width:640px;width:100%;background:#111;border-radius:14px;overflow:hidden;border:1px solid rgba(218,175,55,.12)">
  <!-- Header -->
  <tr><td style="background:linear-gradient(135deg,#1a1410,#0d0b08);padding:16px 22px;border-bottom:1px solid rgba(218,175,55,.15)">
    <table width="100%"><tr><td><span style="font-size:17px;font-weight:700;color:#DAAF37">BookMyShot</span><br><span style="font-size:8px;color:#8a7e72;letter-spacing:1px">FINANCIAL STATEMENT</span></td><td style="text-align:right;font-size:9px;color:#8a7e72">${genDate}<br>${periodLabel}</td></tr></table>
  </td></tr>
  <tr><td style="height:2px;background:linear-gradient(90deg,#DAAF37,#F4C542,#DAAF37)"></td></tr>

  <tr><td style="padding:20px 22px">
    <!-- Creator Info -->
    <table width="100%" style="margin:0 0 14px;font-size:10px"><tr><td style="color:#8a7e72">Creator: <strong style="color:#f6eee7">${creator.name}</strong> | ID: <span style="color:#DAAF37">${creator.creatorId||'—'}</span></td><td style="text-align:right;color:#8a7e72">Sub: ${subStatus}</td></tr></table>

    <!-- ═══ CUSTOMER PAYMENT OVERVIEW ═══ -->
    <div style="background:linear-gradient(135deg,#1a1714,#12100e);border:1px solid rgba(218,175,55,.12);border-radius:10px;padding:14px;margin:0 0 16px">
      <div style="font-size:9px;font-weight:700;color:#DAAF37;letter-spacing:1px;margin:0 0 10px">💰 CUSTOMER PAYMENT OVERVIEW</div>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="padding:5px 0;color:#8a7e72;font-size:11px">Lifetime Booking Value</td><td style="padding:5px 0;text-align:right;color:#f6eee7;font-size:12px;font-weight:700">${fmt(lifetime.bookingValue)}</td></tr>
        <tr><td style="padding:5px 0;color:#8a7e72;font-size:11px;border-top:1px solid rgba(255,255,255,.03)">Total Amount Received From Clients</td><td style="padding:5px 0;text-align:right;color:#10b981;font-size:12px;font-weight:700;border-top:1px solid rgba(255,255,255,.03)">${fmt(lifetime.amountReceived)}</td></tr>
        <tr><td style="padding:5px 0;color:#8a7e72;font-size:11px;border-top:1px solid rgba(255,255,255,.03)">Outstanding Amount (Yet To Collect)</td><td style="padding:5px 0;text-align:right;color:${lifetime.outstanding>0?'#f59e0b':'#10b981'};font-size:12px;font-weight:700;border-top:1px solid rgba(255,255,255,.03)">${fmt(lifetime.outstanding)}</td></tr>
        <tr><td style="padding:5px 0;color:#8a7e72;font-size:11px;border-top:1px solid rgba(255,255,255,.03)">Total Bookings / Paid / Completed</td><td style="padding:5px 0;text-align:right;color:#f6eee7;font-size:11px;border-top:1px solid rgba(255,255,255,.03)">${lifetime.totalBookings} / ${lifetime.paidBookings} / ${lifetime.completedBookings}</td></tr>
      </table>
    </div>

    <!-- Period Quick Stats -->
    <table width="100%" cellpadding="0" cellspacing="3" style="margin:0 0 14px">
      <tr>
        <td style="padding:8px;background:#1a1512;border-radius:6px;text-align:center;border:1px solid rgba(218,175,55,.04)"><div style="font-size:15px;font-weight:700;color:#DAAF37">${periodStats.bookings}</div><div style="font-size:8px;color:#8a7e72">${periodLabel} Bookings</div></td>
        <td style="padding:8px;background:#1a1512;border-radius:6px;text-align:center;border:1px solid rgba(218,175,55,.04)"><div style="font-size:15px;font-weight:700;color:#10b981">${periodStats.completed}</div><div style="font-size:8px;color:#8a7e72">Completed</div></td>
        <td style="padding:8px;background:#1a1512;border-radius:6px;text-align:center;border:1px solid rgba(218,175,55,.04)"><div style="font-size:15px;font-weight:700;color:#f6eee7">${fmt(periodStats.revenue)}</div><div style="font-size:8px;color:#8a7e72">Period Value</div></td>
        <td style="padding:8px;background:#1a1512;border-radius:6px;text-align:center;border:1px solid rgba(218,175,55,.04)"><div style="font-size:15px;font-weight:700;color:#10b981">${fmt(periodStats.received)}</div><div style="font-size:8px;color:#8a7e72">Received</div></td>
      </tr>
    </table>

    ${paymentLedger.length > 0 ? `
    <!-- ═══ CUSTOMER PAYMENT LEDGER ═══ -->
    <div style="font-size:9px;font-weight:700;color:#DAAF37;letter-spacing:0.5px;margin:0 0 5px">📋 CUSTOMER PAYMENT LEDGER</div>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#1a1512;border:1px solid rgba(218,175,55,.05);border-radius:6px;margin:0 0 14px">
      <tr style="background:rgba(218,175,55,.04)"><td style="padding:4px 6px;color:#DAAF37;font-size:8px;font-weight:600">Date</td><td style="padding:4px 6px;color:#DAAF37;font-size:8px;font-weight:600">Client</td><td style="padding:4px 6px;color:#DAAF37;font-size:8px;font-weight:600">Event</td><td style="padding:4px 6px;text-align:right;color:#DAAF37;font-size:8px;font-weight:600">Total</td><td style="padding:4px 6px;text-align:right;color:#DAAF37;font-size:8px;font-weight:600">Received</td><td style="padding:4px 6px;text-align:right;color:#DAAF37;font-size:8px;font-weight:600">Balance</td><td style="padding:4px 6px;text-align:center;color:#DAAF37;font-size:8px;font-weight:600">Status</td></tr>
      ${ledgerRows}
    </table>` : '<p style="color:#8a7e72;font-size:11px;margin:0 0 14px">No booking/payment records yet.</p>'}

    ${paymentReceipts.length > 0 ? `
    <!-- ═══ VERIFIED PAYMENT RECEIPTS ═══ -->
    <div style="font-size:9px;font-weight:700;color:#10b981;letter-spacing:0.5px;margin:0 0 5px">💳 VERIFIED PAYMENT RECEIPTS</div>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#1a1512;border:1px solid rgba(16,185,129,.06);border-radius:6px;margin:0 0 14px">
      <tr style="background:rgba(16,185,129,.04)"><td style="padding:4px 6px;color:#10b981;font-size:8px;font-weight:600">Date</td><td style="padding:4px 6px;color:#10b981;font-size:8px;font-weight:600">Client</td><td style="padding:4px 6px;color:#10b981;font-size:8px;font-weight:600">Event</td><td style="padding:4px 6px;text-align:right;color:#10b981;font-size:8px;font-weight:600">Amount</td><td style="padding:4px 6px;color:#10b981;font-size:8px;font-weight:600">Txn ID</td><td style="padding:4px 6px;text-align:center;color:#10b981;font-size:8px;font-weight:600">Status</td></tr>
      ${receiptRows}
    </table>` : ''}

  </td></tr>
  <!-- CTA -->
  <tr><td style="padding:0 22px 18px"><table cellpadding="0" cellspacing="0"><tr><td style="background:linear-gradient(135deg,#DAAF37,#F4C542);border-radius:8px;padding:10px 20px"><a href="${SITE_URL}/creator/dashboard.html" style="color:#111;font-size:12px;font-weight:700;text-decoration:none">Open Dashboard →</a></td></tr></table></td></tr>
  <!-- Footer -->
  <tr><td style="padding:12px 22px;border-top:1px solid rgba(255,255,255,.04);background:rgba(0,0,0,.2)">
    <p style="margin:0;font-size:8px;color:rgba(255,255,255,.2)">Official financial statement generated from live BookMyShot data. Save this email as a permanent record. For discrepancies contact support@bookmyshot.in.</p>
    <p style="margin:3px 0 0;font-size:7px;color:rgba(255,255,255,.1)">© 2026 BookMyShot | bookmyshot.in</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}

module.exports = router;
