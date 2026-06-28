/**
 * BookMyShot — Invoice Generation for Completed Bookings
 * GET /api/invoice/:id — Returns beautiful HTML invoice (user can print/save as PDF)
 * 
 * Auth: Supports BOTH methods:
 *   1. Authorization: Bearer <token> (header) — for API calls
 *   2. ?token=<token> (query param) — for browser/download links
 */
const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const Booking = require("../models/Booking");
const Creator = require("../models/Creator");
const User = require("../models/User");
const PaymentRecord = require("../models/PaymentRecord");

// Custom auth that supports both header and query token
async function authenticateRequest(req) {
  let token = null;

  // Try Authorization header first
  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];
  }

  // Fallback to query parameter (for browser links)
  if (!token && req.query.token) {
    token = req.query.token;
  }

  if (!token) return null;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");
    return user;
  } catch (e) {
    return null;
  }
}

router.get("/:id", async (req, res, next) => {
  try {
    console.log("[Invoice] Request for booking:", req.params.id);
    console.log("[Invoice] Auth header:", req.headers.authorization ? "Bearer ***" : "NONE");
    console.log("[Invoice] Query token:", req.query.token ? "***present***" : "NONE");

    // Authenticate
    const user = await authenticateRequest(req);
    if (!user) {
      console.log("[Invoice] AUTH FAILED — no valid token found");
      return res.status(401).json({ success: false, message: "Authentication required. Please login first." });
    }
    console.log("[Invoice] Authenticated user:", user._id, user.name, user.role);

    // Load booking with populated fields
    const booking = await Booking.findById(req.params.id)
      .populate("user", "name email phone")
      .populate({ path: "creator", populate: { path: "user", select: "name email phone" } });

    if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });

    // Access check: booking owner, creator, or admin
    const userId = user._id.toString();
    const bookingUserId = (booking.user?._id || booking.user || "").toString();
    const creatorUserId = (booking.creator?.user?._id || "").toString();

    console.log("[Invoice] Access check — userId:", userId, "bookingUser:", bookingUserId, "creatorUser:", creatorUserId, "role:", user.role);

    if (userId !== bookingUserId && userId !== creatorUserId && user.role !== "admin") {
      console.log("[Invoice] ACCESS DENIED");
      return res.status(403).json({ success: false, message: "You don't have permission to view this invoice" });
    }
    console.log("[Invoice] Access GRANTED");

    // Get payment records
    const payments = await PaymentRecord.find({ booking: booking._id, status: "approved" }).sort("createdAt").lean();
    const totalPaid = payments.reduce((s, r) => s + (r.amount || 0), 0);
    const bookingAmount = booking.amount || booking.budget || 0;

    // Helpers
    const fd = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "\u2014";
    const fc = (n) => "\u20B9" + (n || 0).toLocaleString("en-IN");

    const paymentRows = payments.map(p =>
      `<tr><td>${fd(p.createdAt)}</td><td>${fc(p.amount)}</td><td style="text-transform:capitalize">${p.paymentType || "\u2014"}</td><td style="text-transform:capitalize">${p.addedBy || "\u2014"}</td></tr>`
    ).join("");

    // Generate HTML invoice
    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Invoice ${booking.invoiceNumber || ""} - BookMyShot</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',sans-serif;background:#0a0a0a;color:#f5f5f5;padding:16px;max-width:800px;margin:0 auto}
.inv{background:#111;border:1px solid rgba(212,175,55,.15);border-radius:16px;padding:28px;margin-bottom:16px}
.hdr{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;padding-bottom:18px;border-bottom:1px solid rgba(255,255,255,.06)}
.logo{font-size:20px;font-weight:700;color:#D4AF37}.logo span{color:#fff}
.meta{text-align:right;font-size:11px;color:#888}.meta strong{color:#D4AF37;display:block;font-size:13px;margin-bottom:2px}
.sec{margin-bottom:18px}.st{font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#D4AF37;margin-bottom:8px;font-weight:600}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.box{background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.06);border-radius:10px;padding:11px}
.box .l{font-size:9px;color:#888;text-transform:uppercase;letter-spacing:.5px}.box .v{font-size:12px;color:#fff;margin-top:2px}
.sum{background:rgba(212,175,55,.04);border:1px solid rgba(212,175,55,.12);border-radius:12px;padding:14px;margin-bottom:16px}
.sr{display:flex;justify-content:space-between;padding:5px 0;font-size:12px;color:#ccc;border-bottom:1px solid rgba(255,255,255,.03)}
.sr:last-child{border:none;padding-top:8px;margin-top:4px;border-top:1px solid rgba(212,175,55,.15);font-weight:700;font-size:14px;color:#10b981}
table{width:100%;border-collapse:collapse;font-size:11px;margin-top:8px}
th{text-align:left;padding:7px 8px;background:rgba(212,175,55,.06);color:#D4AF37;font-size:9px;text-transform:uppercase;letter-spacing:.5px}
td{padding:7px 8px;border-bottom:1px solid rgba(255,255,255,.03);color:#ddd}
.done{text-align:center;margin:16px 0;padding:12px;background:rgba(16,185,129,.06);border:1px solid rgba(16,185,129,.15);border-radius:10px;color:#10b981;font-weight:600;font-size:13px}
.ft{text-align:center;padding-top:16px;border-top:1px solid rgba(255,255,255,.04);font-size:10px;color:#666}
.pb{display:block;margin:0 auto 16px;padding:11px 28px;background:#D4AF37;color:#000;border:none;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer}
@media print{body{background:#fff;color:#111;padding:0}.inv{background:#fff;border:1px solid #ddd}th{background:#f5f5f5;color:#333}td{color:#333}.sum{background:#fafaf5;border-color:#e5e0c8}.sr{color:#333}.ft{color:#999}.pb{display:none}.done{background:#e6f9f0;border-color:#b8e6d0;color:#059669}}
@media(max-width:480px){.grid{grid-template-columns:1fr}.inv{padding:18px}}
</style></head><body>
<button class="pb" onclick="window.print()">Download / Print Invoice</button>
<div class="inv">
<div class="hdr">
<div><div class="logo">Book<span>MyShot</span></div><div style="font-size:10px;color:#888;margin-top:3px">Premium Photography & Videography</div></div>
<div class="meta"><strong>${booking.invoiceNumber || "BMS-" + booking._id.toString().slice(-8).toUpperCase()}</strong>Completed: ${fd(booking.completedAt)}<br>Booked: ${fd(booking.createdAt)}</div>
</div>
<div class="sec"><div class="st">Parties</div>
<div class="grid">
<div class="box"><div class="l">Creator</div><div class="v">${booking.creator?.user?.name || "\u2014"}</div><div style="font-size:10px;color:#888;margin-top:3px">${booking.creator?.user?.phone || ""}<br>${booking.creator?.user?.email || ""}</div></div>
<div class="box"><div class="l">Customer</div><div class="v">${booking.user?.name || booking.clientName || "\u2014"}</div><div style="font-size:10px;color:#888;margin-top:3px">${booking.user?.phone || booking.clientPhone || ""}<br>${booking.user?.email || booking.clientEmail || ""}</div></div>
</div></div>
<div class="sec"><div class="st">Event Details</div>
<div class="grid">
<div class="box"><div class="l">Event Type</div><div class="v">${booking.eventType || "\u2014"}</div></div>
<div class="box"><div class="l">Event Date</div><div class="v">${fd(booking.eventDate)}</div></div>
<div class="box"><div class="l">Location</div><div class="v">${booking.eventLocation || booking.scheduledLocation || "\u2014"}</div></div>
<div class="box"><div class="l">Completed On</div><div class="v">${fd(booking.completedAt)}</div></div>
</div></div>
<div class="sec"><div class="st">Payment Summary</div>
<div class="sum">
<div class="sr"><span>Total Project Amount</span><span>${fc(bookingAmount)}</span></div>
<div class="sr"><span>Total Paid</span><span style="color:#10b981">${fc(totalPaid)}</span></div>
<div class="sr"><span>Remaining Balance</span><span>${fc(0)}</span></div>
<div class="sr"><span>Platform Commission (${booking.commissionPercent || 0}%)</span><span>${fc(booking.commissionAmount || 0)}</span></div>
<div class="sr"><span>Creator Receivable</span><span>${fc(booking.creatorReceivable || (bookingAmount - (booking.commissionAmount || 0)))}</span></div>
</div></div>
${payments.length > 0 ? `<div class="sec"><div class="st">Payment Records</div>
<table><thead><tr><th>Date</th><th>Amount</th><th>Type</th><th>Recorded By</th></tr></thead>
<tbody>${paymentRows}</tbody></table></div>` : ""}
<div class="done">\u2705 PAYMENT COMPLETED \u2014 BOOKING CLOSED</div>
<div class="ft">Thank you for choosing BookMyShot<br><span style="color:#D4AF37">bookmyshot.in</span> \u2022 support@bookmyshot.in</div>
</div></body></html>`;

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(html);
  } catch (e) {
    next(e);
  }
});

module.exports = router;
