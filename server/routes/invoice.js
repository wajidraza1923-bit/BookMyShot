/**
 * BookMyShot Invoice Routes
 * Theme: White (#FFFFFF) · Emerald Green (#0F5132) · Gold (#D4AF37) · Champagne (#F8F5EF)
 * GET /api/invoice/:id         — invoice / receipt (auto-detects status)
 * GET /api/invoice/:id/partial — explicit partial receipt
 */
const express = require('express');
const router  = express.Router();
const jwt     = require('jsonwebtoken');
const Booking = require('../models/Booking');
const User    = require('../models/User');
const PaymentRecord = require('../models/PaymentRecord');

/* ── Auth helper ── */
async function authenticateRequest(req) {
  var t = null;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer'))
    t = req.headers.authorization.split(' ')[1];
  if (!t && req.headers['x-access-token']) t = req.headers['x-access-token'];
  if (!t && req.query.token) t = req.query.token;
  if (!t) return null;
  try {
    var d = jwt.verify(t, process.env.JWT_SECRET);
    return await User.findById(d.id).select('-password');
  } catch (e) { return null; }
}

/* ── Formatters ── */
function fd(d) {
  if (!d) return '\u2014';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fc(n) {
  return '\u20b9' + (n || 0).toLocaleString('en-IN');
}

/* ── Number to words ── */
function toWords(n) {
  if (!n || n === 0) return 'Zero Rupees Only';
  var ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen'];
  var tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  function chunk(num) {
    if (num === 0) return '';
    if (num < 20) return ones[num] + ' ';
    if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 ? ' ' + ones[num % 10] : '') + ' ';
    return ones[Math.floor(num / 100)] + ' Hundred ' + chunk(num % 100);
  }
  var result = '';
  var crore = Math.floor(n / 10000000); n = n % 10000000;
  var lakh  = Math.floor(n / 100000);   n = n % 100000;
  var thou  = Math.floor(n / 1000);     n = n % 1000;
  var rest  = n;
  if (crore) result += chunk(crore) + 'Crore ';
  if (lakh)  result += chunk(lakh)  + 'Lakh ';
  if (thou)  result += chunk(thou)  + 'Thousand ';
  if (rest)  result += chunk(rest);
  return result.trim() + ' Rupees Only';
}

/* ── Luxury CSS ── */
var CSS = [
  '*{margin:0;padding:0;box-sizing:border-box}',
  'body{font-family:\'Inter\',\'Segoe UI\',system-ui,sans-serif;background:#F8F5EF;color:#1a1a1a}',
  '@import url(\'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=Inter:wght@400;500;600;700&display=swap\');',
  ':root{--green:#0F5132;--gold:#D4AF37;--champagne:#F8F5EF;--white:#ffffff;--text:#1a1a1a;--muted:#666}',
  '.wrap{max-width:820px;margin:0 auto;padding:24px;position:relative}',
  '.pbtn{display:block;margin:0 auto 20px;padding:13px 38px;background:linear-gradient(135deg,#0F5132,#1a7a4a);color:#fff;border:none;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;letter-spacing:.3px;box-shadow:0 4px 16px rgba(15,81,50,.35)}',
  '.hdr{background:linear-gradient(135deg,#0F5132 0%,#1c6e40 60%,#0F5132 100%);border-radius:16px 16px 0 0;padding:28px 32px;display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:14px;position:relative;overflow:hidden}',
  '.hdr::before{content:\'\';position:absolute;top:-30px;right:-30px;width:120px;height:120px;background:rgba(212,175,55,.12);border-radius:50%;pointer-events:none}',
  '.hdr::after{content:\'\';position:absolute;bottom:-20px;left:40px;width:80px;height:80px;background:rgba(212,175,55,.08);border-radius:50%;pointer-events:none}',
  '.logo-row{display:flex;align-items:center;gap:13px}',
  '.logo-box{width:52px;height:52px;border-radius:13px;background:rgba(212,175,55,.2);border:2px solid rgba(212,175,55,.5);display:flex;align-items:center;justify-content:center;font-size:17px;font-weight:900;color:#D4AF37;flex-shrink:0;letter-spacing:-1px}',
  '.brand{font-family:\'Cormorant Garamond\',Georgia,serif;font-size:24px;font-weight:700;color:#fff;letter-spacing:.5px;line-height:1}',
  '.tagline{font-size:9px;color:rgba(255,255,255,.6);margin-top:3px;letter-spacing:.8px}',
  '.contact-row{font-size:9px;color:rgba(255,255,255,.5);margin-top:7px;line-height:1.8}',
  '.badge{background:rgba(0,0,0,.2);border:1.5px solid rgba(212,175,55,.35);border-radius:13px;padding:14px 18px;text-align:right;min-width:190px;backdrop-filter:blur(4px)}',
  '.btype{font-size:8px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#D4AF37}',
  '.bno{font-family:\'Cormorant Garamond\',Georgia,serif;font-size:19px;font-weight:700;color:#fff;margin:4px 0}',
  '.bdate{font-size:9px;color:rgba(255,255,255,.55);line-height:1.8}',
  '.status-pill{display:inline-block;font-size:9px;font-weight:700;padding:3px 10px;border-radius:20px;margin-top:6px;letter-spacing:.5px}',
  '.gold-line{height:3px;background:linear-gradient(90deg,transparent,#D4AF37 20%,#f0d060 50%,#D4AF37 80%,transparent);margin:0}',
  '.body{background:#ffffff;border:1px solid #e8e0d0;border-top:none;border-radius:0 0 16px 16px;padding:28px 32px;position:relative;overflow:hidden}',
  '.watermark{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-30deg);font-family:\'Cormorant Garamond\',Georgia,serif;font-size:72px;font-weight:700;color:rgba(15,81,50,.06);letter-spacing:8px;pointer-events:none;white-space:nowrap;z-index:0;user-select:none}',
  '.content{position:relative;z-index:1}',
  '.sec{font-size:8px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;color:#0F5132;margin-bottom:14px;display:flex;align-items:center;gap:8px}',
  '.sec::before{content:\'\';width:3px;height:14px;background:linear-gradient(180deg,#0F5132,#D4AF37);border-radius:2px;flex-shrink:0}',
  '.hr{height:1px;background:linear-gradient(90deg,transparent,#D4AF37,transparent);margin:22px 0;opacity:.4}',
  '.svc-banner{background:linear-gradient(135deg,#F8F5EF,#faf7f0);border:1px solid rgba(212,175,55,.3);border-radius:13px;padding:14px 18px;margin-bottom:22px;display:flex;align-items:center;gap:12px}',
  '.svc-emoji{font-size:24px;flex-shrink:0}',
  '.svc-label{font-size:8px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#D4AF37;margin-bottom:3px}',
  '.svc-name{font-family:\'Cormorant Garamond\',Georgia,serif;font-size:18px;font-weight:700;color:#0F5132;line-height:1.2}',
  '.svc-pkg{font-size:10px;color:#0F5132;margin-top:3px;font-weight:600;opacity:.8}',
  '.svc-grp{font-size:9px;color:#999;margin-top:2px}',
  '.g2{display:grid;grid-template-columns:1fr 1fr;gap:13px}',
  '.pc{background:#F8F5EF;border:1px solid rgba(212,175,55,.2);border-radius:13px;padding:15px 17px;border-left:3px solid #0F5132}',
  '.pc-role{font-size:8px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#D4AF37;margin-bottom:7px}',
  '.pc-name{font-family:\'Cormorant Garamond\',Georgia,serif;font-size:16px;font-weight:700;color:#0F5132;margin-bottom:5px}',
  '.pc-spec{font-size:9px;color:#0F5132;font-weight:600;margin-bottom:4px;opacity:.8}',
  '.pc-info{font-size:10.5px;color:#555;line-height:1.9}',
  '.chips{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}',
  '.chip{background:#F8F5EF;border:1px solid rgba(212,175,55,.2);border-radius:10px;padding:11px 14px}',
  '.chip-l{font-size:8px;color:#999;text-transform:uppercase;letter-spacing:.5px;font-weight:600}',
  '.chip-v{font-size:11.5px;color:#1a1a1a;font-weight:700;margin-top:4px}',
  '.pay-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-top:4px}',
  '.pay-card{border-radius:12px;padding:15px 17px;border:1px solid rgba(212,175,55,.2)}',
  '.pay-card.green{background:linear-gradient(135deg,#f0fdf4,#dcfce7);border-color:rgba(15,81,50,.2)}',
  '.pay-card.gold{background:linear-gradient(135deg,#fefce8,#fef9c3);border-color:rgba(212,175,55,.3)}',
  '.pay-card.amber{background:linear-gradient(135deg,#fffbeb,#fef3c7);border-color:rgba(212,175,55,.25)}',
  '.pay-card.dark{background:linear-gradient(135deg,#0F5132,#1c6e40)}',
  '.pay-card-label{font-size:8px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:6px}',
  '.pay-card-label.green{color:#0F5132}',
  '.pay-card-label.gold{color:#92660a}',
  '.pay-card-label.amber{color:#b45309}',
  '.pay-card-label.dark{color:rgba(212,175,55,.8)}',
  '.pay-card-amount{font-family:\'Cormorant Garamond\',Georgia,serif;font-size:22px;font-weight:700}',
  '.pay-card-amount.green{color:#0F5132}',
  '.pay-card-amount.gold{color:#92660a}',
  '.pay-card-amount.amber{color:#b45309}',
  '.pay-card-amount.dark{color:#D4AF37}',
  '.pay-card-sub{font-size:9px;margin-top:3px;opacity:.7}',
  '.pay-card-sub.dark{color:#fff}',
  '.words-row{background:linear-gradient(135deg,#0F5132,#1c6e40);border-radius:11px;padding:14px 18px;margin:16px 0;display:flex;align-items:center;gap:12px}',
  '.words-label{font-size:8px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:rgba(212,175,55,.8);margin-bottom:4px}',
  '.words-text{font-family:\'Cormorant Garamond\',Georgia,serif;font-size:14px;color:#fff;font-style:italic;line-height:1.4}',
  '.advance-note{background:#fffbeb;border:1px solid rgba(212,175,55,.4);border-radius:11px;padding:13px 17px;margin:12px 0;display:flex;gap:11px;align-items:flex-start}',
  '.advance-note-txt{font-size:10.5px;color:#7c4a00;line-height:1.8}',
  '.advance-note-txt strong{color:#92660a}',
  'table{width:100%;border-collapse:collapse;font-size:10.5px;border:1px solid rgba(212,175,55,.2);border-radius:11px;overflow:hidden}',
  'thead tr{background:linear-gradient(135deg,#0F5132,#1a7a4a)}',
  'th{text-align:left;padding:9px 13px;color:rgba(255,255,255,.85);font-size:8px;text-transform:uppercase;letter-spacing:1.2px;font-weight:700}',
  'td{padding:9px 13px;border-bottom:1px solid #f0ece4;color:#374151}',
  'tr:last-child td{border-bottom:none}',
  'tr:nth-child(even) td{background:#fafaf7}',
  '.timeline{display:flex;justify-content:space-between;align-items:flex-start;margin:8px 0;position:relative}',
  '.timeline::before{content:\'\';position:absolute;top:16px;left:10%;right:10%;height:2px;background:linear-gradient(90deg,#0F5132,#D4AF37);z-index:0;opacity:.3}',
  '.tl-step{display:flex;flex-direction:column;align-items:center;flex:1;position:relative;z-index:1}',
  '.tl-dot{width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;margin-bottom:7px;flex-shrink:0}',
  '.tl-dot.done{background:#0F5132;border:2px solid #D4AF37;color:#D4AF37}',
  '.tl-dot.curr{background:#D4AF37;border:2px solid #0F5132;color:#0F5132}',
  '.tl-dot.pend{background:#f5f5f0;border:2px solid #ddd;color:#bbb}',
  '.tl-label{font-size:8px;text-align:center;color:#555;font-weight:600;line-height:1.4;max-width:72px}',
  '.qr-card{background:#F8F5EF;border:1px solid rgba(212,175,55,.25);border-radius:13px;padding:18px;margin-top:6px;display:flex;align-items:center;gap:18px}',
  '.qr-img{width:70px;height:70px;border-radius:9px;border:2px solid rgba(212,175,55,.4);padding:4px;background:#fff;flex-shrink:0}',
  '.qr-label{font-size:12px;font-weight:700;color:#0F5132;margin-bottom:4px}',
  '.qr-sub{font-size:9.5px;color:#777;line-height:1.75}',
  '.notes-card{background:#F8F5EF;border:1px solid rgba(15,81,50,.12);border-radius:13px;padding:16px 18px;margin-top:6px}',
  '.note-item{font-size:10.5px;color:#555;line-height:1.8;padding:4px 0;display:flex;gap:8px}',
  '.note-item::before{content:\'✦\';color:#D4AF37;font-size:9px;flex-shrink:0;margin-top:2px}',
  '.ftr{background:linear-gradient(135deg,#0F5132 0%,#1c6e40 60%,#0F5132 100%);border-radius:0 0 16px 16px;padding:22px 32px;margin-top:26px;position:relative;overflow:hidden}',
  '.ftr::before{content:\'\';position:absolute;top:-20px;right:60px;width:100px;height:100px;background:rgba(212,175,55,.1);border-radius:50%}',
  '.ftr-inner{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;position:relative;z-index:1}',
  '.ty{font-family:\'Cormorant Garamond\',Georgia,serif;font-size:20px;font-style:italic;font-weight:700;color:#D4AF37}',
  '.ftr-badges{display:flex;gap:8px;flex-wrap:wrap}',
  '.ftr-badge{background:rgba(212,175,55,.15);border:1px solid rgba(212,175,55,.3);border-radius:6px;padding:4px 10px;font-size:8px;color:rgba(255,255,255,.7);letter-spacing:.5px}',
  '.copy{font-size:9px;color:rgba(255,255,255,.45);text-align:right;line-height:2}',
  '.banner-done{background:linear-gradient(135deg,#0F5132,#1a7a4a);border-radius:11px;padding:13px 18px;margin:18px 0;text-align:center;font-weight:700;font-size:13px;color:#D4AF37;display:flex;align-items:center;justify-content:center;gap:8px;letter-spacing:.2px;font-family:\'Cormorant Garamond\',Georgia,serif}',
  '.banner-pend{background:linear-gradient(135deg,#fffbeb,#fef3c7);border:1px solid rgba(212,175,55,.4);border-radius:11px;padding:13px 18px;margin:18px 0;text-align:center;font-weight:700;font-size:13px;color:#92660a;display:flex;align-items:center;justify-content:center;gap:8px;letter-spacing:.2px}',
  '@media print{.pbtn{display:none}body{background:#fff!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}}',
  '@media(max-width:600px){.g2{grid-template-columns:1fr}.chips{grid-template-columns:1fr 1fr}.pay-grid{grid-template-columns:1fr}.hdr,.body,.ftr{padding:16px}.wrap{padding:10px}.badge{min-width:150px;text-align:left}.timeline{flex-wrap:wrap;gap:12px}.timeline::before{display:none}}'
].join('\n');

/* ── Build HTML ── */
function buildHTML(data) {
  var docType = data.docType;
  var docNo = data.docNo;
  var booking = data.booking;
  var cName = data.cName;
  var cPhone = data.cPhone;
  var cEmail = data.cEmail;
  var cCity = data.cCity;
  var cSpec = data.cSpec;
  var cCategory = data.cCategory;
  var cCategoryGroup = data.cCategoryGroup;
  var cBusinessName = data.cBusinessName;
  var cuName = data.cuName;
  var cuPhone = data.cuPhone;
  var cuEmail = data.cuEmail;
  var cuLoc = data.cuLoc;
  var amt = data.amt;
  var totalPaid = data.totalPaid;
  var remaining = data.remaining;
  var comm = data.comm;
  var receivable = data.receivable;
  var payments = data.payments;
  var isComplete = data.isComplete;
  var isPartial = data.isPartial;
  var year = data.year;

  var serviceCategory = booking.eventType || cCategory || cSpec || 'Event Service';
  var pkgName = booking.packageName && booking.packageName !== 'Standard' ? booking.packageName : null;
  var vendorGroup = cCategoryGroup || 'Event Professional';
  var vendorDisplay = cBusinessName || cName;
  var eventDate = booking.scheduledDate || booking.eventDate;
  var eventTime = booking.scheduledTime || booking.eventTime || '';
  var eventVenue = booking.scheduledLocation || booking.eventLocation || '';
  var district = cCity || '';

  var payStatusMap = {
    'unpaid': 'Unpaid',
    'partial': 'Partially Paid',
    'proof-submitted': 'Proof Submitted',
    'pending-verification': 'Pending Verification',
    'verified': 'Approved',
    'rejected': 'Rejected',
    'paid': 'Fully Paid'
  };
  var paymentStatusLabel = payStatusMap[booking.paymentStatus] || booking.paymentStatus || '\u2014';

  var statusColor = isComplete ? '#0F5132' : '#b45309';
  var statusBg    = isComplete ? '#f0fdf4'  : '#fffbeb';
  var statusBorder= isComplete ? '#86efac'  : '#fde68a';

  var cInfoParts = [];
  if (cPhone) cInfoParts.push('&#9742; ' + cPhone);
  if (cEmail) cInfoParts.push('&#9993; ' + cEmail);
  if (cCity)  cInfoParts.push('&#128205; ' + cCity);
  var cInfo = cInfoParts.join('<br>');

  var cuInfoParts = [];
  if (cuPhone) cuInfoParts.push('&#9742; ' + cuPhone);
  if (cuEmail) cuInfoParts.push('&#9993; ' + cuEmail);
  if (cuLoc)   cuInfoParts.push('&#128205; ' + cuLoc);
  var cuInfo = cuInfoParts.join('<br>');

  var advanceAmt = booking.bookingFeeAmount || Math.round(amt * 0.05);
  var amtInWords = toWords(Math.round(amt));

  /* ── Section: print button ── */
  var s_btn = '<button class="pbtn" onclick="window.print()">&#11015; Download / Print ' + docType + '</button>';

  /* ── Section: header ── */
  var statusLabel = isComplete ? 'Completed' : 'Partially Paid';
  var s_hdr = '<div class="hdr">'
    + '<div>'
    + '<div class="logo-row">'
    + '<div class="logo-box">BM</div>'
    + '<div>'
    + '<div class="brand">BookMyShot</div>'
    + '<div class="tagline">INDIA\'S COMPLETE WEDDING MARKETPLACE</div>'
    + '</div>'
    + '</div>'
    + '<div class="contact-row">bookmyshot.in &nbsp;|&nbsp; support@bookmyshot.in &nbsp;|&nbsp; +91 8492922173</div>'
    + '</div>'
    + '<div class="badge">'
    + '<div class="btype">' + docType + '</div>'
    + '<div class="bno">' + docNo + '</div>'
    + '<div class="bdate">Generated: ' + fd(new Date()) + '<br>Booking Date: ' + fd(booking.createdAt) + '</div>'
    + '<span class="status-pill" style="background:' + statusBg + ';color:' + statusColor + ';border:1px solid ' + statusBorder + '">' + statusLabel + '</span>'
    + '</div>'
    + '</div>';

  /* ── Section: gold divider ── */
  var s_gold = '<div class="gold-line"></div>';

  /* ── Section: body open with watermark ── */
  var s_body_open = '<div class="body"><div class="watermark">BOOKMYSHOT</div><div class="content">';

  /* ── Section: service banner ── */
  var svcPkgHtml = pkgName ? '<div class="svc-pkg">Package: ' + pkgName + '</div>' : '';
  var s_svc = '<div class="svc-banner">'
    + '<div class="svc-emoji">&#10024;</div>'
    + '<div>'
    + '<div class="svc-label">Service Category</div>'
    + '<div class="svc-name">' + serviceCategory + '</div>'
    + svcPkgHtml
    + '<div class="svc-grp">' + vendorGroup + '</div>'
    + '</div>'
    + '</div>';

  /* ── Section: parties ── */
  var specHtml = cSpec ? '<div class="pc-spec">' + cSpec + '</div>' : '';
  var s_parties = '<div class="sec">Parties</div>'
    + '<div class="g2">'
    + '<div class="pc">'
    + '<div class="pc-role">Vendor / Service Provider</div>'
    + '<div class="pc-name">' + vendorDisplay + '</div>'
    + specHtml
    + '<div class="pc-info">' + (cInfo || '\u2014') + '</div>'
    + '</div>'
    + '<div class="pc">'
    + '<div class="pc-role">Customer / Client</div>'
    + '<div class="pc-name">' + cuName + '</div>'
    + '<div class="pc-info">' + (cuInfo || '\u2014') + '</div>'
    + '</div>'
    + '</div>'
    + '<div class="hr"></div>';

  /* ── Section: booking details ── */
  var eventTimeChip = eventTime
    ? '<div class="chip"><div class="chip-l">Event Time</div><div class="chip-v">' + eventTime + '</div></div>'
    : '';
  var pkgChip = pkgName
    ? '<div class="chip"><div class="chip-l">Package</div><div class="chip-v">' + pkgName + '</div></div>'
    : '<div class="chip"><div class="chip-l">Event Type</div><div class="chip-v">' + (booking.eventType || '\u2014') + '</div></div>';
  var districtChip = district
    ? '<div class="chip"><div class="chip-l">District / State</div><div class="chip-v">' + district + '</div></div>'
    : '';

  var s_details = '<div class="sec">Booking Details</div>'
    + '<div class="chips">'
    + '<div class="chip"><div class="chip-l">Service</div><div class="chip-v">' + serviceCategory + '</div></div>'
    + pkgChip
    + '<div class="chip"><div class="chip-l">Event Date</div><div class="chip-v">' + fd(eventDate) + '</div></div>'
    + eventTimeChip
    + '<div class="chip"><div class="chip-l">Venue / Location</div><div class="chip-v">' + (eventVenue || '\u2014') + '</div></div>'
    + districtChip
    + '<div class="chip"><div class="chip-l">Booking Status</div><div class="chip-v" style="color:' + statusColor + '">' + (booking.status || '\u2014') + '</div></div>'
    + '<div class="chip"><div class="chip-l">Payment Status</div><div class="chip-v">' + paymentStatusLabel + '</div></div>'
    + '<div class="chip"><div class="chip-l">Booking ID</div><div class="chip-v" style="font-size:9px">' + docNo + '</div></div>'
    + '</div>'
    + '<div class="hr"></div>';

  /* ── Section: payment summary cards ── */
  var s_payment = '<div class="sec">Payment Summary</div>'
    + '<div class="pay-grid">'
    + '<div class="pay-card green">'
    + '<div class="pay-card-label green">Booking Amount</div>'
    + '<div class="pay-card-amount green">' + fc(amt) + '</div>'
    + '<div class="pay-card-sub" style="color:#0F5132">Total service value</div>'
    + '</div>'
    + '<div class="pay-card gold">'
    + '<div class="pay-card-label gold">Advance Paid to BookMyShot (5%)</div>'
    + '<div class="pay-card-amount gold">' + fc(advanceAmt) + '</div>'
    + '<div class="pay-card-sub" style="color:#92660a">Platform booking fee</div>'
    + '</div>'
    + '<div class="pay-card amber">'
    + '<div class="pay-card-label amber">Remaining Payable to Vendor</div>'
    + '<div class="pay-card-amount amber">' + fc(remaining > 0 ? remaining : 0) + '</div>'
    + '<div class="pay-card-sub" style="color:#b45309">' + (remaining > 0 ? 'Balance due to vendor' : 'Fully settled') + '</div>'
    + '</div>'
    + '<div class="pay-card dark">'
    + '<div class="pay-card-label dark">Vendor Receivable</div>'
    + '<div class="pay-card-amount dark">' + fc(receivable) + '</div>'
    + '<div class="pay-card-sub dark">Net amount for vendor</div>'
    + '</div>'
    + '</div>';

  /* ── Section: amount in words ── */
  var s_words = '<div class="words-row">'
    + '<div style="font-size:20px">&#128218;</div>'
    + '<div>'
    + '<div class="words-label">Amount in Words</div>'
    + '<div class="words-text">' + amtInWords + '</div>'
    + '</div>'
    + '</div>';

  /* ── Section: advance note ── */
  var s_note = '<div class="advance-note">'
    + '<span style="font-size:18px">&#128196;</span>'
    + '<div class="advance-note-txt">'
    + '<strong>Important:</strong> A 5% advance (' + fc(advanceAmt) + ') has been paid to BookMyShot as the platform booking fee. '
    + 'The remaining balance of ' + fc(remaining > 0 ? remaining : 0) + ' is payable directly to the vendor on/before the event date.'
    + '</div>'
    + '</div>';

  /* ── Section: payment history table ── */
  var payRows = '';
  for (var pi = 0; pi < payments.length; pi++) {
    var p = payments[pi];
    var rowBg = pi % 2 === 0 ? '#ffffff' : '#fafaf7';
    payRows += '<tr style="background:' + rowBg + '">'
      + '<td>' + fd(p.createdAt) + '</td>'
      + '<td style="color:#0F5132;font-weight:700">' + fc(p.amount) + '</td>'
      + '<td>' + (p.paymentType || '\u2014') + '</td>'
      + '<td>' + (p.addedBy || '\u2014') + '</td>'
      + '<td><span style="background:#f0fdf4;color:#0F5132;font-size:9px;font-weight:700;padding:2px 9px;border-radius:12px">Approved</span></td>'
      + '</tr>';
  }
  var s_history = payments.length > 0
    ? '<div class="hr"></div><div class="sec">Payment History (' + payments.length + ' record' + (payments.length > 1 ? 's' : '') + ')</div>'
      + '<table><thead><tr><th>Date</th><th>Amount</th><th>Type</th><th>Recorded By</th><th>Status</th></tr></thead>'
      + '<tbody>' + payRows + '</tbody></table>'
    : '';

  /* ── Section: timeline ── */
  var tlSteps = [
    { label: 'Booking Created', icon: '&#128203;', done: true },
    { label: 'Advance Paid', icon: '&#128181;', done: advanceAmt > 0 || totalPaid > 0 },
    { label: 'Booking Confirmed', icon: '&#9989;', done: booking.status !== 'Booking Created' },
    { label: 'Event Completed', icon: '&#127881;', done: booking.status === 'Completed' },
    { label: 'Invoice Generated', icon: '&#128196;', done: isComplete }
  ];

  var tlHtml = '';
  for (var ti = 0; ti < tlSteps.length; ti++) {
    var step = tlSteps[ti];
    var isCurr = !step.done && (ti === 0 || tlSteps[ti - 1].done);
    var dotCls = step.done ? 'done' : (isCurr ? 'curr' : 'pend');
    tlHtml += '<div class="tl-step">'
      + '<div class="tl-dot ' + dotCls + '">' + step.icon + '</div>'
      + '<div class="tl-label">' + step.label + '</div>'
      + '</div>';
  }
  var s_timeline = '<div class="hr"></div><div class="sec">Booking Timeline</div>'
    + '<div class="timeline">' + tlHtml + '</div>';

  /* ── Section: status banner ── */
  var s_banner = isComplete
    ? '<div class="banner-done">&#10003; Service Completed \u2014 Booking Officially Closed</div>'
    : '<div class="banner-pend">&#9888; Partial Payment Receipt \u2014 Balance Pending</div>';

  /* ── Section: QR card ── */
  var qrUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=70x70&bgcolor=FFFFFF&color=0F5132&data=' + encodeURIComponent('bookmyshot.in | ' + docNo);
  var s_qr = '<div class="hr"></div>'
    + '<div class="qr-card">'
    + '<img class="qr-img" src="' + qrUrl + '" alt="QR Code">'
    + '<div>'
    + '<div class="qr-label">Scan to Verify this Document</div>'
    + '<div class="qr-sub">Auto-generated by BookMyShot \u2014 India\'s Complete Wedding Marketplace.<br>'
    + 'Reference: ' + docNo + ' &nbsp;|&nbsp; Valid digital document. No physical signature required.</div>'
    + '</div>'
    + '</div>';

  /* ── Section: notes card ── */
  var s_notes = '<div class="hr"></div>'
    + '<div class="sec">Important Notes</div>'
    + '<div class="notes-card">'
    + '<div class="note-item">This document is auto-generated by BookMyShot and serves as a valid digital receipt.</div>'
    + '<div class="note-item">The 5% advance paid to BookMyShot is a non-refundable platform booking fee and is separate from the vendor\'s service fee.</div>'
    + '<div class="note-item">The remaining balance is to be settled directly between the customer and the vendor prior to or on the event date.</div>'
    + '<div class="note-item">For disputes or queries, contact BookMyShot support at support@bookmyshot.in or +91 8492922173.</div>'
    + '<div class="note-item">BookMyShot is not liable for the quality of services rendered by the vendor. Choose wisely.</div>'
    + '</div>';

  /* ── Section: footer ── */
  var s_ftr = '<div class="ftr">'
    + '<div class="ftr-inner">'
    + '<div>'
    + '<div class="ty">Thank You for Choosing BookMyShot!</div>'
    + '<div class="ftr-badges">'
    + '<span class="ftr-badge">&#9733; Verified Platform</span>'
    + '<span class="ftr-badge">&#128274; Secure Payments</span>'
    + '<span class="ftr-badge">&#128591; Trusted by Thousands</span>'
    + '</div>'
    + '</div>'
    + '<div class="copy">'
    + '<strong style="color:#D4AF37">BookMyShot</strong><br>'
    + 'India\'s Complete Wedding Marketplace<br>'
    + 'bookmyshot.in &bull; &copy; ' + year + ' BookMyShot. All rights reserved.'
    + '</div>'
    + '</div>'
    + '</div>';

  /* ── Assemble ── */
  var head = '<!DOCTYPE html>'
    + '<html lang="en">'
    + '<head>'
    + '<meta charset="utf-8">'
    + '<meta name="viewport" content="width=device-width,initial-scale=1">'
    + '<title>' + docType + ' ' + docNo + '</title>'
    + '<style>' + CSS + '</style>'
    + '</head>'
    + '<body>'
    + '<div class="wrap">';

  var close = '</div></div>'   /* close .content + .body */
    + s_ftr
    + '</div>'                 /* close .wrap */
    + '</body></html>';

  return head
    + s_btn
    + s_hdr
    + s_gold
    + s_body_open
    + s_svc
    + s_parties
    + s_details
    + s_payment
    + s_words
    + s_note
    + s_history
    + s_timeline
    + s_banner
    + s_qr
    + s_notes
    + close;
}

/* ═══ GET /api/invoice/:id ═══════════════════════════════════════════════ */
router.get('/:id', async function(req, res, next) {
  try {
    var user = await authenticateRequest(req);
    if (!user) return res.status(401).send(
      '<!DOCTYPE html><html><body style="font-family:sans-serif;padding:40px;background:#F8F5EF;text-align:center">'
      + '<h2 style="color:#0F5132;font-family:Georgia,serif">Login Required</h2>'
      + '<p style="color:#555;margin-top:12px">Please log in first, then open the invoice again.</p>'
      + '<a href="/login.html" style="color:#D4AF37;font-weight:600">Go to Login \u2192</a>'
      + '</body></html>'
    );

    var booking = await Booking.findById(req.params.id)
      .populate('user', 'name email phone')
      .populate({ path: 'creator', populate: { path: 'user', select: 'name email phone' }, select: 'user specialty city businessName category categoryGroup categorySlug' });
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

    var uid  = user._id.toString();
    var buid = (booking.user && booking.user._id ? booking.user._id : booking.user || '').toString();
    var cuid = (booking.creator && booking.creator.user && booking.creator.user._id ? booking.creator.user._id : '').toString();
    if (uid !== buid && uid !== cuid && user.role !== 'admin')
      return res.status(403).json({ success: false, message: 'Access denied' });

    var payments  = await PaymentRecord.find({ booking: booking._id, status: 'approved' }).sort('createdAt').lean();
    var totalPaid = payments.reduce(function(s, r) { return s + (r.amount || 0); }, 0);
    var amt       = booking.amount || booking.budget || 0;
    var remaining = Math.max(0, amt - totalPaid);
    var isComplete = booking.status === 'Completed' || remaining === 0;
    var comm      = booking.commissionAmount || Math.round(amt * ((booking.commissionPercent || 0) / 100));
    var receivable = booking.creatorReceivable || (amt - comm);
    var invNo     = booking.invoiceNumber || 'BMS-' + booking._id.toString().slice(-8).toUpperCase();

    var html = buildHTML({
      docType:  isComplete ? 'Tax Invoice' : 'Payment Receipt',
      docNo:    isComplete ? invNo : 'BMS-PR-' + booking._id.toString().slice(-8).toUpperCase(),
      booking:  booking,
      cName:          (booking.creator && booking.creator.user && booking.creator.user.name)        || '\u2014',
      cPhone:         (booking.creator && booking.creator.user && booking.creator.user.phone)       || '',
      cEmail:         (booking.creator && booking.creator.user && booking.creator.user.email)       || '',
      cCity:          (booking.creator && booking.creator.city)              || '',
      cSpec:          (booking.creator && booking.creator.specialty)         || '',
      cCategory:      (booking.creator && booking.creator.category)          || '',
      cCategoryGroup: (booking.creator && booking.creator.categoryGroup)     || '',
      cBusinessName:  (booking.creator && booking.creator.businessName)      || '',
      cuName:   booking.clientName  || (booking.user && booking.user.name)  || '\u2014',
      cuPhone:  booking.clientPhone || (booking.user && booking.user.phone) || '',
      cuEmail:  booking.clientEmail || (booking.user && booking.user.email) || '',
      cuLoc:    booking.eventLocation || '',
      amt: amt, totalPaid: totalPaid, remaining: remaining, comm: comm, receivable: receivable,
      payments: payments,
      isComplete: isComplete, isPartial: !isComplete,
      year: new Date().getFullYear()
    });

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (e) { next(e); }
});

/* ═══ GET /api/invoice/:id/partial ═══════════════════════════════════════ */
router.get('/:id/partial', async function(req, res, next) {
  try {
    var user = await authenticateRequest(req);
    if (!user) return res.status(401).send(
      '<!DOCTYPE html><html><body style="font-family:sans-serif;padding:40px;background:#F8F5EF;text-align:center">'
      + '<h2 style="color:#0F5132;font-family:Georgia,serif">Login Required</h2>'
      + '<p style="color:#555;margin-top:12px">Please log in first.</p>'
      + '<a href="/login.html" style="color:#D4AF37;font-weight:600">Go to Login \u2192</a>'
      + '</body></html>'
    );

    var booking = await Booking.findById(req.params.id)
      .populate('user', 'name email phone')
      .populate({ path: 'creator', populate: { path: 'user', select: 'name email phone' }, select: 'user specialty city businessName category categoryGroup categorySlug' });
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

    var uid  = user._id.toString();
    var buid = (booking.user && booking.user._id ? booking.user._id : booking.user || '').toString();
    var cuid = (booking.creator && booking.creator.user && booking.creator.user._id ? booking.creator.user._id : '').toString();
    if (uid !== buid && uid !== cuid && user.role !== 'admin')
      return res.status(403).json({ success: false, message: 'Access denied' });

    var payments  = await PaymentRecord.find({ booking: booking._id, status: 'approved' }).sort('createdAt').lean();
    var totalPaid = payments.reduce(function(s, r) { return s + (r.amount || 0); }, 0);
    if (totalPaid === 0) return res.status(400).json({ success: false, message: 'No payments recorded yet' });

    var amt       = booking.amount || booking.budget || 0;
    var remaining = Math.max(0, amt - totalPaid);
    var isComplete = remaining === 0;
    var comm      = Math.round(totalPaid * ((booking.commissionPercent || 0) / 100));
    var receivable = totalPaid - comm;
    var receiptNo = 'BMS-PR-' + booking._id.toString().slice(-8).toUpperCase();

    var html = buildHTML({
      docType:  'Payment Receipt',
      docNo:    receiptNo,
      booking:  booking,
      cName:          (booking.creator && booking.creator.user && booking.creator.user.name)        || '\u2014',
      cPhone:         (booking.creator && booking.creator.user && booking.creator.user.phone)       || '',
      cEmail:         (booking.creator && booking.creator.user && booking.creator.user.email)       || '',
      cCity:          (booking.creator && booking.creator.city)              || '',
      cSpec:          (booking.creator && booking.creator.specialty)         || '',
      cCategory:      (booking.creator && booking.creator.category)          || '',
      cCategoryGroup: (booking.creator && booking.creator.categoryGroup)     || '',
      cBusinessName:  (booking.creator && booking.creator.businessName)      || '',
      cuName:   booking.clientName  || (booking.user && booking.user.name)  || '\u2014',
      cuPhone:  booking.clientPhone || (booking.user && booking.user.phone) || '',
      cuEmail:  booking.clientEmail || (booking.user && booking.user.email) || '',
      cuLoc:    booking.eventLocation || '',
      amt: amt, totalPaid: totalPaid, remaining: remaining, comm: comm, receivable: receivable,
      payments: payments,
      isComplete: isComplete, isPartial: true,
      year: new Date().getFullYear()
    });

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (e) { next(e); }
});

module.exports = router;
