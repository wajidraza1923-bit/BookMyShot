/**
 * buildInvoiceHTML — BookMyShot professional invoice
 * Theme: White background · Purple (#7C3AED) · Pink (#EC4899)
 * Hermes-safe: plain string concatenation, no nested template literals
 */
export function buildInvoiceHTML(booking: any, paymentRecords: any[], isPartial: boolean = false): string {
  try {
    const b = booking;
    if (!b) return '';

    const approved = (paymentRecords || []).filter((r: any) => r.status === 'approved');
    const totalPaid = approved.reduce((s: number, r: any) => s + (r.amount || 0), 0);
    const amt = b.amount || b.budget || 0;
    const remaining = Math.max(0, amt - totalPaid);
    const isComplete = remaining === 0 || b.status === 'Completed';
    const comm = b.commissionAmount || Math.round(amt * ((b.commissionPercent || 0) / 100));
    const receivable = b.creatorReceivable || (amt - comm);
    const year = new Date().getFullYear();

    const fmtD = (d: any) => {
      if (!d) return '-';
      try { return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
      catch { return '-'; }
    };
    const fmtC = (n: number) => 'Rs.' + (n || 0).toLocaleString('en-IN');

    const docNo = isPartial
      ? ('BMS-PR-' + (b._id || '').slice(-8).toUpperCase())
      : (b.invoiceNumber || 'BMS-' + (b._id || '').slice(-8).toUpperCase());
    const docType = (!isPartial && b.status === 'Completed') ? 'Tax Invoice' : 'Payment Receipt';

    const cName  = (b.creator && b.creator.user && b.creator.user.name) || b.creatorName || '-';
    const cPhone = (b.creator && b.creator.user && b.creator.user.phone) || '';
    const cEmail = (b.creator && b.creator.user && b.creator.user.email) || '';
    const cCity  = (b.creator && b.creator.city) || '';
    const cSpec  = (b.creator && b.creator.specialty) || '';
    const cCategoryGroup = (b.creator && b.creator.categoryGroup) || '';
    const cuName = b.clientName || (b.user && b.user.name) || '-';
    const cuPhone = b.clientPhone || (b.user && b.user.phone) || '';
    const cuEmail = b.clientEmail || (b.user && b.user.email) || '';
    const cuLoc  = b.eventLocation || '';
    const serviceCategory = b.eventType || (b.creator && b.creator.specialty) || 'Wedding Service';
    const pkgName = (b.packageName && b.packageName !== 'Standard') ? b.packageName : null;
    const vendorGroup = cCategoryGroup || 'Wedding Professional';
    const eventDate = b.scheduledDate || b.eventDate;
    const eventTime = b.scheduledTime || b.eventTime || '';
    const eventVenue = b.scheduledLocation || b.eventLocation || '';
    const payStatusMap: Record<string,string> = { unpaid:'Unpaid', partial:'Partially Paid', 'proof-submitted':'Proof Submitted', 'pending-verification':'Pending Verification', verified:'Approved', rejected:'Rejected', paid:'Fully Paid' };
    const paymentStatusLabel = payStatusMap[b.paymentStatus] || b.paymentStatus || '-';

    const cInfo = [cPhone ? 'Tel: ' + cPhone : '', cEmail ? cEmail : '', cCity ? cCity : '', cSpec ? cSpec : ''].filter(Boolean).join('<br>');
    const cuInfo = [cuPhone ? 'Tel: ' + cuPhone : '', cuEmail ? cuEmail : '', cuLoc ? cuLoc : ''].filter(Boolean).join('<br>');

    // Payment rows
    let payHtml = '';
    approved.forEach(function(p: any, i: number) {
      const bg = i % 2 === 0 ? '#ffffff' : '#faf5ff';
      payHtml += '<tr style="background:' + bg + '">'
        + '<td>' + fmtD(p.createdAt) + '</td>'
        + '<td style="color:#7C3AED;font-weight:700">' + fmtC(p.amount) + '</td>'
        + '<td style="text-transform:capitalize">' + (p.paymentType || '-') + '</td>'
        + '<td style="text-transform:capitalize">' + (p.addedBy || '-') + '</td>'
        + '<td><span style="background:#f0fdf4;color:#15803d;font-size:9px;font-weight:700;padding:2px 8px;border-radius:12px">Approved</span></td>'
        + '</tr>';
    });

    const payTable = approved.length > 0
      ? '<div style="height:1px;background:#e9d5ff;margin:18px 0"></div>'
        + '<div style="font-size:8px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#7C3AED;margin-bottom:10px">Payment History</div>'
        + '<table><thead><tr>'
        + '<th>Date</th><th>Amount</th><th>Type</th><th>Recorded By</th><th>Status</th>'
        + '</tr></thead><tbody>' + payHtml + '</tbody></table>'
      : '';

    const statusLabel  = isComplete ? 'Completed' : 'Partially Paid';
    const statusColor  = isComplete ? '#15803d' : '#b45309';
    const statusBg     = isComplete ? '#f0fdf4' : '#fffbeb';
    const statusBorder = isComplete ? '#86efac' : '#fde68a';
    const bannerBg     = isComplete
      ? 'linear-gradient(135deg,#7C3AED,#EC4899)'
      : 'linear-gradient(135deg,#f59e0b,#ef4444)';
    const bannerTxt    = isComplete
      ? 'Payment Completed — Booking Officially Closed'
      : 'Partial Payment — Balance Pending';

    const pendHtml = (isPartial && remaining > 0)
      ? '<div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:12px 14px;margin:12px 0;display:flex;gap:10px;align-items:flex-start">'
        + '<span style="font-size:16px">⚠️</span>'
        + '<div><strong style="color:#c2410c;font-size:11px">Pending Balance: ' + fmtC(remaining) + '</strong><br>'
        + '<span style="font-size:10px;color:#9a3412">Final invoice will be issued after full payment.</span></div>'
        + '</div>'
      : '';

    const qrUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=70x70&bgcolor=FFFFFF&color=7C3AED&data='
      + encodeURIComponent('bookmyshot.in | ' + docNo);

    // ── CSS ────────────────────────────────────────────────────────────────
    const css = ''
      + '*{margin:0;padding:0;box-sizing:border-box}'
      + 'body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:#f5f3ff;color:#1e1b4b}'
      + '.wrap{max-width:800px;margin:0 auto;padding:20px}'

      // Header
      + '.hdr{background:linear-gradient(135deg,#7C3AED 0%,#EC4899 100%);border-radius:16px 16px 0 0;padding:24px 28px;display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:14px}'
      + '.logo-row{display:flex;align-items:center;gap:12px}'
      + '.logo-box{width:48px;height:48px;border-radius:12px;background:rgba(255,255,255,.2);border:2px solid rgba(255,255,255,.35);display:flex;align-items:center;justify-content:center;font-size:17px;font-weight:900;color:#fff;flex-shrink:0}'
      + '.brand{font-size:21px;font-weight:800;color:#fff;letter-spacing:-0.3px}'
      + '.tagline{font-size:9px;color:rgba(255,255,255,.65);margin-top:2px}'
      + '.contact-row{font-size:9px;color:rgba(255,255,255,.6);margin-top:6px}'

      // Doc badge
      + '.badge{background:rgba(255,255,255,.15);border:1.5px solid rgba(255,255,255,.3);border-radius:12px;padding:12px 16px;text-align:right;min-width:175px}'
      + '.btype{font-size:8px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;color:rgba(255,255,255,.8)}'
      + '.bno{font-size:17px;font-weight:800;color:#fff;margin:3px 0}'
      + '.bdate{font-size:9px;color:rgba(255,255,255,.6);line-height:1.7}'
      + '.status-pill{display:inline-block;font-size:9px;font-weight:700;padding:3px 10px;border-radius:20px;margin-top:6px}'

      // Body
      + '.body{background:#ffffff;border:1px solid #e9d5ff;border-top:none;border-radius:0 0 16px 16px;padding:24px 28px}'
      + '.sec-title{font-size:8px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#7C3AED;margin-bottom:12px;display:flex;align-items:center;gap:6px}'
      + '.sec-title::before{content:"";width:3px;height:13px;background:linear-gradient(180deg,#7C3AED,#EC4899);border-radius:2px;flex-shrink:0}'
      + '.divider{height:1px;background:#e9d5ff;margin:18px 0}'

      // Party cards
      + '.party-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:4px}'
      + '.party-card{background:#faf5ff;border:1px solid #e9d5ff;border-radius:12px;padding:13px 15px}'
      + '.party-role{font-size:8px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#EC4899;margin-bottom:6px}'
      + '.party-name{font-size:14px;font-weight:700;color:#1e1b4b;margin-bottom:5px}'
      + '.party-info{font-size:10px;color:#6b7280;line-height:1.8}'

      // Detail chips
      + '.chips{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}'
      + '.chip{background:#faf5ff;border:1px solid #e9d5ff;border-radius:9px;padding:9px 12px}'
      + '.chip-l{font-size:8px;color:#9ca3af;text-transform:uppercase;letter-spacing:.4px;font-weight:600}'
      + '.chip-v{font-size:11px;color:#1e1b4b;font-weight:700;margin-top:3px}'

      // Summary rows
      + '.sr{display:flex;justify-content:space-between;align-items:center;padding:9px 0;border-bottom:1px solid #f3e8ff;font-size:12px}'
      + '.sr .l{color:#6b7280}.sr .v{font-weight:700;color:#1e1b4b}'
      + '.sr.g .v{color:#15803d}.sr.r .v{color:#dc2626}.sr.y .v{color:#d97706}'
      + '.sr-total{background:linear-gradient(135deg,#f5f3ff,#fce7f3);border-radius:10px;padding:13px 15px;margin-top:8px;display:flex;justify-content:space-between;align-items:center;border:1px solid #e9d5ff}'
      + '.sr-total .l{font-size:13px;font-weight:700;color:#7C3AED}'
      + '.sr-total .v{font-size:16px;font-weight:800;color:#1e1b4b}'

      // Payment table
      + 'table{width:100%;border-collapse:collapse;font-size:10px;border:1px solid #e9d5ff;border-radius:10px;overflow:hidden}'
      + 'thead tr{background:linear-gradient(135deg,#7C3AED,#EC4899)}'
      + 'th{text-align:left;padding:9px 12px;color:rgba(255,255,255,.9);font-size:8px;text-transform:uppercase;letter-spacing:1px;font-weight:700}'
      + 'td{padding:8px 12px;border-bottom:1px solid #f3e8ff;color:#374151}'
      + 'tr:last-child td{border-bottom:none}'

      // Banner
      + '.banner{border-radius:10px;padding:12px 18px;text-align:center;margin:18px 0;font-weight:700;font-size:12px;color:#fff;display:flex;align-items:center;justify-content:center;gap:6px}'

      // QR row
      + '.qr-row{display:flex;align-items:center;gap:14px;background:#faf5ff;border:1px solid #e9d5ff;border-radius:10px;padding:13px 16px;margin-top:8px}'
      + '.qr-row img{width:62px;height:62px;border-radius:8px;border:2px solid #c4b5fd;padding:2px;background:#fff;flex-shrink:0}'
      + '.qr-lbl{font-size:11px;font-weight:600;color:#1e1b4b;margin-bottom:3px}'
      + '.qr-sub{font-size:9px;color:#6b7280;line-height:1.7}'

      // Footer
      + '.ftr{background:linear-gradient(135deg,#7C3AED 0%,#EC4899 100%);border-radius:0 0 16px 16px;padding:18px 28px;margin-top:24px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px}'
      + '.ty{font-size:17px;font-style:italic;font-weight:800;color:#fff}'
      + '.copy{font-size:9px;color:rgba(255,255,255,.55);text-align:right;line-height:1.85}'

      + '@media(max-width:580px){'
      + '.party-grid{grid-template-columns:1fr}'
      + '.chips{grid-template-columns:1fr 1fr}'
      + '.hdr,.body,.ftr{padding:16px}'
      + '.wrap{padding:12px}'
      + '}';

    // ── HTML ───────────────────────────────────────────────────────────────
    return '<!DOCTYPE html><html lang="en"><head>'
      + '<meta charset="utf-8">'
      + '<meta name="viewport" content="width=device-width,initial-scale=1">'
      + '<title>' + docType + ' ' + docNo + '</title>'
      + '<style>' + css + '</style>'
      + '</head><body><div class="wrap">'

      // ── HEADER ──
      + '<div class="hdr">'
      + '<div>'
      + '<div class="logo-row">'
      + '<div class="logo-box">BM</div>'
      + '<div>'
      + '<div class="brand">BookMyShot</div>'
      + '<div class="tagline">Premium Wedding Photography &amp; Videography Marketplace</div>'
      + '</div>'
      + '</div>'
      + '<div class="contact-row">bookmyshot.in &nbsp;|&nbsp; support@bookmyshot.in &nbsp;|&nbsp; +91 8492922173</div>'
      + '</div>'
      + '<div class="badge">'
      + '<div class="btype">' + docType + '</div>'
      + '<div class="bno">' + docNo + '</div>'
      + '<div class="bdate">Generated: ' + fmtD(new Date()) + '<br>Booking date: ' + fmtD(b.createdAt) + '</div>'
      + '<span class="status-pill" style="background:' + statusBg + ';color:' + statusColor + ';border:1px solid ' + statusBorder + '">' + statusLabel + '</span>'
      + '</div>'
      + '</div>'

      // ── BODY ──
      + '<div class="body">'

      // Service category banner
      + '<div style="background:linear-gradient(135deg,#faf5ff,#fce7f3);border:1px solid #e9d5ff;border-radius:12px;padding:12px 16px;margin-bottom:20px;display:flex;align-items:center;gap:10px">'
      + '<span style="font-size:20px">✨</span>'
      + '<div>'
      + '<div style="font-size:8px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#EC4899;margin-bottom:2px">Service Category</div>'
      + '<div style="font-size:15px;font-weight:800;color:#1e1b4b">' + serviceCategory + '</div>'
      + (pkgName ? '<div style="font-size:10px;color:#7C3AED;margin-top:2px;font-weight:600">Package: ' + pkgName + '</div>' : '')
      + '<div style="font-size:9px;color:#9ca3af;margin-top:1px">' + vendorGroup + '</div>'
      + '</div>'
      + '</div>'

      // Parties
      + '<div class="sec-title">Parties</div>'
      + '<div class="party-grid">'
      + '<div class="party-card">'
      + '<div class="party-role">Vendor / Service Provider</div>'
      + '<div class="party-name">' + cName + '</div>'
      + (cSpec ? '<div style="font-size:9px;color:#7C3AED;font-weight:600;margin-bottom:4px">' + cSpec + '</div>' : '')
      + '<div class="party-info">' + (cInfo || 'No contact details') + '</div>'
      + '</div>'
      + '<div class="party-card">'
      + '<div class="party-role">Customer / Client</div>'
      + '<div class="party-name">' + cuName + '</div>'
      + '<div class="party-info">' + (cuInfo || 'No contact details') + '</div>'
      + '</div>'
      + '</div>'
      + '<div class="divider"></div>'

      // Booking Details
      + '<div class="sec-title">Booking Details</div>'
      + '<div class="chips">'
      + '<div class="chip"><div class="chip-l">Service</div><div class="chip-v">' + serviceCategory + '</div></div>'
      + (pkgName ? '<div class="chip"><div class="chip-l">Package</div><div class="chip-v">' + pkgName + '</div></div>' : '<div class="chip"><div class="chip-l">Event Type</div><div class="chip-v">' + (b.eventType || '-') + '</div></div>')
      + '<div class="chip"><div class="chip-l">Event Date</div><div class="chip-v">' + fmtD(eventDate) + '</div></div>'
      + (eventTime ? '<div class="chip"><div class="chip-l">Event Time</div><div class="chip-v">' + eventTime + '</div></div>' : '')
      + '<div class="chip"><div class="chip-l">Venue / Location</div><div class="chip-v">' + (eventVenue || '-') + '</div></div>'
      + '<div class="chip"><div class="chip-l">Booking Status</div><div class="chip-v" style="color:' + statusColor + '">' + (b.status || '-') + '</div></div>'
      + '<div class="chip"><div class="chip-l">Payment Status</div><div class="chip-v">' + paymentStatusLabel + '</div></div>'
      + '<div class="chip"><div class="chip-l">Booking ID</div><div class="chip-v" style="font-size:9px">' + docNo + '</div></div>'
      + '</div>'
      + '<div class="divider"></div>'

      // Payment Summary
      + '<div class="sec-title">Payment Summary</div>'
      + '<div class="sr"><span class="l">Booking Amount</span><span class="v">' + fmtC(amt) + '</span></div>'
      + '<div class="sr g"><span class="l">Total Paid</span><span class="v">' + fmtC(totalPaid) + '</span></div>'
      + '<div class="sr ' + (remaining > 0 ? 'y' : 'g') + '"><span class="l">Remaining Balance</span><span class="v">' + (remaining > 0 ? fmtC(remaining) + ' pending' : 'Nil') + '</span></div>'
      + '<div class="sr r"><span class="l">Platform Commission (' + (b.commissionPercent || 0) + '%)</span><span class="v">- ' + fmtC(comm) + '</span></div>'
      + '<div class="sr-total"><span class="l">Vendor Receivable (Net)</span><span class="v">' + fmtC(receivable) + '</span></div>'

      // Payment table
      + payTable

      // Status banner
      + '<div class="banner" style="background:' + bannerBg + '">' + bannerTxt + '</div>'

      // Pending notice
      + pendHtml

      // QR
      + '<div class="qr-row">'
      + '<img src="' + qrUrl + '" alt="QR" />'
      + '<div>'
      + '<div class="qr-lbl">Scan to verify this document</div>'
      + '<div class="qr-sub">Auto-generated by BookMyShot — India\'s Complete Wedding Marketplace. No physical signature required.</div>'
      + '</div>'
      + '</div>'

      + '</div>' // end .body

      // ── FOOTER ──
      + '<div class="ftr">'
      + '<div class="ty">Thank You!</div>'
      + '<div class="copy">'
      + '<strong style="color:#fff">BookMyShot</strong><br>'
      + 'India\'s Complete Wedding Marketplace<br>'
      + 'bookmyshot.in | (c) ' + year + ' BookMyShot. All rights reserved.'
      + '</div>'
      + '</div>'

      + '</div></body></html>';

  } catch (err: any) {
    console.log('[Invoice] Build error:', err.message);
    return '';
  }
}
