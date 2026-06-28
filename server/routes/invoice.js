/**
 * BookMyShot — Premium Invoice Generation
 * GET /api/invoice/:id — Returns premium HTML invoice
 * Auth: Bearer token (header) OR x-access-token (header) OR ?token= (query)
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
  if (!token) { console.log("[Invoice] No token found"); return null; }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return await User.findById(decoded.id).select("-password");
  } catch (e) { console.log("[Invoice] Token verify failed:", e.message); return null; }
}

router.get("/:id", async (req, res, next) => {
  try {
    const user = await authenticateRequest(req);
    if (!user) return res.status(401).json({ success: false, message: "Authentication required. Please login first." });

    const booking = await Booking.findById(req.params.id)
      .populate("user", "name email phone")
      .populate({ path: "creator", populate: { path: "user", select: "name email phone" }, select: "user specialty city businessName bio" });
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
    const creatorName = booking.creator?.user?.name || "\u2014";
    const creatorPhone = booking.creator?.user?.phone || "";
    const creatorEmail = booking.creator?.user?.email || "";
    const creatorCity = booking.creator?.city || "";
    const creatorSpecialty = booking.creator?.specialty || "";
    const custName = booking.user?.name || booking.clientName || "\u2014";
    const custPhone = booking.user?.phone || booking.clientPhone || "";
    const custEmail = booking.user?.email || booking.clientEmail || "";
    const invNo = booking.invoiceNumber || "BMS-" + booking._id.toString().slice(-8).toUpperCase();

    const payRows = payments.map((p, i) =>
      `<tr style="background:${i % 2 === 0 ? '#fff' : '#FAFAF5'}"><td>${fd(p.createdAt)}</td><td style="font-weight:600">${fc(p.amount)}</td><td style="text-transform:capitalize">${p.paymentType || "\u2014"}</td><td style="text-transform:capitalize">${p.addedBy || "\u2014"}</td><td><span style="background:#ECFDF5;color:#16A34A;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:600">Approved</span></td></tr>`
    ).join("");

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Invoice ${invNo} - BookMyShot</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',system-ui,sans-serif;background:#fff;color:#1a1a1a;padding:0;line-height:1.5}
.page{max-width:800px;margin:0 auto;padding:40px 36px;position:relative;min-height:100vh}
.watermark{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);font-size:100px;font-weight:900;color:rgba(212,175,55,0.04);letter-spacing:8px;pointer-events:none;white-space:nowrap;z-index:0}
.content{position:relative;z-index:1}
.header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #D4AF37;padding-bottom:20px;margin-bottom:24px}
.logo-section .logo{font-size:24px;font-weight:800;color:#D4AF37;letter-spacing:-0.5px}.logo-section .logo span{color:#111}
.logo-section .tagline{font-size:10px;color:#888;margin-top:2px}
.logo-section .contact{font-size:10px;color:#666;margin-top:8px;line-height:1.6}
.inv-meta{text-align:right}.inv-meta .inv-no{font-size:16px;font-weight:700;color:#D4AF37;margin-bottom:4px}
.inv-meta .meta-row{font-size:11px;color:#666;margin-top:2px}
.paid-badge{display:inline-block;background:#ECFDF5;color:#16A34A;font-size:11px;font-weight:700;padding:4px 12px;border-radius:6px;margin-top:8px;border:1px solid #BBF7D0}
.section{margin-bottom:20px}.section-title{font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:#D4AF37;font-weight:700;margin-bottom:10px;padding-bottom:4px;border-bottom:1px solid #F3F4F6}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.detail-card{background:#FAFAF5;border:1px solid #F3F4F6;border-radius:10px;padding:14px}
.detail-card .card-title{font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#D4AF37;font-weight:600;margin-bottom:6px}
.detail-card .name{font-size:14px;font-weight:700;color:#111}
.detail-card .info{font-size:11px;color:#666;margin-top:4px;line-height:1.6}
.summary-card{background:linear-gradient(135deg,#FFFDF5,#FFF9E6);border:1px solid rgba(212,175,55,0.2);border-radius:12px;padding:20px;margin-bottom:20px}
.sum-row{display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid rgba(212,175,55,0.08);font-size:13px}
.sum-row:last-child{border:none;padding-top:12px;margin-top:4px;border-top:2px solid rgba(212,175,55,0.2)}
.sum-row .label{color:#666}.sum-row .val{font-weight:600;color:#111}
.sum-row.total .label{font-weight:700;color:#D4AF37;font-size:15px}.sum-row.total .val{font-weight:800;color:#16A34A;font-size:16px}
table{width:100%;border-collapse:collapse;font-size:11px;margin-top:8px;border-radius:8px;overflow:hidden;border:1px solid #F3F4F6}
th{text-align:left;padding:10px 12px;background:#FFFDF5;color:#D4AF37;font-size:9px;text-transform:uppercase;letter-spacing:0.8px;font-weight:700;border-bottom:1px solid #F3F4F6}
td{padding:9px 12px;border-bottom:1px solid #F9FAFB;color:#333}
.event-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px}
.event-item{background:#F9FAFB;border-radius:8px;padding:10px 12px}.event-item .ev-label{font-size:9px;color:#888;text-transform:uppercase;letter-spacing:0.5px}.event-item .ev-val{font-size:12px;color:#111;font-weight:500;margin-top:2px}
.completed-badge{text-align:center;margin:20px 0;padding:14px;background:#ECFDF5;border:1px solid #BBF7D0;border-radius:10px;color:#16A34A;font-weight:700;font-size:14px}
.terms{background:#F9FAFB;border-radius:8px;padding:14px 16px;margin:16px 0;font-size:10px;color:#888;line-height:1.7}
.terms strong{color:#666}
.footer{text-align:center;padding-top:20px;border-top:1px solid #F3F4F6;font-size:10px;color:#888}
.footer .brand{color:#D4AF37;font-weight:700;font-size:12px}
.qr-section{text-align:center;margin:16px 0}
.qr-section img{width:100px;height:100px;border:1px solid #F3F4F6;border-radius:8px;padding:4px}
.print-btn{display:block;margin:0 auto 20px;padding:12px 32px;background:#D4AF37;color:#000;border:none;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit}
@media print{.print-btn{display:none}.watermark{position:fixed}body{padding:0}.page{padding:20px}}
@media(max-width:600px){.page{padding:20px 16px}.grid2{grid-template-columns:1fr}.event-grid{grid-template-columns:1fr 1fr}.header{flex-direction:column;gap:12px}.inv-meta{text-align:left}}
</style></head><body>
<div class="watermark">BOOKMYSHOT</div>
<div class="page"><div class="content">
<button class="print-btn" onclick="window.print()">📥 Download / Print Invoice</button>

<div class="header">
<div class="logo-section">
<div class="logo">Book<span>MyShot</span></div>
<div class="tagline">Premium Wedding Photography & Videography Marketplace</div>
<div class="contact">bookmyshot.in<br>support@bookmyshot.in</div>
</div>
<div class="inv-meta">
<div class="inv-no">${invNo}</div>
<div class="meta-row">Date: ${fd(booking.completedAt || new Date())}</div>
<div class="meta-row">Booking: ${fd(booking.createdAt)}</div>
<div class="paid-badge">\u2705 PAYMENT COMPLETED</div>
</div>
</div>

<div class="section">
<div class="section-title">Parties</div>
<div class="grid2">
<div class="detail-card">
<div class="card-title">Creator / Service Provider</div>
<div class="name">${creatorName}</div>
<div class="info">${creatorSpecialty ? creatorSpecialty + '<br>' : ''}${creatorPhone ? '\u260E ' + creatorPhone + '<br>' : ''}${creatorEmail ? '\u2709 ' + creatorEmail + '<br>' : ''}${creatorCity ? '\uD83D\uDCCD ' + creatorCity : ''}</div>
</div>
<div class="detail-card">
<div class="card-title">Customer / Client</div>
<div class="name">${custName}</div>
<div class="info">${custPhone ? '\u260E ' + custPhone + '<br>' : ''}${custEmail ? '\u2709 ' + custEmail + '<br>' : ''}${booking.eventLocation ? '\uD83D\uDCCD ' + booking.eventLocation : ''}</div>
</div>
</div>
</div>

<div class="section">
<div class="section-title">Event Details</div>
<div class="event-grid">
<div class="event-item"><div class="ev-label">Event Type</div><div class="ev-val">${booking.eventType || "\u2014"}</div></div>
<div class="event-item"><div class="ev-label">Event Date</div><div class="ev-val">${fd(booking.eventDate)}</div></div>
<div class="event-item"><div class="ev-label">Location</div><div class="ev-val">${booking.eventLocation || booking.scheduledLocation || "\u2014"}</div></div>
<div class="event-item"><div class="ev-label">Booking Date</div><div class="ev-val">${fd(booking.createdAt)}</div></div>
<div class="event-item"><div class="ev-label">Completed</div><div class="ev-val">${fd(booking.completedAt)}</div></div>
<div class="event-item"><div class="ev-label">Invoice #</div><div class="ev-val">${invNo}</div></div>
</div>
</div>

<div class="section">
<div class="section-title">Payment Summary</div>
<div class="summary-card">
<div class="sum-row"><span class="label">Total Project Amount</span><span class="val">${fc(amt)}</span></div>
<div class="sum-row"><span class="label">Total Paid</span><span class="val" style="color:#16A34A">${fc(totalPaid)}</span></div>
<div class="sum-row"><span class="label">Remaining Balance</span><span class="val">${fc(0)}</span></div>
<div class="sum-row"><span class="label">Platform Commission (${booking.commissionPercent || 0}%)</span><span class="val">${fc(booking.commissionAmount || 0)}</span></div>
<div class="sum-row total"><span class="label">Creator Receivable</span><span class="val">${fc(booking.creatorReceivable || (amt - (booking.commissionAmount || 0)))}</span></div>
</div>
</div>

${payments.length > 0 ? `<div class="section">
<div class="section-title">Payment History</div>
<table><thead><tr><th>Date</th><th>Amount</th><th>Type</th><th>Recorded By</th><th>Status</th></tr></thead>
<tbody>${payRows}</tbody></table>
</div>` : ""}

<div class="completed-badge">\u2705 PAYMENT COMPLETED \u2014 BOOKING OFFICIALLY CLOSED</div>

<div class="qr-section">
<img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent('https://bookmyshot.in | Invoice: ' + invNo + ' | Booking: ' + booking._id)}" alt="QR Code">
<div style="font-size:9px;color:#aaa;margin-top:4px">Scan to verify</div>
</div>

<div class="terms">
<strong>Terms:</strong> Payment has been completed successfully. This booking is officially closed. This invoice is generated automatically by BookMyShot and is a valid digital document. No physical signature required.
</div>

<div class="footer">
<div class="brand">BookMyShot</div>
<div style="margin-top:4px">Thank you for choosing BookMyShot \u2014 India's premium photography & videography marketplace</div>
<div style="margin-top:2px">bookmyshot.in \u2022 support@bookmyshot.in \u2022 \u00A9 ${new Date().getFullYear()} BookMyShot</div>
</div>

</div></div>
</body></html>`;

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(html);
  } catch (e) { next(e); }
});

module.exports = router;
