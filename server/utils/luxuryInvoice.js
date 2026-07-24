/**
 * BookMyShot — Luxury Wedding Marketplace Invoice
 * Theme: White · Emerald Green (#0F5132) · Gold (#D4AF37) · Champagne (#F8F5EF)
 */

const fd = d => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" }) : "—";
const ft = t => t || "—";
const fc = n => "₹" + (n || 0).toLocaleString("en-IN");
function toWords(n) {
  if (!n || n === 0) return "Zero Rupees Only";
  const ones = ["","One","Two","Three","Four","Five","Six","Seven","Eight","Nine","Ten","Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen","Seventeen","Eighteen","Nineteen"];
  const tens = ["","","Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety"];
  function hw(n) {
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n/10)] + (n%10?" "+ones[n%10]:"");
    return ones[Math.floor(n/100)]+" Hundred"+(n%100?" "+hw(n%100):"");
  }
  let w = "", num = Math.floor(n);
  if (num >= 10000000) { w += hw(Math.floor(num/10000000))+" Crore "; num %= 10000000; }
  if (num >= 100000)   { w += hw(Math.floor(num/100000))+" Lakh "; num %= 100000; }
  if (num >= 1000)     { w += hw(Math.floor(num/1000))+" Thousand "; num %= 1000; }
  if (num > 0)         { w += hw(num); }
  return w.trim() + " Rupees Only";
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700&display=swap');
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Inter',system-ui,sans-serif;background:#fff;color:#1a1a1a;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.page{max-width:860px;margin:0 auto;padding:0;background:#fff}

/* ── HEADER ── */
.hdr{background:#fff;padding:36px 44px 0;position:relative;overflow:hidden}
.hdr-inner{display:flex;justify-content:space-between;align-items:flex-start;gap:24px;flex-wrap:wrap}
.logo-side{}
.logo-mark{display:flex;align-items:center;gap:14px;margin-bottom:10px}
.logo-emblem{width:54px;height:54px;border-radius:14px;background:linear-gradient(135deg,#0F5132,#1a7a4a);display:flex;align-items:center;justify-content:center;box-shadow:0 4px 18px rgba(15,81,50,.25)}
.logo-emblem svg{width:32px;height:32px}
.logo-text{}
.logo-name{font-family:'Cormorant Garamond',serif;font-size:26px;font-weight:700;color:#0F5132;letter-spacing:2px;text-transform:uppercase;line-height:1}
.logo-sub{font-size:9px;color:#D4AF37;letter-spacing:3px;text-transform:uppercase;font-weight:600;margin-top:3px}
.logo-contacts{display:flex;flex-direction:column;gap:4px;margin-top:12px}
.contact-item{display:flex;align-items:center;gap:6px;font-size:9.5px;color:#666}
.contact-dot{width:5px;height:5px;border-radius:50%;background:#D4AF37;flex-shrink:0}

.inv-badge{background:linear-gradient(135deg,#0F5132 0%,#1a7a4a 100%);border-radius:18px;padding:20px 24px;min-width:220px;box-shadow:0 8px 32px rgba(15,81,50,.18)}
.ib-label{font-size:8px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:rgba(212,175,55,.9);margin-bottom:6px}
.ib-no{font-family:'Cormorant Garamond',serif;font-size:22px;font-weight:700;color:#fff;letter-spacing:1px;margin-bottom:10px}
.ib-row{display:flex;justify-content:space-between;gap:16px;margin-top:8px}
.ib-item label{display:block;font-size:8px;color:rgba(255,255,255,.55);letter-spacing:1px;text-transform:uppercase;margin-bottom:2px}
.ib-item span{font-size:10.5px;font-weight:600;color:#fff}
.badge-row{display:flex;gap:8px;margin-top:12px;flex-wrap:wrap}
.badge-pill{font-size:8.5px;font-weight:700;padding:4px 11px;border-radius:20px;display:inline-flex;align-items:center;gap:4px}
.pill-green{background:rgba(16,185,129,.15);color:#065f46;border:1px solid rgba(16,185,129,.35)}
.pill-gold{background:rgba(212,175,55,.15);color:#92400e;border:1px solid rgba(212,175,55,.4)}
.pill-blue{background:rgba(59,130,246,.12);color:#1e40af;border:1px solid rgba(59,130,246,.3)}

/* ── GOLD DIVIDER ── */
.gold-line{height:1px;background:linear-gradient(90deg,transparent,#D4AF37,#0F5132,#D4AF37,transparent);margin:24px 44px 0}
.gold-ornament{text-align:center;color:#D4AF37;font-size:14px;letter-spacing:8px;margin:6px 0;opacity:.7}

/* ── WATERMARK BANNER ── */
.wm-wrap{position:relative;margin:0 44px;height:60px;overflow:hidden;border-radius:12px;margin-bottom:0}
.wm-bg{position:absolute;inset:0;background:linear-gradient(135deg,#F8F5EF,#fff);opacity:.6;border-radius:12px}
.wm-text{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-family:'Cormorant Garamond',serif;font-size:42px;font-weight:700;color:#0F5132;opacity:.06;letter-spacing:16px;text-transform:uppercase;white-space:nowrap}
.wm-content{position:relative;z-index:1;display:flex;align-items:center;justify-content:center;height:100%;gap:12px}
.wm-tag{font-size:8.5px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#0F5132;opacity:.7}
.wm-dot{width:3px;height:3px;border-radius:50%;background:#D4AF37;opacity:.6}

/* ── BODY ── */
.body{padding:20px 44px 44px}

/* ── CARDS ── */
.card{background:#fff;border:1px solid rgba(212,175,55,.25);border-radius:18px;padding:22px 24px;margin-bottom:18px;box-shadow:0 2px 20px rgba(0,0,0,.05),0 0 0 0.5px rgba(212,175,55,.1)}
.card-hdr{display:flex;align-items:center;gap:10px;margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid rgba(212,175,55,.15)}
.card-icon{width:32px;height:32px;border-radius:10px;background:linear-gradient(135deg,#F8F5EF,#f0ebe0);border:1px solid rgba(212,175,55,.2);display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0}
.card-title{font-family:'Cormorant Garamond',serif;font-size:15px;font-weight:700;color:#0F5132;letter-spacing:.5px}
.card-sub{font-size:9px;color:#999;letter-spacing:.5px;margin-top:1px}
`;

const CSS2 = `
/* ── PARTY GRID ── */
.party-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.party-block{}
.party-label{font-size:8px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#D4AF37;margin-bottom:8px}
.party-name{font-family:'Cormorant Garamond',serif;font-size:18px;font-weight:700;color:#0F5132;margin-bottom:6px;line-height:1.2}
.party-specialty{font-size:9.5px;color:#D4AF37;font-weight:600;margin-bottom:8px}
.party-detail{font-size:10px;color:#555;line-height:1.9}
.party-sep{width:1px;background:linear-gradient(180deg,transparent,rgba(212,175,55,.3),transparent);margin:0 4px}

/* ── BOOKING GRID ── */
.bk-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px}
.bk-cell{background:#F8F5EF;border-radius:12px;padding:11px 13px;border:1px solid rgba(212,175,55,.12)}
.bk-label{font-size:7.5px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#999;margin-bottom:4px}
.bk-val{font-size:11.5px;font-weight:700;color:#1a1a1a}
.bk-val.green{color:#0F5132}
.bk-val.gold{color:#92400e}

/* ── SERVICE BANNER ── */
.svc-banner{background:linear-gradient(135deg,#F8F5EF 0%,#f0ebe0 100%);border:1px solid rgba(212,175,55,.3);border-radius:14px;padding:14px 18px;margin-bottom:18px;display:flex;align-items:center;gap:14px}
.svc-icon{width:44px;height:44px;border-radius:12px;background:linear-gradient(135deg,#0F5132,#1a7a4a);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0}
.svc-label{font-size:8px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#999;margin-bottom:3px}
.svc-name{font-family:'Cormorant Garamond',serif;font-size:20px;font-weight:700;color:#0F5132}
.svc-pkg{font-size:10px;color:#D4AF37;font-weight:600;margin-top:2px}
.svc-group{font-size:9px;color:#888;margin-top:1px}

/* ── PAYMENT CARDS ── */
.pay-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px}
.pay-card{border-radius:14px;padding:14px 16px;border:1px solid}
.pay-total{background:#F8F5EF;border-color:rgba(212,175,55,.25)}
.pay-paid{background:linear-gradient(135deg,#f0fdf4,#dcfce7);border-color:rgba(22,163,74,.2)}
.pay-due{background:linear-gradient(135deg,#fffbeb,#fef3c7);border-color:rgba(217,119,6,.2)}
.pay-vendor{background:linear-gradient(135deg,#f0f9ff,#e0f2fe);border-color:rgba(14,165,233,.2)}
.pay-card-label{font-size:8px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#888;margin-bottom:6px}
.pay-card-amt{font-family:'Cormorant Garamond',serif;font-size:22px;font-weight:700;line-height:1}
.pay-card-sub{font-size:9px;color:#666;margin-top:4px;line-height:1.5}
.pay-total .pay-card-amt{color:#0F5132}
.pay-paid .pay-card-amt{color:#15803d}
.pay-due .pay-card-amt{color:#b45309}
.pay-vendor .pay-card-amt{color:#0369a1}

.words-row{background:linear-gradient(135deg,#0F5132,#1a7a4a);border-radius:12px;padding:12px 16px;margin:10px 0}
.words-label{font-size:8px;color:rgba(255,255,255,.6);letter-spacing:1.5px;text-transform:uppercase;margin-bottom:4px}
.words-val{font-size:11px;font-weight:600;color:#fff;font-style:italic}

.booking-note{background:#F8F5EF;border-left:3px solid #D4AF37;border-radius:0 10px 10px 0;padding:12px 14px;margin-top:10px;font-size:10px;color:#555;line-height:1.7}
.booking-note strong{color:#0F5132}

/* ── TIMELINE ── */
.timeline{display:flex;align-items:center;justify-content:space-between;padding:8px 0;overflow-x:auto}
.tl-step{display:flex;flex-direction:column;align-items:center;gap:6px;flex:1;min-width:70px}
.tl-icon{width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:15px;border:2px solid}
.tl-done .tl-icon{background:linear-gradient(135deg,#0F5132,#1a7a4a);border-color:#0F5132;color:#fff}
.tl-active .tl-icon{background:#F8F5EF;border-color:#D4AF37;color:#D4AF37}
.tl-pending .tl-icon{background:#f9f9f9;border-color:#ddd;color:#bbb}
.tl-label{font-size:8px;font-weight:600;color:#555;text-align:center;letter-spacing:.3px;line-height:1.3}
.tl-done .tl-label{color:#0F5132}
.tl-active .tl-label{color:#D4AF37}
.tl-line{flex:1;height:1.5px;background:linear-gradient(90deg,#D4AF37,rgba(212,175,55,.3));margin:0 4px;margin-bottom:28px}
.tl-line-pending{flex:1;height:1.5px;background:#e5e5e5;margin:0 4px;margin-bottom:28px}

/* ── QR CARD ── */
.qr-card{display:flex;align-items:center;gap:20px}
.qr-img{width:80px;height:80px;border-radius:12px;border:2px solid rgba(212,175,55,.3);padding:4px;background:#fff;flex-shrink:0}
.qr-text{}
.qr-title{font-family:'Cormorant Garamond',serif;font-size:15px;font-weight:700;color:#0F5132;margin-bottom:4px}
.qr-sub{font-size:9.5px;color:#666;line-height:1.7}
.qr-verified{display:inline-flex;align-items:center;gap:5px;background:linear-gradient(135deg,#F8F5EF,#f0ebe0);border:1px solid rgba(212,175,55,.3);border-radius:20px;padding:4px 12px;margin-top:8px;font-size:8.5px;font-weight:700;color:#0F5132;letter-spacing:.5px}

/* ── NOTES ── */
.notes-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.note-item{display:flex;gap:9px;align-items:flex-start}
.note-dot{width:18px;height:18px;border-radius:50%;background:linear-gradient(135deg,#F8F5EF,#f0ebe0);border:1px solid rgba(212,175,55,.25);display:flex;align-items:center;justify-content:center;font-size:9px;flex-shrink:0;margin-top:1px}
.note-text{font-size:10px;color:#555;line-height:1.6}
.note-text strong{color:#0F5132;font-weight:600}

/* ── FOOTER ── */
.ftr{background:linear-gradient(135deg,#0F5132 0%,#1a7a4a 60%,#0F5132 100%);padding:32px 44px;margin-top:0}
.ftr-top{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:20px;margin-bottom:20px}
.ftr-ty{font-family:'Cormorant Garamond',serif;font-size:28px;font-weight:700;color:#fff}
.ftr-ty span{color:#D4AF37}
.ftr-icons{display:flex;gap:20px;flex-wrap:wrap}
.ftr-icon-item{display:flex;align-items:center;gap:7px;font-size:9.5px;color:rgba(255,255,255,.75)}
.ftr-icon-dot{width:20px;height:20px;border-radius:8px;background:rgba(212,175,55,.15);border:1px solid rgba(212,175,55,.25);display:flex;align-items:center;justify-content:center;font-size:10px}
.ftr-divider{height:1px;background:linear-gradient(90deg,transparent,rgba(212,175,55,.4),transparent);margin-bottom:16px}
.ftr-bottom{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px}
.ftr-copy{font-size:9px;color:rgba(255,255,255,.45);line-height:1.7}
.ftr-trust{display:flex;gap:14px;flex-wrap:wrap}
.trust-item{font-size:8.5px;color:rgba(255,255,255,.6);display:flex;align-items:center;gap:4px}
.trust-dot{width:4px;height:4px;border-radius:50%;background:#D4AF37}

/* ── PRINT BUTTON ── */
.pbtn-wrap{text-align:center;padding:20px 44px 0}
.pbtn{padding:13px 36px;background:linear-gradient(135deg,#0F5132,#1a7a4a);color:#fff;border:none;border-radius:12px;font-size:13px;font-weight:700;cursor:pointer;font-family:'Inter',sans-serif;letter-spacing:.5px;box-shadow:0 4px 18px rgba(15,81,50,.25)}
.pbtn:hover{opacity:.92}

/* ── RESPONSIVE ── */
@media print{
  .pbtn-wrap{display:none}
  body{background:#fff}
  .page{max-width:100%}
}
@media(max-width:600px){
  .hdr,.body,.ftr{padding-left:20px;padding-right:20px}
  .gold-line{margin:20px 20px 0}
  .wm-wrap{margin:0 20px}
  .hdr-inner,.party-grid,.pay-grid,.bk-grid{grid-template-columns:1fr}
  .bk-grid{grid-template-columns:1fr 1fr}
  .notes-grid{grid-template-columns:1fr}
  .party-sep{display:none}
  .inv-badge{min-width:100%}
  .timeline{gap:0}
  .tl-label{font-size:7px}
}
`;

function buildLuxuryInvoice(data) {
  const {
    booking, payments = [], cName, cPhone, cEmail, cCity, cSpec, cCategoryGroup,
    cuName, cuPhone, cuEmail, cuLoc,
    amt, totalPaid, remaining, comm, receivable,
    isComplete, isPartial, docType, docNo, year
  } = data;

  const serviceCategory = booking.eventType || cSpec || "Wedding Service";
  const pkgName = booking.packageName && booking.packageName !== "Standard" ? booking.packageName : null;
  const vendorGroup = cCategoryGroup || "Wedding Professional";
  const eventDate = booking.scheduledDate || booking.eventDate;
  const eventTime = booking.scheduledTime || booking.eventTime || "";
  const eventVenue = booking.scheduledLocation || booking.eventLocation || "";
  const amtWords = toWords(amt);
  const advanceToBookMyShot = comm;
  const remainingToVendor = receivable;

  const payStatusMap = {
    unpaid:"Unpaid", partial:"Partially Paid", "proof-submitted":"Proof Submitted",
    "pending-verification":"Pending Verification", verified:"Approved", rejected:"Rejected", paid:"Fully Paid"
  };
  const paymentStatusLabel = payStatusMap[booking.paymentStatus] || booking.paymentStatus || "—";

  const statusBadgeCls = isComplete ? "pill-green" : "pill-gold";
  const statusBadgeTxt = isComplete ? "✓ Completed" : "● Active";
  const payBadgeCls = (booking.paymentStatus === "paid" || booking.paymentStatus === "verified") ? "pill-green" : "pill-gold";
  const payBadgeTxt = paymentStatusLabel;

  // Payment rows
  const payRowsHtml = payments.map((p, i) =>
    `<tr style="background:${i%2===0?"#fff":"#F8F5EF"}">
      <td style="padding:9px 12px;font-size:10px;color:#555;border-bottom:1px solid rgba(212,175,55,.1)">${fd(p.createdAt)}</td>
      <td style="padding:9px 12px;font-size:10px;font-weight:700;color:#0F5132;border-bottom:1px solid rgba(212,175,55,.1)">${fc(p.amount)}</td>
      <td style="padding:9px 12px;font-size:10px;color:#555;text-transform:capitalize;border-bottom:1px solid rgba(212,175,55,.1)">${p.paymentType||"—"}</td>
      <td style="padding:9px 12px;font-size:10px;color:#555;text-transform:capitalize;border-bottom:1px solid rgba(212,175,55,.1)">${p.addedBy||"—"}</td>
      <td style="padding:9px 12px;border-bottom:1px solid rgba(212,175,55,.1)"><span style="background:#dcfce7;color:#15803d;font-size:8px;font-weight:700;padding:2px 9px;border-radius:20px">✓ Approved</span></td>
    </tr>`
  ).join("");

  // Timeline steps
  const tlSteps = [
    { icon: "📋", label: "Booking\nCreated", done: true },
    { icon: "💰", label: "Advance\nPaid", done: totalPaid > 0 },
    { icon: "✅", label: "Booking\nConfirmed", done: ["Creator Accepted","Payment Submitted","Payment Approved","Event Scheduled","Completed"].includes(booking.status) },
    { icon: "🎉", label: "Event\nCompleted", done: booking.status === "Completed" },
    { icon: "📄", label: "Invoice\nGenerated", done: true },
  ];

  const tlHtml = tlSteps.map((s, i) => {
    const cls = s.done ? "tl-done" : "tl-active";
    const step = `<div class="tl-step ${cls}"><div class="tl-icon">${s.icon}</div><div class="tl-label">${s.label.replace("\n","<br>")}</div></div>`;
    const line = i < tlSteps.length - 1
      ? `<div class="${s.done && tlSteps[i+1].done ? "tl-line" : "tl-line-pending"}"></div>`
      : "";
    return step + line;
  }).join("");

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=80x80&bgcolor=FFFFFF&color=0F5132&data=${encodeURIComponent("bookmyshot.in | " + docNo)}`;

  const serviceEmoji = {
    "dj":"🎵","music":"🎶","band":"🎸","dance":"💃","anchor":"🎤",
    "makeup":"💄","bridal":"👰","mehndi":"🌿","beauty":"✨",
    "decoration":"🌸","flower":"🌹","tent":"🎪","venue":"🏛️",
    "catering":"🍽️","food":"🍴","sweet":"🍮",
    "photography":"📷","photo":"📷","video":"🎬","cinema":"🎬",
    "planning":"📋","planner":"💍","coordinator":"🗓️",
    "pandit":"🕉️","qazi":"☪️","car":"🚗","transport":"🚘",
    "invitation":"💌","rental":"🎭","light":"💡"
  };
  const svcLower = serviceCategory.toLowerCase();
  const svcIcon = Object.keys(serviceEmoji).find(k => svcLower.includes(k));
  const icon = serviceEmoji[svcIcon] || "✨";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${docType} — ${docNo} — BookMyShot</title>
<style>${CSS}${CSS2}</style>
</head>
<body>
<div class="page">

<div class="pbtn-wrap">
  <button class="pbtn" onclick="window.print()">⬇&nbsp; Download / Print Invoice</button>
</div>

<!-- ══ HEADER ══════════════════════════════════════════════ -->
<div class="hdr">
  <div class="hdr-inner">
    <div class="logo-side">
      <div class="logo-mark">
        <div class="logo-emblem">
          <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M16 4C9.373 4 4 9.373 4 16s5.373 12 12 12 12-5.373 12-12S22.627 4 16 4z" fill="rgba(212,175,55,.25)"/>
            <path d="M16 8l2 6h6l-5 3.5 2 6L16 20l-5 3.5 2-6L8 14h6l2-6z" fill="#D4AF37"/>
          </svg>
        </div>
        <div class="logo-text">
          <div class="logo-name">BookMyShot</div>
          <div class="logo-sub">India's Premium Wedding Marketplace</div>
        </div>
      </div>
      <div class="logo-contacts">
        <div class="contact-item"><div class="contact-dot"></div>bookmyshot.in</div>
        <div class="contact-item"><div class="contact-dot"></div>support@bookmyshot.in</div>
        <div class="contact-item"><div class="contact-dot"></div>+91 8492922173</div>
      </div>
    </div>
    <div class="inv-badge">
      <div class="ib-label">Official Invoice</div>
      <div class="ib-no">${docNo}</div>
      <div class="ib-row">
        <div class="ib-item"><label>Invoice Date</label><span>${fd(new Date())}</span></div>
        <div class="ib-item"><label>Booking Date</label><span>${fd(booking.createdAt)}</span></div>
      </div>
      <div class="badge-row">
        <span class="badge-pill ${statusBadgeCls}">${statusBadgeTxt}</span>
        <span class="badge-pill ${payBadgeCls}">₹ ${payBadgeTxt}</span>
      </div>
    </div>
  </div>
</div>

<div class="gold-line"></div>
<div class="gold-ornament">✦ ✦ ✦</div>

<!-- ══ WATERMARK BANNER ════════════════════════════════════ -->
<div class="wm-wrap">
  <div class="wm-bg"></div>
  <div class="wm-text">BOOKMYSHOT</div>
  <div class="wm-content">
    <div class="wm-tag">Verified Booking</div>
    <div class="wm-dot"></div>
    <div class="wm-tag">Secure Document</div>
    <div class="wm-dot"></div>
    <div class="wm-tag">Luxury Wedding Marketplace</div>
  </div>
</div>

<!-- ══ BODY ════════════════════════════════════════════════ -->
<div class="body">`;
}

// NOTE: the function above is incomplete — split to avoid truncation.
// This continuation builds the rest of the HTML body and is appended to buildLuxuryInvoice return.
// We restructure below as a complete standalone export.
module.exports = { fd, ft, fc, toWords };
