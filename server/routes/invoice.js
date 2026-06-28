/**
 * BookMyShot — Luxury Dark Invoice (Matte Black + Orange Theme)
 * GET /api/invoice/:id
 */
const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const Booking = require("../models/Booking");
const Creator = require("../models/Creator");
const User = require("../models/User");
const PaymentRecord = require("../models/PaymentRecord");

async function authenticateRequest(req) {
  let token = null;
  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) token = req.headers.authorization.split(" ")[1];
  if (!token && req.headers["x-access-token"]) token = req.headers["x-access-token"];
  if (!token && req.query.token) token = req.query.token;
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return await User.findById(decoded.id).select("-password");
  } catch (e) { return null; }
}

router.get("/:id", async (req, res, next) => {
  try {
    const user = await authenticateRequest(req);
    if (!user) return res.status(401).json({ success: false, message: "Authentication required. Please login first." });

    const booking = await Booking.findById(req.params.id)
      .populate("user", "name email phone")
      .populate({ path: "creator", populate: { path: "user", select: "name email phone avatar" }, select: "user specialty city businessName" });
    if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });

    const userId = user._id.toString();
    const bookingUserId = (booking.user?._id || booking.user || "").toString();
    const creatorUserId = (booking.creator?.user?._id || "").toString();
    if (userId !== bookingUserId && userId !== creatorUserId && user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const payments = await PaymentRecord.find({ booking: booking._id, status: "approved" }).sort("createdAt").lean();
    const totalPaid = payments.reduce((s, r) => s + (r.amount || 0), 0);
    const amt = booking.amount || booking.budget || 0;
    const fd = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "\u2014";
    const fc = (n) => "\u20B9" + (n || 0).toLocaleString("en-IN");
    const cName = booking.creator?.user?.name || "\u2014";
    const cPhone = booking.creator?.user?.phone || "";
    const cEmail = booking.creator?.user?.email || "";
    const cCity = booking.creator?.city || "";
    const cSpec = booking.creator?.specialty || "";
    const cuName = booking.clientName || booking.user?.name || "\u2014";
    const cuPhone = booking.clientPhone || booking.user?.phone || "";
    const cuEmail = booking.clientEmail || booking.user?.email || "";
    const cuLocation = booking.eventLocation || "";
    const invNo = booking.invoiceNumber || "BMS-" + booking._id.toString().slice(-8).toUpperCase();

    const payRows = payments.map((p, i) =>
      `<tr style="background:${i % 2 === 0 ? '#0A0A0A' : '#111'}"><td>${fd(p.createdAt)}</td><td style="color:#F97316;font-weight:600">${fc(p.amount)}</td><td style="text-transform:capitalize">${p.paymentType || "\u2014"}</td><td style="text-transform:capitalize">${p.addedBy || "\u2014"}</td><td><span style="background:rgba(34,197,94,0.15);color:#22C55E;padding:3px 10px;border-radius:4px;font-size:10px;font-weight:600">Approved</span></td></tr>`
    ).join("");

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Invoice ${invNo}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',system-ui,sans-serif;background:#0A0A0A;color:#fff;padding:0}
.page{max-width:800px;margin:0 auto;padding:30px 28px}
.card{background:#111;border:1px solid #F97316;border-radius:14px;padding:20px;margin-bottom:16px}
.card-dark{background:#111;border:1px solid #2B2B2B;border-radius:14px;padding:18px;margin-bottom:16px}
.header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;flex-wrap:wrap;gap:16px}
.logo-sec{display:flex;align-items:center;gap:14px}
.logo-circle{width:60px;height:60px;border-radius:50%;background:linear-gradient(135deg,#F97316,#EA580C);display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:900;color:#fff;border:2px solid #FB923C}
.brand-text .brand-name{font-size:26px;font-weight:800;color:#fff;letter-spacing:-0.5px}
.brand-text .brand-name span{color:#F97316}
.brand-text .tagline{font-size:10px;color:#8A8A8A;margin-top:2px}
.contact-bar{display:flex;gap:16px;font-size:10px;color:#8A8A8A;margin-top:6px;flex-wrap:wrap}
.contact-bar span{color:#CFCFCF}
.inv-card{background:#111;border:2px solid #F97316;border-radius:12px;padding:14px 18px;text-align:center;min-width:220px}
.inv-card .inv-label{font-size:10px;color:#F97316;font-weight:700;letter-spacing:2px;text-transform:uppercase}
.inv-card .inv-no{font-size:14px;font-weight:700;color:#fff;margin-top:4px}
.inv-card .inv-dates{font-size:10px;color:#8A8A8A;margin-top:6px;line-height:1.6}
.paid-badge{display:inline-flex;align-items:center;gap:6px;background:rgba(34,197,94,0.1);border:1px solid #22C55E;color:#22C55E;font-size:11px;font-weight:700;padding:6px 14px;border-radius:8px;margin-top:8px}
.sec-title{font-size:14px;font-weight:700;color:#F97316;margin-bottom:12px;display:flex;align-items:center;gap:8px}
.sec-title::before{content:'';width:4px;height:16px;background:#F97316;border-radius:2px}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.party-card{background:#0A0A0A;border:1px solid #2B2B2B;border-radius:12px;padding:16px}
.party-card .p-label{font-size:9px;color:#F97316;text-transform:uppercase;letter-spacing:1.5px;font-weight:700;margin-bottom:8px}
.party-card .p-name{font-size:15px;font-weight:700;color:#fff}
.party-card .p-info{font-size:11px;color:#8A8A8A;margin-top:6px;line-height:1.8}
.party-card .p-info span{color:#CFCFCF}
.event-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px}
.ev-item{background:#0A0A0A;border:1px solid #2B2B2B;border-radius:10px;padding:12px}
.ev-item .ev-label{font-size:9px;color:#8A8A8A;text-transform:uppercase;letter-spacing:0.5px}
.ev-item .ev-val{font-size:12px;color:#fff;font-weight:600;margin-top:4px}
.sum-row{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #2B2B2B;font-size:13px}
.sum-row:last-child{border:none;padding-top:14px;margin-top:6px;border-top:2px solid #F97316}
.sum-row .label{color:#CFCFCF}.sum-row .val{font-weight:700;color:#fff}
.sum-row.green .val{color:#22C55E}.sum-row.orange .val{color:#F97316}.sum-row.red .val{color:#EF4444}
.sum-row.total .label{font-size:15px;font-weight:700;color:#F97316}.sum-row.total .val{font-size:16px;color:#FB923C}
table{width:100%;border-collapse:collapse;font-size:11px;border-radius:10px;overflow:hidden;border:1px solid #2B2B2B}
th{text-align:left;padding:10px 12px;background:#171717;color:#F97316;font-size:9px;text-transform:uppercase;letter-spacing:1px;font-weight:700}
td{padding:10px 12px;border-bottom:1px solid #1a1a1a;color:#CFCFCF}
.status-bar{background:linear-gradient(135deg,#F97316,#EA580C);border-radius:12px;padding:16px;text-align:center;margin:16px 0;color:#fff;font-weight:700;font-size:14px;display:flex;align-items:center;justify-content:center;gap:8px}
.qr-sec{display:flex;align-items:center;gap:16px;background:#111;border:1px solid #2B2B2B;border-radius:12px;padding:16px;margin:16px 0}
.qr-sec img{width:80px;height:80px;border-radius:8px;border:2px solid #F97316;padding:3px;background:#fff}
.qr-text .qr-label{font-size:12px;font-weight:600;color:#CFCFCF}.qr-text .qr-sub{font-size:10px;color:#8A8A8A;margin-top:4px;line-height:1.6}
.footer{text-align:center;padding:20px 0;border-top:1px solid #2B2B2B;margin-top:8px}
.footer .ty{font-size:20px;font-style:italic;color:#F97316;font-weight:700;margin-bottom:4px}
.footer .f-brand{font-size:12px;color:#CFCFCF;margin-top:4px}
.footer .f-sub{font-size:10px;color:#8A8A8A;margin-top:4px}
.print-btn{display:block;margin:0 auto 16px;padding:12px 32px;background:#F97316;color:#000;border:none;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit}
@media print{.print-btn{display:none}body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
@media(max-width:600px){.grid2{grid-template-columns:1fr}.event-grid{grid-template-columns:1fr 1fr}.header{flex-direction:column}.page{padding:16px 14px}}
</style></head><body>
<div class="page">
<button class="print-btn" onclick="window.print()">Download / Print Invoice</button>

<div class="header">
<div>
<div class="logo-sec">
<div class="logo-circle">BM</div>
<div class="brand-text">
<div class="brand-name">Book<span>MyShot</span></div>
<div class="tagline">Premium Wedding Photography & Videography Marketplace</div>
</div>
</div>
<div class="contact-bar"><span>bookmyshot.in</span> | <span>support@bookmyshot.in</span> | <span>+91 8492922173</span></div>
</div>
<div class="inv-card">
<div class="inv-label">INVOICE</div>
<div class="inv-no">${invNo}</div>
<div class="inv-dates">Date: ${fd(booking.completedAt || new Date())}<br>Booking Date: ${fd(booking.createdAt)}</div>
<div class="paid-badge">\u2705 PAYMENT COMPLETED</div>
</div>
</div>

<div class="card">
<div class="sec-title">PARTIES</div>
<div class="grid2">
<div class="party-card">
<div class="p-label">Creator / Service Provider</div>
<div class="p-name">${cName}</div>
<div class="p-info">${cPhone ? '\u260E <span>' + cPhone + '</span><br>' : ''}${cEmail ? '\u2709 <span>' + cEmail + '</span><br>' : ''}${cCity ? '\uD83D\uDCCD <span>' + cCity + '</span>' : ''}</div>
</div>
<div class="party-card">
<div class="p-label">Customer / Client</div>
<div class="p-name">${cuName}</div>
<div class="p-info">${cuPhone ? '\u260E <span>' + cuPhone + '</span><br>' : ''}${cuEmail ? '\u2709 <span>' + cuEmail + '</span><br>' : ''}${cuLocation ? '\uD83D\uDCCD <span>' + cuLocation + '</span>' : ''}</div>
</div>
</div>
</div>

<div class="card-dark">
<div class="sec-title">EVENT DETAILS</div>
<div class="event-grid">
<div class="ev-item"><div class="ev-label">Event Type</div><div class="ev-val">${booking.eventType || "\u2014"}</div></div>
<div class="ev-item"><div class="ev-label">Event Date</div><div class="ev-val">${fd(booking.eventDate)}</div></div>
<div class="ev-item"><div class="ev-label">Location</div><div class="ev-val">${booking.eventLocation || "\u2014"}</div></div>
<div class="ev-item"><div class="ev-label">Booking Date</div><div class="ev-val">${fd(booking.createdAt)}</div></div>
<div class="ev-item"><div class="ev-label">Completed</div><div class="ev-val">${fd(booking.completedAt)}</div></div>
<div class="ev-item"><div class="ev-label">Invoice #</div><div class="ev-val" style="font-size:10px">${invNo}</div></div>
</div>
</div>

<div class="card">
<div class="sec-title">PAYMENT SUMMARY</div>
<div class="sum-row"><span class="label">Total Project Amount</span><span class="val">${fc(amt)}</span></div>
<div class="sum-row green"><span class="label">Total Paid</span><span class="val">${fc(totalPaid)}</span></div>
<div class="sum-row"><span class="label">Remaining Balance</span><span class="val">${fc(0)}</span></div>
<div class="sum-row red"><span class="label">Platform Commission (${booking.commissionPercent || 0}%)</span><span class="val">${fc(booking.commissionAmount || 0)}</span></div>
<div class="sum-row total"><span class="label">Creator Receivable</span><span class="val">${fc(booking.creatorReceivable || (amt - (booking.commissionAmount || 0)))}</span></div>
</div>

${payments.length > 0 ? `<div class="card-dark">
<div class="sec-title">PAYMENT HISTORY</div>
<table><thead><tr><th>Date</th><th>Amount</th><th>Type</th><th>Recorded By</th><th>Status</th></tr></thead>
<tbody>${payRows}</tbody></table>
</div>` : ""}

<div class="status-bar">\u2705 PAYMENT COMPLETED \u2014 BOOKING OFFICIALLY CLOSED</div>

<div class="qr-sec">
<img src="https://api.qrserver.com/v1/create-qr-code/?size=80x80&bgcolor=FFFFFF&data=${encodeURIComponent('https://bookmyshot.in | Invoice: ' + invNo + ' | ID: ' + booking._id)}" alt="QR">
<div class="qr-text"><div class="qr-label">Scan to verify this booking</div><div class="qr-sub"><strong>Terms:</strong> Payment has been completed successfully. This booking is officially closed. This invoice is generated automatically by BookMyShot and is a valid digital document. No physical signature required.</div></div>
</div>

<div class="footer">
<div class="ty">Thank You!</div>
<div style="font-size:10px;color:#8A8A8A">for choosing BookMyShot</div>
<div class="f-brand"><strong style="color:#F97316">BookMyShot</strong> \u2022 India's Premium Photography & Videography Marketplace</div>
<div class="f-sub">bookmyshot.in \u2022 support@bookmyshot.in \u2022 \u00A9 ${new Date().getFullYear()} BookMyShot</div>
</div>
</div>
</body></html>`;

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(html);
  } catch (e) { next(e); }
});

module.exports = router;
