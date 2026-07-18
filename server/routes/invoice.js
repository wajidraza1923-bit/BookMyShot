/**
 * BookMyShot Invoice Routes
 * Theme: White · Purple (#7C3AED) · Pink (#EC4899)
 * GET /api/invoice/:id         — invoice / receipt (auto-detects status)
 * GET /api/invoice/:id/partial — explicit partial receipt
 */
const express  = require("express");
const router   = express.Router();
const jwt      = require("jsonwebtoken");
const Booking  = require("../models/Booking");
const User     = require("../models/User");
const PaymentRecord = require("../models/PaymentRecord");

/* ── Auth helper ── */
async function auth(req) {
  let t = null;
  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer"))
    t = req.headers.authorization.split(" ")[1];
  if (!t && req.headers["x-access-token"]) t = req.headers["x-access-token"];
  if (!t && req.query.token) t = req.query.token;
  if (!t) return null;
  try {
    const d = jwt.verify(t, process.env.JWT_SECRET);
    return await User.findById(d.id).select("-password");
  } catch { return null; }
}

const fd = d => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const fc = n => "₹" + (n || 0).toLocaleString("en-IN");

/* ── Shared CSS ── */
const CSS = `
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',system-ui,sans-serif;background:#f5f3ff;color:#1e1b4b}
.wrap{max-width:800px;margin:0 auto;padding:24px}
.hdr{background:linear-gradient(135deg,#7C3AED 0%,#EC4899 100%);border-radius:16px 16px 0 0;padding:26px 30px;display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:14px}
.logo-row{display:flex;align-items:center;gap:12px}
.logo-box{width:50px;height:50px;border-radius:12px;background:rgba(255,255,255,.2);border:2px solid rgba(255,255,255,.35);display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:900;color:#fff;flex-shrink:0}
.brand{font-size:22px;font-weight:800;color:#fff;letter-spacing:-.3px}
.tagline{font-size:9px;color:rgba(255,255,255,.65);margin-top:2px}
.contact-row{font-size:9px;color:rgba(255,255,255,.6);margin-top:6px}
.badge{background:rgba(255,255,255,.15);border:1.5px solid rgba(255,255,255,.3);border-radius:12px;padding:13px 17px;text-align:right;min-width:185px}
.btype{font-size:8px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;color:rgba(255,255,255,.8)}
.bno{font-size:17px;font-weight:800;color:#fff;margin:3px 0}
.bdate{font-size:9px;color:rgba(255,255,255,.6);line-height:1.7}
.status-pill{display:inline-block;font-size:9px;font-weight:700;padding:3px 10px;border-radius:20px;margin-top:6px}
.body{background:#fff;border:1px solid #e9d5ff;border-top:none;border-radius:0 0 16px 16px;padding:26px 30px}
.sec{font-size:8px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#7C3AED;margin-bottom:13px;display:flex;align-items:center;gap:7px}
.sec::before{content:'';width:3px;height:13px;background:linear-gradient(180deg,#7C3AED,#EC4899);border-radius:2px;flex-shrink:0}
.hr{height:1px;background:#e9d5ff;margin:20px 0}
.g2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.pc{background:#faf5ff;border:1px solid #e9d5ff;border-radius:12px;padding:14px 16px}
.pc-role{font-size:8px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#EC4899;margin-bottom:7px}
.pc-name{font-size:14px;font-weight:700;color:#1e1b4b;margin-bottom:5px}
.pc-info{font-size:10.5px;color:#6b7280;line-height:1.85}
.chips{display:grid;grid-template-columns:repeat(3,1fr);gap:9px}
.chip{background:#faf5ff;border:1px solid #e9d5ff;border-radius:9px;padding:10px 13px}
.chip-l{font-size:8px;color:#9ca3af;text-transform:uppercase;letter-spacing:.4px;font-weight:600}
.chip-v{font-size:11.5px;color:#1e1b4b;font-weight:700;margin-top:4px}
.sr{display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #f3e8ff;font-size:12.5px}
.sr:last-child{border:none}
.sr .l{color:#6b7280}.sr .v{font-weight:700;color:#1e1b4b}
.sr.g .v{color:#15803d}.sr.r .v{color:#dc2626}.sr.y .v{color:#d97706}
.sr-total{background:linear-gradient(135deg,#f5f3ff,#fce7f3);border-radius:10px;padding:13px 16px;margin-top:8px;display:flex;justify-content:space-between;align-items:center;border:1px solid #e9d5ff}
.sr-total .l{font-size:13px;font-weight:700;color:#7C3AED}
.sr-total .v{font-size:16px;font-weight:800;color:#1e1b4b}
table{width:100%;border-collapse:collapse;font-size:10.5px;border:1px solid #e9d5ff;border-radius:10px;overflow:hidden}
thead tr{background:linear-gradient(135deg,#7C3AED,#EC4899)}
th{text-align:left;padding:9px 13px;color:rgba(255,255,255,.9);font-size:8px;text-transform:uppercase;letter-spacing:1px;font-weight:700}
td{padding:9px 13px;border-bottom:1px solid #f3e8ff;color:#374151}
tr:last-child td{border-bottom:none}
tr:nth-child(even) td{background:#faf5ff}
.banner{border-radius:11px;padding:13px 18px;text-align:center;margin:20px 0;font-weight:700;font-size:13px;color:#fff;display:flex;align-items:center;justify-content:center;gap:7px;letter-spacing:.2px}
.banner.done{background:linear-gradient(135deg,#7C3AED,#EC4899)}
.banner.pend{background:linear-gradient(135deg,#f59e0b,#ef4444)}
.pend-box{background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:13px 16px;margin:12px 0;display:flex;gap:11px;align-items:flex-start}
.pend-txt{font-size:10.5px;color:#9a3412;line-height:1.75}
.pend-txt strong{color:#c2410c}
.qr-row{display:flex;align-items:center;gap:16px;background:#faf5ff;border:1px solid #e9d5ff;border-radius:11px;padding:15px 18px;margin-top:4px}
.qr-row img{width:66px;height:66px;border-radius:8px;border:2px solid #c4b5fd;padding:3px;background:#fff;flex-shrink:0}
.qr-lbl{font-size:11.5px;font-weight:600;color:#1e1b4b;margin-bottom:3px}
.qr-sub{font-size:9.5px;color:#6b7280;line-height:1.7}
.ftr{background:linear-gradient(135deg,#7C3AED 0%,#EC4899 100%);border-radius:0 0 16px 16px;padding:20px 30px;margin-top:24px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px}
.ty{font-size:17px;font-style:italic;font-weight:800;color:#fff}
.copy{font-size:9px;color:rgba(255,255,255,.55);text-align:right;line-height:1.85}
.pbtn{display:block;margin:0 auto 18px;padding:12px 34px;background:linear-gradient(135deg,#7C3AED,#EC4899);color:#fff;border:none;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;letter-spacing:.3px;box-shadow:0 4px 14px rgba(124,58,237,.3)}
@media print{.pbtn{display:none}body{background:#fff!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}}
@media(max-width:600px){.g2{grid-template-columns:1fr}.chips{grid-template-columns:1fr 1fr}.hdr,.body,.ftr{padding:16px}.wrap{padding:12px}.badge{min-width:150px;text-align:left}}
`;

/* ── Build HTML ── */
function buildHTML(o) {
  const { docType, docNo, booking, cName, cPhone, cEmail, cCity, cSpec, cCategory, cCategoryGroup,
    cuName, cuPhone, cuEmail, cuLoc,
    amt, totalPaid, remaining, comm, receivable, payments,
    isComplete, isPartial, year } = o;

  // ── Dynamic service label (never hardcode Photography/Cameraman) ──
  const serviceCategory   = booking.eventType || cCategory || cSpec || "Wedding Service";
  const pkgName           = booking.packageName && booking.packageName !== "Standard" ? booking.packageName : null;
  const vendorGroup       = cCategoryGroup || "Wedding Professional";
  const eventDate         = booking.scheduledDate || booking.eventDate;
  const eventTime         = booking.scheduledTime || booking.eventTime || "";
  const eventVenue        = booking.scheduledLocation || booking.eventLocation || "";
  const paymentStatusLabel = {
    unpaid: "Unpaid", partial: "Partially Paid",
    "proof-submitted": "Proof Submitted", "pending-verification": "Pending Verification",
    verified: "Approved", rejected: "Rejected", paid: "Fully Paid"
  }[booking.paymentStatus] || booking.paymentStatus || "—";

  const statusLabel  = isComplete ? "Completed"     : "Partially Paid";
  const statusColor  = isComplete ? "#15803d"       : "#b45309";
  const statusBg     = isComplete ? "#f0fdf4"       : "#fffbeb";
  const statusBorder = isComplete ? "#86efac"       : "#fde68a";
  const bannerCls    = isComplete ? "done"          : "pend";
  const bannerTxt    = isComplete
    ? "&#10003; Service Completed — Booking Officially Closed"
    : "&#9888; Partial Payment Receipt — Balance Pending";

  const cInfo = [
    cPhone && `&#9742; ${cPhone}`,
    cEmail && `&#9993; ${cEmail}`,
    cCity  && `&#128205; ${cCity}`,
    cSpec  && cSpec
  ].filter(Boolean).join("<br>");
  const cuInfo = [
    cuPhone && `&#9742; ${cuPhone}`,
    cuEmail && `&#9993; ${cuEmail}`,
    cuLoc   && `&#128205; ${cuLoc}`
  ].filter(Boolean).join("<br>");

  const rows = payments.map((p, i) =>
    `<tr style="background:${i%2===0?'#fff':'#faf5ff'}"><td>${fd(p.createdAt)}</td><td style="color:#7C3AED;font-weight:700">${fc(p.amount)}</td><td class="cap">${p.paymentType||"—"}</td><td class="cap">${p.addedBy||"—"}</td><td><span style="background:#f0fdf4;color:#15803d;font-size:9px;font-weight:700;padding:2px 8px;border-radius:12px">Approved</span></td></tr>`
  ).join("");

  const payTable = payments.length > 0
    ? `<div class="hr"></div><div class="sec">Payment History (${payments.length} record${payments.length>1?"s":""})</div><table><thead><tr><th>Date</th><th>Amount</th><th>Type</th><th>Recorded By</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table>`
    : "";

  const pendBox = (isPartial && remaining > 0)
    ? `<div class="pend-box"><span style="font-size:17px">&#9888;&#65039;</span><div class="pend-txt"><strong>Pending Balance: ${fc(remaining)}</strong><br>Final invoice will be issued after full payment is completed.</div></div>`
    : "";

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=70x70&bgcolor=FFFFFF&color=7C3AED&data=${encodeURIComponent("bookmyshot.in | " + docNo)}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${docType} ${docNo}</title>
<style>${CSS}</style>
</head>
<body>
<div class="wrap">
<button class="pbtn" onclick="window.print()">&#11015; Download / Print ${docType}</button>

<div class="hdr">
  <div>
    <div class="logo-row">
      <div class="logo-box">BM</div>
      <div>
        <div class="brand">BookMyShot</div>
        <div class="tagline">India's Complete Wedding Marketplace</div>
      </div>
    </div>
    <div class="contact-row">bookmyshot.in &nbsp;|&nbsp; support@bookmyshot.in &nbsp;|&nbsp; +91 8492922173</div>
  </div>
  <div class="badge">
    <div class="btype">${docType}</div>
    <div class="bno">${docNo}</div>
    <div class="bdate">Generated: ${fd(new Date())}<br>Booking date: ${fd(booking.createdAt)}</div>
    <span class="status-pill" style="background:${statusBg};color:${statusColor};border:1px solid ${statusBorder}">${statusLabel}</span>
  </div>
</div>

<div class="body">

  <!-- SERVICE CATEGORY BANNER -->
  <div style="background:linear-gradient(135deg,#faf5ff,#fce7f3);border:1px solid #e9d5ff;border-radius:12px;padding:12px 16px;margin-bottom:20px;display:flex;align-items:center;gap:10px">
    <span style="font-size:20px">✨</span>
    <div>
      <div style="font-size:8px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#EC4899;margin-bottom:2px">Service Category</div>
      <div style="font-size:15px;font-weight:800;color:#1e1b4b">${serviceCategory}</div>
      ${pkgName ? `<div style="font-size:10px;color:#7C3AED;margin-top:2px;font-weight:600">Package: ${pkgName}</div>` : ""}
      <div style="font-size:9px;color:#9ca3af;margin-top:1px">${vendorGroup}</div>
    </div>
  </div>

  <div class="sec">Parties</div>
  <div class="g2">
    <div class="pc">
      <div class="pc-role">Vendor / Service Provider</div>
      <div class="pc-name">${cName}</div>
      ${cSpec ? `<div style="font-size:9px;color:#7C3AED;font-weight:600;margin-bottom:4px">${cSpec}</div>` : ""}
      <div class="pc-info">${cInfo||"—"}</div>
    </div>
    <div class="pc">
      <div class="pc-role">Customer / Client</div>
      <div class="pc-name">${cuName}</div>
      <div class="pc-info">${cuInfo||"—"}</div>
    </div>
  </div>
  <div class="hr"></div>

  <div class="sec">Booking Details</div>
  <div class="chips">
    <div class="chip"><div class="chip-l">Service</div><div class="chip-v">${serviceCategory}</div></div>
    ${pkgName ? `<div class="chip"><div class="chip-l">Package</div><div class="chip-v">${pkgName}</div></div>` : `<div class="chip"><div class="chip-l">Event Type</div><div class="chip-v">${booking.eventType||"—"}</div></div>`}
    <div class="chip"><div class="chip-l">Event Date</div><div class="chip-v">${fd(eventDate)}</div></div>
    ${eventTime ? `<div class="chip"><div class="chip-l">Event Time</div><div class="chip-v">${eventTime}</div></div>` : ""}
    <div class="chip"><div class="chip-l">Venue / Location</div><div class="chip-v">${eventVenue||"—"}</div></div>
    <div class="chip"><div class="chip-l">Booking Status</div><div class="chip-v" style="color:${statusColor}">${booking.status}</div></div>
    <div class="chip"><div class="chip-l">Payment Status</div><div class="chip-v">${paymentStatusLabel}</div></div>
    <div class="chip"><div class="chip-l">Booking ID</div><div class="chip-v" style="font-size:9px">${docNo}</div></div>
    <div class="chip"><div class="chip-l">Generated On</div><div class="chip-v">${fd(new Date())}</div></div>
  </div>
  <div class="hr"></div>

  <div class="sec">Payment Summary</div>
  <div class="sr"><span class="l">Booking Amount</span><span class="v">${fc(amt)}</span></div>
  <div class="sr g"><span class="l">Total Paid</span><span class="v">${fc(totalPaid)}</span></div>
  <div class="sr ${remaining>0?"y":"g"}"><span class="l">Remaining Balance</span><span class="v">${remaining>0?fc(remaining)+" pending":"Nil"}</span></div>
  <div class="sr r"><span class="l">Platform Commission (${booking.commissionPercent||0}%)</span><span class="v">&minus; ${fc(comm)}</span></div>
  <div class="sr-total"><span class="l">Vendor Receivable (Net)</span><span class="v">${fc(receivable)}</span></div>

  ${payTable}

  <div class="banner ${bannerCls}">${bannerTxt}</div>
  ${pendBox}

  <div class="qr-row">
    <img src="${qrUrl}" alt="QR Code">
    <div>
      <div class="qr-lbl">Scan to verify this document</div>
      <div class="qr-sub">Auto-generated by BookMyShot — India's Complete Wedding Marketplace.<br>Valid digital document. No physical signature required.</div>
    </div>
  </div>
</div>

<div class="ftr">
  <div class="ty">Thank You!</div>
  <div class="copy">
    <strong style="color:#fff">BookMyShot</strong><br>
    India&rsquo;s Complete Wedding Marketplace<br>
    bookmyshot.in &bull; &copy; ${year} BookMyShot. All rights reserved.
  </div>
</div>
</div>
</body></html>`;
}

/* ═══ GET /api/invoice/:id ═══════════════════════════════════════════════ */
router.get("/:id", async (req, res, next) => {
  try {
    const user = await auth(req);
    if (!user) return res.status(401).send(`<!DOCTYPE html><html><body style="font-family:sans-serif;padding:40px;background:#f5f3ff;text-align:center"><h2 style="color:#7C3AED">Login Required</h2><p>Please log in first, then open the invoice again.</p><a href="/login.html" style="color:#EC4899">Go to Login →</a></body></html>`);

    const booking = await Booking.findById(req.params.id)
      .populate("user", "name email phone")
      .populate({ path: "creator", populate: { path: "user", select: "name email phone" }, select: "user specialty city businessName category categoryGroup categorySlug" });
    if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });

    const uid  = user._id.toString();
    const buid = (booking.user?._id || booking.user || "").toString();
    const cuid = (booking.creator?.user?._id || "").toString();
    if (uid !== buid && uid !== cuid && user.role !== "admin")
      return res.status(403).json({ success: false, message: "Access denied" });

    const payments  = await PaymentRecord.find({ booking: booking._id, status: "approved" }).sort("createdAt").lean();
    const totalPaid = payments.reduce((s, r) => s + (r.amount || 0), 0);
    const amt       = booking.amount || booking.budget || 0;
    const remaining = Math.max(0, amt - totalPaid);
    const isComplete = booking.status === "Completed" || remaining === 0;
    const comm      = booking.commissionAmount || Math.round(amt * ((booking.commissionPercent || 0) / 100));
    const receivable= booking.creatorReceivable || (amt - comm);
    const invNo     = booking.invoiceNumber || "BMS-" + booking._id.toString().slice(-8).toUpperCase();

    const html = buildHTML({
      docType: isComplete ? "Tax Invoice" : "Payment Receipt",
      docNo:   isComplete ? invNo : "BMS-PR-" + booking._id.toString().slice(-8).toUpperCase(),
      booking,
      cName:         booking.creator?.user?.name        || "—",
      cPhone:        booking.creator?.user?.phone       || "",
      cEmail:        booking.creator?.user?.email       || "",
      cCity:         booking.creator?.city              || "",
      cSpec:         booking.creator?.specialty         || "",
      cCategory:     booking.creator?.category          || "",
      cCategoryGroup: booking.creator?.categoryGroup    || "",
      cuName:        booking.clientName  || booking.user?.name  || "—",
      cuPhone:       booking.clientPhone || booking.user?.phone || "",
      cuEmail:       booking.clientEmail || booking.user?.email || "",
      cuLoc:         booking.eventLocation || "",
      amt, totalPaid, remaining, comm, receivable, payments,
      isComplete, isPartial: !isComplete,
      year: new Date().getFullYear()
    });

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(html);
  } catch (e) { next(e); }
});

/* ═══ GET /api/invoice/:id/partial ═══════════════════════════════════════ */
router.get("/:id/partial", async (req, res, next) => {
  try {
    const user = await auth(req);
    if (!user) return res.status(401).send(`<!DOCTYPE html><html><body style="font-family:sans-serif;padding:40px;background:#f5f3ff;text-align:center"><h2 style="color:#7C3AED">Login Required</h2><p>Please log in first.</p><a href="/login.html" style="color:#EC4899">Go to Login →</a></body></html>`);

    const booking = await Booking.findById(req.params.id)
      .populate("user", "name email phone")
      .populate({ path: "creator", populate: { path: "user", select: "name email phone" }, select: "user specialty city businessName category categoryGroup categorySlug" });
    if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });

    const uid  = user._id.toString();
    const buid = (booking.user?._id || booking.user || "").toString();
    const cuid = (booking.creator?.user?._id || "").toString();
    if (uid !== buid && uid !== cuid && user.role !== "admin")
      return res.status(403).json({ success: false, message: "Access denied" });

    const payments  = await PaymentRecord.find({ booking: booking._id, status: "approved" }).sort("createdAt").lean();
    const totalPaid = payments.reduce((s, r) => s + (r.amount || 0), 0);
    if (totalPaid === 0) return res.status(400).json({ success: false, message: "No payments recorded yet" });

    const amt       = booking.amount || booking.budget || 0;
    const remaining = Math.max(0, amt - totalPaid);
    const isComplete= remaining === 0;
    const comm      = Math.round(totalPaid * ((booking.commissionPercent || 0) / 100));
    const receivable= totalPaid - comm;
    const receiptNo = "BMS-PR-" + booking._id.toString().slice(-8).toUpperCase();

    const html = buildHTML({
      docType: "Payment Receipt",
      docNo:   receiptNo,
      booking,
      cName:         booking.creator?.user?.name        || "—",
      cPhone:        booking.creator?.user?.phone       || "",
      cEmail:        booking.creator?.user?.email       || "",
      cCity:         booking.creator?.city              || "",
      cSpec:         booking.creator?.specialty         || "",
      cCategory:     booking.creator?.category          || "",
      cCategoryGroup: booking.creator?.categoryGroup    || "",
      cuName:        booking.clientName  || booking.user?.name  || "—",
      cuPhone:       booking.clientPhone || booking.user?.phone || "",
      cuEmail:       booking.clientEmail || booking.user?.email || "",
      cuLoc:         booking.eventLocation || "",
      amt, totalPaid, remaining, comm, receivable, payments,
      isComplete, isPartial: true,
      year: new Date().getFullYear()
    });

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(html);
  } catch (e) { next(e); }
});

module.exports = router;
