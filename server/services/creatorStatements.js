/**
 * BookMyShot — Monthly Creator Statements
 * 
 * Sends email reports to active creators who have 2+ bookings in the past month.
 * Runs on the 1st of each month at 10 AM IST.
 * 
 * Contains: Bookings, Earnings, Commission, Subscription Status, Promotion Status
 */
const Creator = require("../models/Creator");
const Booking = require("../models/Booking");
const Commission = require("../models/Commission");
const emailService = require("./emailService");

const SITE_URL = process.env.SITE_URL || "https://site--bookmyshot--ykz2mr8mzlrv.code.run";

/**
 * Generate and send monthly statements to qualifying creators
 */
async function sendMonthlyStatements() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1); // Previous month start
  const monthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59); // Previous month end
  const monthName = monthStart.toLocaleDateString("en-IN", { month: "long", year: "numeric" });

  console.log(`[Statements] Generating statements for ${monthName}...`);

  // Find creators with 2+ bookings in the past month
  const creatorsWithBookings = await Booking.aggregate([
    { $match: { createdAt: { $gte: monthStart, $lte: monthEnd } } },
    { $group: { _id: "$creator", bookingCount: { $sum: 1 }, totalRevenue: { $sum: { $ifNull: ["$amount", "$budget"] } } } },
    { $match: { bookingCount: { $gte: 2 } } },
  ]);

  if (!creatorsWithBookings.length) {
    console.log("[Statements] No qualifying creators (2+ bookings) this month.");
    return { sent: 0, total: 0 };
  }

  let sent = 0;
  let failed = 0;

  for (const agg of creatorsWithBookings) {
    try {
      const creator = await Creator.findById(agg._id).populate("user", "name email");
      if (!creator || !creator.user?.email || creator.status === "deleted") continue;

      // Get detailed stats for this creator
      const bookings = await Booking.find({ creator: creator._id, createdAt: { $gte: monthStart, $lte: monthEnd } }).sort("-createdAt").lean();
      const commissions = await Commission.find({ creator: creator._id, createdAt: { $gte: monthStart, $lte: monthEnd } }).lean();

      const completedBookings = bookings.filter(b => b.status === "Completed").length;
      const pendingBookings = bookings.filter(b => ["Pending", "Creator Accepted"].includes(b.status)).length;
      const totalEarnings = commissions.filter(c => c.status === "paid").reduce((s, c) => s + (c.creatorEarning || 0), 0);
      const totalCommission = commissions.filter(c => c.status === "paid").reduce((s, c) => s + (c.commissionAmount || 0), 0);
      const pendingCommission = commissions.filter(c => c.status === "pending").reduce((s, c) => s + (c.commissionAmount || 0), 0);

      // Build email
      const html = buildStatementEmail({
        name: creator.user.name,
        monthName,
        totalBookings: agg.bookingCount,
        completedBookings,
        pendingBookings,
        totalRevenue: agg.totalRevenue || 0,
        totalEarnings,
        totalCommission,
        pendingCommission,
        subscriptionStatus: creator.subscriptionStatus,
        subscriptionEndDate: creator.subscriptionEndDate,
        rank: creator.rank,
        featured: creator.featured,
        creatorId: creator.creatorId,
      });

      await emailService.sendEmail({
        to: creator.user.email,
        subject: `📊 Your Monthly Report — ${monthName} | BookMyShot`,
        html,
        type: "statement",
        userId: creator.user._id,
        creatorId: creator._id,
        meta: { month: monthName, bookings: agg.bookingCount },
      });
      sent++;
    } catch (e) {
      console.error(`[Statements] Error for creator ${agg._id}:`, e.message);
      failed++;
    }
  }

  console.log(`[Statements] Sent: ${sent}, Failed: ${failed}, Total qualifying: ${creatorsWithBookings.length}`);
  return { sent, failed, total: creatorsWithBookings.length };
}

function buildStatementEmail({ name, monthName, totalBookings, completedBookings, pendingBookings, totalRevenue, totalEarnings, totalCommission, pendingCommission, subscriptionStatus, subscriptionEndDate, rank, featured, creatorId }) {
  const subStatus = subscriptionStatus === "active" ? "✅ Active" : subscriptionStatus === "trial" ? "🎁 Trial" : "⚠️ " + (subscriptionStatus || "Inactive");
  const subExpiry = subscriptionEndDate ? new Date(subscriptionEndDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
  const promoStatus = rank ? `#${rank} Ranked` : featured ? "⭐ Featured" : "—";

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#0a0806;font-family:'Segoe UI',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0806;padding:24px 16px"><tr><td align="center">
<table width="580" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%;background:#111;border-radius:16px;overflow:hidden;border:1px solid rgba(218,175,55,.12)">
  <tr><td style="background:linear-gradient(135deg,#1a1410,#0d0b08);padding:24px 32px;border-bottom:1px solid rgba(218,175,55,.15)">
    <span style="font-size:22px;font-weight:700;color:#DAAF37">BookMyShot</span>
    <span style="float:right;font-size:11px;color:#8a7e72;margin-top:6px">Monthly Statement</span>
  </td></tr>
  <tr><td style="height:3px;background:linear-gradient(90deg,#DAAF37,#F4C542,#DAAF37)"></td></tr>
  <tr><td style="padding:32px">
    <p style="margin:0 0 6px;color:#b9aa98;font-size:14px">Hello <strong style="color:#f6eee7">${name}</strong>,</p>
    <h2 style="margin:0 0 20px;color:#DAAF37;font-size:18px">📊 Your ${monthName} Report</h2>
    <p style="margin:0 0 20px;color:#d4c8bc;font-size:13px">Here's a summary of your activity and earnings for ${monthName}.</p>

    <!-- Stats Grid -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px">
      <tr>
        <td style="width:50%;padding:12px;background:#1a1512;border-radius:10px 0 0 0;border:1px solid rgba(218,175,55,.08)">
          <div style="font-size:22px;font-weight:700;color:#DAAF37">${totalBookings}</div>
          <div style="font-size:11px;color:#8a7e72;margin-top:2px">Total Bookings</div>
        </td>
        <td style="width:50%;padding:12px;background:#1a1512;border-radius:0 10px 0 0;border:1px solid rgba(218,175,55,.08);border-left:0">
          <div style="font-size:22px;font-weight:700;color:#10b981">${completedBookings}</div>
          <div style="font-size:11px;color:#8a7e72;margin-top:2px">Completed</div>
        </td>
      </tr>
      <tr>
        <td style="width:50%;padding:12px;background:#1a1512;border-radius:0 0 0 10px;border:1px solid rgba(218,175,55,.08);border-top:0">
          <div style="font-size:22px;font-weight:700;color:#f6eee7">₹${totalRevenue.toLocaleString("en-IN")}</div>
          <div style="font-size:11px;color:#8a7e72;margin-top:2px">Total Revenue</div>
        </td>
        <td style="width:50%;padding:12px;background:#1a1512;border-radius:0 0 10px 0;border:1px solid rgba(218,175,55,.08);border-top:0;border-left:0">
          <div style="font-size:22px;font-weight:700;color:#DAAF37">₹${totalEarnings.toLocaleString("en-IN")}</div>
          <div style="font-size:11px;color:#8a7e72;margin-top:2px">Your Earnings</div>
        </td>
      </tr>
    </table>

    <!-- Details -->
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#1a1512;border:1px solid rgba(218,175,55,.08);border-radius:10px;margin:0 0 24px">
      <tr><td style="padding:10px 16px;color:#8a7e72;font-size:12px;border-bottom:1px solid rgba(255,255,255,.04)">Pending Bookings</td><td style="padding:10px 16px;text-align:right;color:#f6eee7;font-size:13px;border-bottom:1px solid rgba(255,255,255,.04)">${pendingBookings}</td></tr>
      <tr><td style="padding:10px 16px;color:#8a7e72;font-size:12px;border-bottom:1px solid rgba(255,255,255,.04)">Platform Commission</td><td style="padding:10px 16px;text-align:right;color:#f6eee7;font-size:13px;border-bottom:1px solid rgba(255,255,255,.04)">₹${totalCommission.toLocaleString("en-IN")}</td></tr>
      <tr><td style="padding:10px 16px;color:#8a7e72;font-size:12px;border-bottom:1px solid rgba(255,255,255,.04)">Pending Commission</td><td style="padding:10px 16px;text-align:right;color:${pendingCommission > 0 ? '#f59e0b' : '#f6eee7'};font-size:13px;font-weight:${pendingCommission > 0 ? '600' : '400'};border-bottom:1px solid rgba(255,255,255,.04)">₹${pendingCommission.toLocaleString("en-IN")}</td></tr>
      <tr><td style="padding:10px 16px;color:#8a7e72;font-size:12px;border-bottom:1px solid rgba(255,255,255,.04)">Subscription</td><td style="padding:10px 16px;text-align:right;color:#f6eee7;font-size:13px;border-bottom:1px solid rgba(255,255,255,.04)">${subStatus}</td></tr>
      <tr><td style="padding:10px 16px;color:#8a7e72;font-size:12px;border-bottom:1px solid rgba(255,255,255,.04)">Sub. Expiry</td><td style="padding:10px 16px;text-align:right;color:#f6eee7;font-size:13px;border-bottom:1px solid rgba(255,255,255,.04)">${subExpiry}</td></tr>
      <tr><td style="padding:10px 16px;color:#8a7e72;font-size:12px">Promotion</td><td style="padding:10px 16px;text-align:right;color:#DAAF37;font-size:13px;font-weight:600">${promoStatus}</td></tr>
    </table>

    <p style="margin:0 0 4px;color:#8a7e72;font-size:11px">Creator ID: ${creatorId || '—'}</p>
  </td></tr>
  <tr><td style="padding:0 32px 32px"><table cellpadding="0" cellspacing="0"><tr><td style="background:linear-gradient(135deg,#DAAF37,#F4C542);border-radius:10px;padding:13px 28px"><a href="${SITE_URL}/creator/dashboard.html" style="color:#111;font-size:14px;font-weight:700;text-decoration:none">Open Dashboard →</a></td></tr></table></td></tr>
  <tr><td style="padding:20px 32px;border-top:1px solid rgba(255,255,255,.04)">
    <p style="margin:0;font-size:10px;color:rgba(255,255,255,.2)">This is an automated monthly statement from BookMyShot. You received this because you had 2+ bookings in ${monthName}.</p>
    <p style="margin:4px 0 0;font-size:10px;color:rgba(255,255,255,.15)">© 2026 BookMyShot. All rights reserved. | <a href="${SITE_URL}" style="color:rgba(218,175,55,.4)">bookmyshot.in</a></p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}

module.exports = { sendMonthlyStatements };
