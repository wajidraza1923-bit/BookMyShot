/**
 * Creator Dashboard — BookMyShot (Advanced with Custom Calendar UI)
 * Includes: Private Calendar with Events, Availability Calendar, Profile Management,
 * Booking Requests, Package Management, Portfolio/Video Gallery
 */
(function() {
  'use strict';

  const user = Utils.requireAuth(["creator"]);
  if (!user) return;

  let creatorProfile = null;
  let activeChatUser = null;
  let planningSaveTimer = null;
  let privateCalendar = null;
  let availabilityCalendar = null;
  let currentEventId = null;

  // ─── INIT ──────────────────────────────────────────────────────────────────

  Utils.initSidebar();

  document.getElementById("menuDash")?.addEventListener("click", function() {
    document.getElementById("sidebar").classList.toggle("open");
  });

  document.getElementById("logoutBtn").onclick = function() {
    API.clearAuth();
    window.location.href = "/";
  };

  const titles = {
    dashboard: "Creator Dashboard",
    bookings: "Booking Management",
    "booking-requests": "Booking Requests",
    profile: "Edit Profile",
    portfolio: "Portfolio & Videos",
    packages: "Package Management",
    planning: "Planning Notebook",
    "calendar-private": "Private Calendar",
    "calendar-public": "Public Availability",
    messages: "Messages",
    earnings: "Earnings Tracker",
    settings: "Settings",
  };

  // Sidebar navigation - load panel data when clicked
  // Panel visibility is handled by Utils.initSidebar()
  document.querySelectorAll(".nav-item").forEach(function(item) {
    item.addEventListener("click", function() {
      const panel = item.dataset.panel;
      document.getElementById("panelTitle").textContent = titles[panel] || "Creator";
      loadPanel(panel);
    });
  });

  // ─── MAIN INIT ─────────────────────────────────────────────────────────────

  async function init() {
    try {
      const me = await API.get("/auth/me");
      creatorProfile = me.creator;
      if (!creatorProfile || creatorProfile.status !== "approved") {
        window.location.href = "/creator/pending.html";
        return;
      }
      updateHeaderProfile(me);
      loadPanel("dashboard");
      loadNotifications();
    } catch (e) {
      toast(e.message, "error");
    }
  }

  function updateHeaderProfile(me) {
    const avatar = (me.user && me.user.avatar) || "https://images.unsplash.com/photo-1554048612-b6a482b17f70?w=100";
    const name = (me.user && me.user.name) || "Creator";
    const headerAvatar = document.getElementById("headerAvatar");
    const headerName = document.getElementById("headerName");
    if (headerAvatar) headerAvatar.src = avatar;
    if (headerName) headerName.textContent = name;
  }

  async function loadNotifications() {
    try {
      const result = await API.get("/creator/notifications");
      const notifications = result.notifications || [];
      const unread = notifications.filter(function(n) { return !n.read; }).length;
      const badge = document.getElementById("notifCount");
      if (badge) {
        if (unread > 0) {
          badge.hidden = false;
          badge.textContent = unread;
        } else {
          badge.hidden = true;
        }
      }
    } catch(e) {
      // Silently fail - notifications are non-critical
    }
  }

  async function loadPanel(panel) {
    Utils.showLoader(true);
    try {
      switch(panel) {
        case "dashboard": await loadDashboard(); break;
        case "bookings": await loadBookings(); break;
        case "booking-requests": await loadBookingRequests(); await loadInquiries(); break;
        case "profile": await loadProfile(); break;
        case "portfolio": await loadPortfolio(); break;
        case "packages": await loadPackages(); break;
        case "planning": await loadPlanning(); break;
        case "calendar-private": await loadPrivateCalendar(); break;
        case "calendar-public": await loadPublicCalendar(); break;
        case "messages": await loadMessages(); break;
        case "earnings": await loadEarnings(); break;
        case "settings": loadSettings(); break;
      }
    } catch (e) {
      toast(e.message || "Error loading panel", "error");
    }
    Utils.showLoader(false);
  }

  // ─── DASHBOARD ──────────────────────────────────────────────────────────────

  async function loadDashboard() {
    const result = await API.get("/creator/analytics");
    const stats = result.stats || {};
    const upcomingEvents = result.upcomingEvents || [];

    document.getElementById("creatorStats").innerHTML =
      '<div class="card stat-card"><div class="value">' + (stats.pending || 0) + '</div><div class="label">Pending</div></div>' +
      '<div class="card stat-card"><div class="value">' + (stats.accepted || 0) + '</div><div class="label">Accepted</div></div>' +
      '<div class="card stat-card"><div class="value">' + (stats.upcoming || 0) + '</div><div class="label">Upcoming</div></div>' +
      '<div class="card stat-card"><div class="value">' + Utils.formatMoney(stats.earnings || 0) + '</div><div class="label">Earnings</div></div>';

    if (upcomingEvents.length > 0) {
      document.getElementById("upcomingList").innerHTML = upcomingEvents.map(function(b) {
        return '<p>' + Utils.formatDate(b.eventDate) + ' — ' + (b.clientName || 'Client') + ' (' + (b.eventType || 'Event') + ')</p>';
      }).join("");
    } else {
      document.getElementById("upcomingList").innerHTML = '<p style="color:var(--text-muted)">No upcoming events</p>';
    }
  }

  // ─── BOOKINGS ───────────────────────────────────────────────────────────────

  async function loadBookings() {
    const result = await API.get("/bookings/creator");
    const bookings = result.bookings || [];
    const tbody = document.getElementById("bookingsTable");

    if (bookings.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="color:var(--text-muted);text-align:center;padding:2rem">No bookings yet</td></tr>';
      return;
    }

    tbody.innerHTML = bookings.map(function(b) {
      var statusClass = "badge-" + (b.status || "pending").toLowerCase().replace(/\s+/g, '-');
      var actions = "";
      if (b.status === "Booking Created") {
        actions = '<button class="btn btn-sm btn-primary" onclick="window.updateBooking(\'' + b._id + '\',\'Creator Accepted\')">Accept</button> ' +
                  '<button class="btn btn-sm btn-danger" onclick="window.updateBooking(\'' + b._id + '\',\'rejected\')">Reject</button>';
      } else if (b.status === "Creator Accepted") {
        actions = '<button class="btn btn-sm btn-info" onclick="window.scheduleBooking(\'' + b._id + '\')">📅 Schedule Event</button> ' +
                  '<button class="btn btn-sm btn-success" onclick="window.updateBooking(\'' + b._id + '\',\'Completed\')">✅ Mark Complete</button>';
      } else if (b.status === "Event Scheduled") {
        actions = '<button class="btn btn-sm btn-success" onclick="window.updateBooking(\'' + b._id + '\',\'Completed\')">✅ Mark Complete</button>';
      }
      return '<tr>' +
        '<td>' + (b.clientName || 'N/A') + '<br><small>' + (b.clientEmail || '') + '</small></td>' +
        '<td>' + (b.eventType || 'N/A') + '</td>' +
        '<td>' + Utils.formatDate(b.eventDate) + '</td>' +
        '<td><span class="badge ' + statusClass + '">' + (b.status || 'pending') + '</span></td>' +
        '<td>' + actions + '</td>' +
        '</tr>';
    }).join("");
  }

  window.updateBooking = async function(id, status) {
    var amount = "0";
    if (status === "Creator Accepted") {
      amount = prompt("Enter booking amount (₹):") || "0";
    }
    try {
      await API.patch("/bookings/" + id + "/status", { status: status, amount: parseInt(amount) || 0 });
      toast("Booking " + status, "success");
      loadBookings();
    } catch(e) {
      toast(e.message, "error");
    }
  };

  window.scheduleBooking = async function(id) {
    var scheduledDate = prompt("Enter scheduled date (YYYY-MM-DD):");
    if (!scheduledDate) return;
    var scheduledTime = prompt("Enter scheduled time (HH:MM, e.g. 10:00):") || "";
    var scheduledLocation = prompt("Enter event location:") || "";
    try {
      await API.patch("/bookings/" + id + "/schedule", {
        scheduledDate: scheduledDate,
        scheduledTime: scheduledTime,
        scheduledLocation: scheduledLocation,
      });
      toast("Event scheduled successfully", "success");
      loadBookings();
    } catch(e) {
      toast(e.message, "error");
    }
  };

  // ─── BOOKING REQUESTS ───────────────────────────────────────────────────────

  async function loadBookingRequests() {
    const result = await API.get("/creator/booking-requests");
    const bookings = result.bookings || [];
    const container = document.getElementById("bookingRequestsList");

    if (bookings.length === 0) {
      container.innerHTML = '<p style="color:var(--text-muted);padding:1rem">No booking requests yet.</p>';
      return;
    }

    container.innerHTML = bookings.map(function(b) {
      var userAvatar = (b.user && b.user.avatar) || "https://images.unsplash.com/photo-1554048612-b6a482b17f70?w=100";
      var userName = (b.user && b.user.name) || b.clientName || "Client";
      var userEmail = (b.user && b.user.email) || b.clientEmail || "";
      var statusBadge = "badge-" + (b.status || "pending").toLowerCase().replace(/\s+/g, '-');
      var statusDisplay = b.status || "pending";
      var actions = "";

      // Full lifecycle: Booking Created → Creator Accepted → Payment Submitted → Payment Approved → Event Scheduled → Completed
      if (b.status === "Booking Created") {
        actions = '<button class="btn btn-sm btn-primary" onclick="window.handleBookingRequest(\'' + b._id + '\',\'Creator Accepted\')">✓ Accept</button> ' +
                  '<button class="btn btn-sm btn-danger" onclick="window.handleBookingRequest(\'' + b._id + '\',\'rejected\')">✗ Reject</button>';
      } else if (b.status === "Creator Accepted") {
        // Waiting for payment - show payment status
        var paymentStatus = b.paymentStatus || "unpaid";
        var paymentLabel = paymentStatus === "proof-submitted" ? "Payment Pending Verification" : "Awaiting Payment";
        actions = '<span style="color:var(--gold);font-size:0.8rem">⏳ ' + paymentLabel + '</span>';
        if (paymentStatus === "proof-submitted" || paymentStatus === "pending-verification") {
          actions += ' <button class="btn btn-sm btn-outline" onclick="window.openPaymentProofs()">📸 View Payment Proof</button>';
        }
      } else if (b.status === "Payment Submitted" || b.status === "Payment Approved") {
        // Payment received - can schedule event
        actions = '<button class="btn btn-sm btn-primary" onclick="window.scheduleEvent(\'' + b._id + '\')">📅 Schedule Event</button>';
      } else if (b.status === "Event Scheduled") {
        // Event is scheduled - can mark completed
        actions = '<button class="btn btn-sm btn-outline" onclick="window.markBookingCompleted(\'' + b._id + '\')">✓ Mark Completed</button>';
      } else if (b.status === "Completed") {
        actions = '<span style="color:var(--success);font-size:0.8rem">✅ Completed</span>';
      } else if (b.status === "rejected") {
        actions = '<span style="color:var(--danger);font-size:0.8rem">❌ Rejected</span>';
      }

      var amount = b.amount || b.budget || 0;
      var advancePaid = b.advancePaid || 0;
      var remaining = b.remaining || (amount - advancePaid);

      return '<div class="booking-request-card">' +
        '<div class="req-header">' +
          '<div class="req-user">' +
            '<img src="' + userAvatar + '" onerror="this.src=\'https://images.unsplash.com/photo-1554048612-b6a482b17f70?w=100\'">' +
            '<div>' +
              '<div class="req-name">' + Utils.escapeHtml(userName) + '</div>' +
              '<div class="req-email">' + Utils.escapeHtml(userEmail) + '</div>' +
            '</div>' +
          '</div>' +
          '<span class="badge ' + statusBadge + '">' + statusDisplay + '</span>' +
        '</div>' +
        '<div class="req-details">' +
          '<span>Package <strong>' + Utils.escapeHtml(b.eventType || "N/A") + '</strong></span>' +
          '<span>Event Date <strong>' + Utils.formatDate(b.eventDate) + '</strong></span>' +
          '<span>Location <strong>' + Utils.escapeHtml(b.eventLocation || "N/A") + '</strong></span>' +
          '<span>Budget <strong>' + Utils.formatMoney(amount) + '</strong></span>' +
          (advancePaid > 0 ? '<span>Advance Paid <strong style="color:var(--success)">' + Utils.formatMoney(advancePaid) + '</strong></span>' : '') +
          (remaining > 0 ? '<span>Remaining <strong style="color:var(--gold)">' + Utils.formatMoney(remaining) + '</strong></span>' : '') +
        '</div>' +
        (b.message ? '<p style="color:var(--text-muted);font-size:0.85rem;font-style:italic">"' + Utils.escapeHtml(b.message) + '"</p>' : "") +
        (b.creatorNotes ? '<p style="color:var(--text-muted);font-size:0.8rem">📝 Notes: ' + Utils.escapeHtml(b.creatorNotes) + '</p>' : "") +
        (b.scheduledDate ? '<div style="margin-top:0.5rem;padding:0.5rem;background:rgba(59,130,246,0.06);border-radius:8px;font-size:0.8rem">📅 Scheduled: ' + Utils.formatDate(b.scheduledDate) + ' ' + (b.scheduledTime || '') + ' at ' + Utils.escapeHtml(b.scheduledLocation || '') + '</div>' : '') +
        '<div class="req-actions">' + actions + '</div>' +
        '</div>';
    }).join("");
  }

  window.handleBookingRequest = async function(id, status) {
    var amount = 0;
    if (status === "Creator Accepted") {
      amount = parseInt(prompt("Enter booking amount (₹):") || "0") || 0;
    }
    try {
      await API.patch("/creator/booking-requests/" + id, { status: status, amount: amount });
      toast("Booking " + status, "success");
      loadBookingRequests();
    } catch (e) {
      toast(e.message, "error");
    }
  };

  // ─── SCHEDULE EVENT ─────────────────────────────────────────────────────────

  window.scheduleEvent = async function(bookingId) {
    // Create a modal for scheduling
    var modal = document.createElement("div");
    modal.className = "modal-overlay";
    modal.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:9999;display:flex;align-items:center;justify-content:center";
    modal.innerHTML = '<div class="modal-content" style="background:#141210;border:1px solid rgba(201,169,98,0.15);border-radius:16px;padding:2rem;max-width:500px;width:90%;max-height:90vh;overflow-y:auto">' +
      '<h3 style="font-family:\'Playfair Display\',serif;color:var(--gold-light);margin:0 0 1.5rem">📅 Schedule Event</h3>' +
      '<div class="form-group"><label>Event Date *</label><input type="date" id="scheduleDate" class="form-input" style="width:100%;padding:0.6rem;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#f6eee7"></div>' +
      '<div class="form-group"><label>Event Time</label><input type="time" id="scheduleTime" class="form-input" style="width:100%;padding:0.6rem;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#f6eee7"></div>' +
      '<div class="form-group"><label>Location</label><input type="text" id="scheduleLocation" class="form-input" placeholder="Event location" style="width:100%;padding:0.6rem;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#f6eee7"></div>' +
      '<div class="form-group"><label>Notes for Client</label><textarea id="scheduleNotes" class="form-input" rows="3" placeholder="Any instructions for the client..." style="width:100%;padding:0.6rem;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#f6eee7;resize:vertical"></textarea></div>' +
      '<div style="display:flex;gap:0.75rem;justify-content:flex-end;margin-top:1.5rem">' +
      '<button class="btn btn-sm btn-outline" onclick="this.closest(\'.modal-overlay\').remove()">Cancel</button> ' +
      '<button class="btn btn-sm btn-primary" id="confirmScheduleBtn">📅 Schedule Event</button></div></div>';

    document.body.appendChild(modal);

    document.getElementById("confirmScheduleBtn").addEventListener("click", async function() {
      var scheduledDate = document.getElementById("scheduleDate").value;
      var scheduledTime = document.getElementById("scheduleTime").value;
      var scheduledLocation = document.getElementById("scheduleLocation").value;
      var creatorNotes = document.getElementById("scheduleNotes").value;

      if (!scheduledDate) { toast("Please select an event date", "error"); return; }

      try {
        await API.patch("/bookings/" + bookingId + "/schedule", {
          scheduledDate: scheduledDate,
          scheduledTime: scheduledTime,
          scheduledLocation: scheduledLocation,
          creatorNotes: creatorNotes
        });
        toast("Event scheduled successfully!", "success");
        modal.remove();
        loadBookingRequests();
      } catch (e) {
        toast(e.message, "error");
      }
    });
  };

  window.openPaymentProofs = function() {
    // Navigate to payment proofs panel
    var paymentPanel = document.querySelector('[data-panel="payment-proofs"]');
    if (paymentPanel) paymentPanel.click();
    else toast("Go to Payment Proofs section to verify", "info");
  };

  // ─── PAYMENT PROOF VERIFICATION ──────────────────────────────────────────────

  async function loadPaymentProofs() {
    try {
      var container = document.getElementById("paymentProofsContainer");
      if (!container) return;
      var result = await API.get("/creator/payment-proofs");
      var proofs = result.proofs || [];
      if (!proofs.length) {
        container.innerHTML = '<div class="empty-state"><div class="icon">💳</div><h3>No payment proofs</h3><p>Payment proofs from clients will appear here</p></div>';
        return;
      }
      container.innerHTML = proofs.map(function(p) {
        var statusClass = "badge-" + (p.status === "verified" ? "accepted" : p.status === "rejected" ? "rejected" : "pending");
        var actions = "";
        if (p.status === "pending") {
          actions = '<button class="btn btn-sm btn-primary" onclick="window.verifyPayment(\'' + p._id + '\',\'verified\')">✓ Verify</button> ' +
                    '<button class="btn btn-sm btn-danger" onclick="window.verifyPayment(\'' + p._id + '\',\'rejected\')">✗ Reject</button>';
        }
        return '<div class="booking-request-card">' +
          '<div class="req-header">' +
            '<div><div class="req-name">₹' + (p.amount || 0).toLocaleString() + ' — ' + (p.booking?.eventType || "Booking") + '</div>' +
            '<div class="req-email">' + (p.user?.name || "Client") + ' · ' + (p.transactionId || "No TXN ID") + '</div></div>' +
            '<span class="badge ' + statusClass + '">' + p.status + '</span>' +
          '</div>' +
          (p.screenshot ? '<div style="margin:0.5rem 0"><a href="' + p.screenshot + '" target="_blank" style="color:var(--gold);font-size:0.85rem">📸 View Screenshot</a></div>' : '') +
          (p.note ? '<p style="color:var(--text-muted);font-size:0.8rem;font-style:italic">"' + Utils.escapeHtml(p.note) + '"</p>' : '') +
          '<div class="req-actions">' + actions + '</div>' +
          '</div>';
      }).join("");
    } catch (e) {
      toast("Failed to load payment proofs", "error");
    }
  }

  window.verifyPayment = async function(id, status) {
    try {
      await API.patch("/creator/payment-proofs/" + id + "/verify", { status: status });
      toast("Payment " + (status === "verified" ? "verified" : "rejected"), "success");
      loadPaymentProofs();
      loadBookingRequests();
    } catch (e) {
      toast(e.message, "error");
    }
  };

  // ─── INQUIRY MANAGEMENT ──────────────────────────────────────────────────────

  async function loadInquiries() {
    try {
      var container = document.getElementById("inquiriesContent");
      if (!container) return;
      var result = await API.get("/creator/leads");
      var inquiries = result.inquiries || [];
      if (!inquiries.length) {
        container.innerHTML = '<div class="empty-state"><div class="icon">📩</div><h3>No inquiries yet</h3><p>When users send inquiries, they will appear here</p></div>';
        return;
      }
      container.innerHTML = inquiries.map(function(i) {
        var statusClass = "badge-" + (i.status === "accepted" ? "accepted" : i.status === "rejected" ? "rejected" : i.status === "replied" ? "pending" : "pending");
        var actions = "";
        if (i.status === "pending") {
          actions = '<button class="btn btn-sm btn-primary" onclick="window.replyInquiry(\'' + i._id + '\',\'replied\')">📩 Reply</button> ' +
                    '<button class="btn btn-sm btn-success" onclick="window.replyInquiry(\'' + i._id + '\',\'accepted\')">✓ Accept</button> ' +
                    '<button class="btn btn-sm btn-danger" onclick="window.replyInquiry(\'' + i._id + '\',\'rejected\')">✗ Reject</button>';
        }
        return '<div class="booking-request-card">' +
          '<div class="req-header">' +
            '<div class="req-user">' +
              '<img src="' + ((i.user && i.user.avatar) || "https://images.unsplash.com/photo-1554048612-b6a482b17f70?w=100") + '" onerror="this.src=\'https://images.unsplash.com/photo-1554048612-b6a482b17f70?w=100\'">' +
              '<div>' +
                '<div class="req-name">' + Utils.escapeHtml(i.name || (i.user && i.user.name) || "Client") + '</div>' +
                '<div class="req-email">' + Utils.escapeHtml(i.eventType || "Event") + ' · ' + Utils.formatDate(i.eventDate) + '</div>' +
              '</div>' +
            '</div>' +
            '<span class="badge ' + statusClass + '">' + (i.status || "pending") + '</span>' +
          '</div>' +
          '<div class="req-details">' +
            (i.budget ? '<span>Budget <strong>₹' + (i.budget || 0).toLocaleString() + '</strong></span>' : '') +
            (i.phone ? '<span>Phone <strong>' + Utils.escapeHtml(i.phone) + '</strong></span>' : '') +
            (i.city ? '<span>City <strong>' + Utils.escapeHtml(i.city) + '</strong></span>' : '') +
          '</div>' +
          (i.message ? '<p style="color:var(--text-muted);font-size:0.85rem;font-style:italic">"' + Utils.escapeHtml(i.message) + '"</p>' : '') +
          '<div class="req-actions">' + actions + '</div>' +
          '</div>';
      }).join("");
    } catch (e) {
      toast("Failed to load inquiries", "error");
    }
  }

  window.replyInquiry = async function(id, status) {
    try {
      await API.patch("/creator/inquiries/" + id + "/reply", { status: status });
      toast("Inquiry " + status, "success");
      loadInquiries();
    } catch (e) {
      toast(e.message, "error");
    }
  };

  // ─── MARK BOOKING COMPLETED ──────────────────────────────────────────────────

  window.markBookingCompleted = async function(id) {
    if (!confirm("Mark this booking as completed?")) return;
    try {
      await API.patch("/creator/bookings/" + id + "/complete");
      toast("Booking marked as completed!", "success");
      loadBookingRequests();
    } catch (e) {
      toast(e.message, "error");
    }
  };

  // ─── PROFILE ────────────────────────────────────────────────────────────────

  async function loadProfile() {
    const me = await API.get("/auth/me");
    const c = me.creator;
    const u = me.user;

    // Update profile avatar display
    var avatarDisplay = document.getElementById("profileAvatarDisplay");
    if (avatarDisplay) {
      avatarDisplay.src = (u && u.avatar) || "https://images.unsplash.com/photo-1554048612-b6a482b17f70?w=200";
    }

    document.getElementById("profName").value = (u && u.name) || "";
    document.getElementById("profEmail").value = (u && u.email) || "";
    document.getElementById("profPhone").value = (u && u.phone) || "";
    document.getElementById("profSpecialty").value = (c && c.specialty) || "";
    document.getElementById("profBio").value = (c && c.bio) || "";
    document.getElementById("profExperience").value = (c && c.experience) || "";
    document.getElementById("profCity").value = (c && c.city) || "";
    document.getElementById("profLocation").value = (c && c.location) || "";
    document.getElementById("profInstagram").value = (c && c.social && c.social.instagram) || "";
  }

  // Profile form submit
  var profileForm = document.getElementById("profileForm");
  if (profileForm) {
    profileForm.addEventListener("submit", async function(e) {
      e.preventDefault();
      try {
        await API.put("/creators/profile", {
          name: document.getElementById("profName").value,
          phone: document.getElementById("profPhone").value,
          specialty: document.getElementById("profSpecialty").value,
          bio: document.getElementById("profBio").value,
          experience: document.getElementById("profExperience").value,
          city: document.getElementById("profCity").value,
          location: document.getElementById("profLocation").value,
          social: { instagram: document.getElementById("profInstagram").value },
        });
        toast("Profile saved", "success");
        // Refresh header
        const me = await API.get("/auth/me");
        updateHeaderProfile(me);
      } catch(e) {
        toast(e.message, "error");
      }
    });
  }

  // Avatar upload with preview
  var avatarUpload = document.getElementById("avatarUpload");
  if (avatarUpload) {
    avatarUpload.addEventListener("change", async function(e) {
      var file = e.target.files[0];
      if (!file) return;

      // Show preview immediately
      var reader = new FileReader();
      reader.onload = function(ev) {
        var avatarDisplay = document.getElementById("profileAvatarDisplay");
        if (avatarDisplay) avatarDisplay.src = ev.target.result;
      };
      reader.readAsDataURL(file);

      var fd = new FormData();
      fd.append("avatar", file);
      try {
        await API.upload("/creators/upload/avatar", fd);
        toast("Profile photo updated", "success");
        // Update header
        const me = await API.get("/auth/me");
        updateHeaderProfile(me);
      } catch (err) {
        toast(err.message, "error");
      }
    });
  }

  // ─── PORTFOLIO & VIDEOS ────────────────────────────────────────────────────

  async function loadPortfolio() {
    const me = await API.get("/auth/me");
    const portfolio = (me.creator && me.creator.portfolio) || [];
    const videos = (me.creator && me.creator.videos) || [];

    // Portfolio images gallery
    var portfolioGrid = document.getElementById("portfolioGrid");
    if (portfolio.length > 0) {
      portfolioGrid.innerHTML = portfolio.map(function(p) {
        return '<div class="gallery-item"><img src="' + p + '" loading="lazy"><div class="gallery-overlay"><span>🔍</span></div></div>';
      }).join("");
    } else {
      portfolioGrid.innerHTML = '<p style="color:var(--text-muted);grid-column:1/-1;padding:1rem">No portfolio images yet. Upload your best work above.</p>';
    }

    // Videos gallery
    var videoList = document.getElementById("videoList");
    if (videos.length > 0) {
      videoList.innerHTML = videos.map(function(v) {
        return '<div class="gallery-item video-card"><video src="' + v + '" preload="metadata" muted></video><div class="play-overlay"><span>▶</span></div></div>';
      }).join("");
    } else {
      videoList.innerHTML = '<p style="color:var(--text-muted);grid-column:1/-1;padding:1rem">No videos yet. Upload cinematic reels above.</p>';
    }
  }

  // Portfolio upload
  var portfolioUpload = document.getElementById("portfolioUpload");
  if (portfolioUpload) {
    portfolioUpload.addEventListener("change", async function(e) {
      var fd = new FormData();
      var files = e.target.files;
      for (var i = 0; i < files.length; i++) {
        fd.append("photos", files[i]);
      }
      try {
        await API.upload("/creators/upload/portfolio", fd);
        toast("Photos uploaded", "success");
        loadPortfolio();
      } catch (err) {
        toast(err.message, "error");
      }
    });
  }

  // Video upload
  var videoUpload = document.getElementById("videoUpload");
  if (videoUpload) {
    videoUpload.addEventListener("change", async function(e) {
      var fd = new FormData();
      var files = e.target.files;
      for (var i = 0; i < files.length; i++) {
        fd.append("videos", files[i]);
      }
      try {
        await API.upload("/creators/upload/videos", fd);
        toast("Videos uploaded", "success");
        loadPortfolio();
      } catch (err) {
        toast(err.message, "error");
      }
    });
  }

  // ─── PACKAGE MANAGEMENT ─────────────────────────────────────────────────────

  async function loadPackages() {
    const me = await API.get("/auth/me");
    const packages = (me.creator && me.creator.packages) || [];
    const container = document.getElementById("packagesList");

    if (packages.length === 0) {
      container.innerHTML = '<p style="color:var(--text-muted);grid-column:1/-1">No packages yet. Add your first package above.</p>';
      return;
    }

    container.innerHTML = packages.map(function(pkg, idx) {
      var featuresHtml = "";
      if (pkg.features && pkg.features.length > 0) {
        featuresHtml = '<ul class="features">' + pkg.features.map(function(f) {
          return '<li>' + Utils.escapeHtml(f) + '</li>';
        }).join("") + '</ul>';
      }
      return '<div class="package-card">' +
        '<h3>' + Utils.escapeHtml(pkg.name || "Package") + '</h3>' +
        '<div class="price">₹' + ((pkg.price || 0).toLocaleString("en-IN")) + '</div>' +
        (pkg.description ? '<p style="color:var(--text-muted);font-size:0.8rem">' + Utils.escapeHtml(pkg.description) + '</p>' : "") +
        featuresHtml +
        '<div class="pkg-actions">' +
          '<button class="btn btn-sm btn-outline" onclick="window.editPackage(' + idx + ')">✏️ Edit</button> ' +
          '<button class="btn btn-sm btn-danger" onclick="window.deletePackage(' + idx + ')">🗑 Remove</button>' +
        '</div>' +
        '</div>';
    }).join("");
  }

  // Add package button
  var addPackageBtn = document.getElementById("addPackageBtn");
  if (addPackageBtn) {
    addPackageBtn.addEventListener("click", async function() {
      var name = document.getElementById("pkgName").value.trim();
      var price = parseInt(document.getElementById("pkgPrice").value) || 0;
      var description = document.getElementById("pkgDesc").value.trim();
      var featuresRaw = document.getElementById("pkgFeatures").value.trim();

      if (!name) {
        toast("Package name is required", "error");
        return;
      }
      if (price <= 0) {
        toast("Please enter a valid price", "error");
        return;
      }

      var features = featuresRaw ? featuresRaw.split("\n").map(function(f) { return f.trim(); }).filter(Boolean) : [];

      try {
        const me = await API.get("/auth/me");
        var currentPackages = (me.creator && me.creator.packages) || [];
        currentPackages.push({ name: name, price: price, description: description, features: features });

        await API.put("/creator/packages", { packages: currentPackages });
        toast("Package added", "success");

        // Clear form
        document.getElementById("pkgName").value = "";
        document.getElementById("pkgPrice").value = "";
        document.getElementById("pkgDesc").value = "";
        document.getElementById("pkgFeatures").value = "";

        loadPackages();
      } catch (err) {
        toast(err.message || "Failed to add package", "error");
      }
    });
  }

  window.deletePackage = async function(idx) {
    if (!confirm("Remove this package?")) return;
    try {
      const me = await API.get("/auth/me");
      var packages = (me.creator && me.creator.packages) || [];
      packages.splice(idx, 1);
      await API.put("/creator/packages", { packages: packages });
      toast("Package removed", "success");
      loadPackages();
    } catch (err) {
      toast(err.message || "Failed to remove package", "error");
    }
  };

  window.editPackage = async function(idx) {
    try {
      const me = await API.get("/auth/me");
      var packages = (me.creator && me.creator.packages) || [];
      var pkg = packages[idx];
      if (!pkg) {
        toast("Package not found", "error");
        return;
      }

      // Fill form with package data
      document.getElementById("pkgName").value = pkg.name || "";
      document.getElementById("pkgPrice").value = pkg.price || 0;
      document.getElementById("pkgDesc").value = pkg.description || "";
      document.getElementById("pkgFeatures").value = (pkg.features || []).join("\n");

      // Remove the old package and re-save
      packages.splice(idx, 1);
      await API.put("/creator/packages", { packages: packages });

      toast("Edit the package details and click Add Package to save", "info");
      loadPackages();
    } catch (err) {
      toast(err.message || "Failed to edit package", "error");
    }
  };

  // ─── PLANNING ───────────────────────────────────────────────────────────────

  var planningFields = [
    { key: "eventNotes", label: "Event Planning Notes" },
    { key: "teamPlanning", label: "Team Planning" },
    { key: "shootTimeline", label: "Shoot Timeline" },
    { key: "clientRequirements", label: "Client Requirements" },
    { key: "travelPlanning", label: "Travel Planning" },
    { key: "customNotes", label: "Custom Notes" },
  ];

  var checklistFields = [
    { key: "cameraChecklist", label: "Camera Checklist" },
    { key: "lensChecklist", label: "Lens Checklist" },
    { key: "lightingChecklist", label: "Lighting Checklist" },
  ];

  async function loadPlanning() {
    const result = await API.get("/creator/planning");
    const planning = result.planning || {};

    var html = planningFields.map(function(f) {
      return '<div class="planning-section card">' +
        '<h3>' + f.label + '</h3>' +
        '<textarea class="form-control planning-field" data-key="' + f.key + '" rows="4">' + (planning[f.key] || "") + '</textarea>' +
        '</div>';
    }).join("");

    html += checklistFields.map(function(f) {
      var items = planning[f.key] || [];
      var listHtml = '<div id="list-' + f.key + '">';
      for (var i = 0; i < items.length; i++) {
        listHtml += checklistRow(f.key, i, items[i]);
      }
      listHtml += '</div>';
      return '<div class="planning-section card">' +
        '<h3>' + f.label + '</h3>' +
        listHtml +
        '<button type="button" class="btn btn-outline btn-sm" onclick="window.addChecklistItem(\'' + f.key + '\')">+ Add Item</button>' +
        '</div>';
    }).join("");

    document.getElementById("planningSections").innerHTML = html;

    // Add input listeners for auto-save
    document.querySelectorAll(".planning-field").forEach(function(el) {
      el.addEventListener("input", schedulePlanningSave);
    });

    // Clear existing timer and set new one
    if (planningSaveTimer) clearInterval(planningSaveTimer);
    planningSaveTimer = setInterval(savePlanning, 30000);
  }

  function checklistRow(key, i, item) {
    item = item || { text: "", done: false };
    return '<div class="checklist-item">' +
      '<input type="checkbox" ' + (item.done ? "checked" : "") + ' onchange="window.savePlanning()">' +
      '<input type="text" class="form-control" value="' + Utils.escapeHtml(item.text || "") + '" data-list="' + key + '" data-idx="' + i + '">' +
      '</div>';
  }

  window.addChecklistItem = function(key) {
    var div = document.getElementById("list-" + key);
    if (!div) return;
    var i = div.children.length;
    div.insertAdjacentHTML("beforeend", checklistRow(key, i, { text: "", done: false }));
  };

  function schedulePlanningSave() {
    if (window._planTimeout) clearTimeout(window._planTimeout);
    window._planTimeout = setTimeout(savePlanning, 2000);
  }

  window.savePlanning = async function() {
    var data = {};
    document.querySelectorAll(".planning-field").forEach(function(el) {
      data[el.dataset.key] = el.value;
    });
    checklistFields.forEach(function(f) {
      var items = [];
      var inputs = document.querySelectorAll('[data-list="' + f.key + '"]');
      inputs.forEach(function(input) {
        var row = input.closest(".checklist-item");
        items.push({
          text: input.value,
          done: row ? row.querySelector("input[type=checkbox]").checked : false
        });
      });
      data[f.key] = items;
    });
    try {
      await API.put("/creator/planning", data);
    } catch(e) {
      // Silent auto-save failure
    }
  };

  // ─── PRIVATE CALENDAR (Custom UI) ───────────────────────────────────────────

  async function loadPrivateCalendar() {
    // Use the custom calendar UI from calendar-ui.js
    if (typeof window.renderPrivateCalendar === "function") {
      await window.renderPrivateCalendar();
    } else {
      // Fallback: show placeholder
      var calEl = document.getElementById("privateCalendar");
      if (calEl) {
        calEl.innerHTML = '<p style="color:var(--text-muted)">Calendar loading...</p>';
      }
    }
  }

  // ─── PRIVATE EVENT MODAL ────────────────────────────────────────────────────

  function openPrivateEventModal(event, dateStr) {
    // Use the custom modal from calendar-ui.js
    if (typeof window.openPrivateEventModal === "function") {
      window.openPrivateEventModal(event, dateStr);
    }
  }

  // Category selection (delegated)
  document.addEventListener("click", function(e) {
    var option = e.target.closest(".category-option");
    if (option) {
      document.querySelectorAll(".category-option").forEach(function(el) {
        el.classList.remove("active");
      });
      option.classList.add("active");
      document.getElementById("evCategory").value = option.dataset.category;
    }
  });

  // Close modal
  var eventModalClose = document.getElementById("eventModalClose");
  if (eventModalClose) {
    eventModalClose.addEventListener("click", function() {
      document.getElementById("eventModal").classList.remove("active");
      currentEventId = null;
    });
  }

  // Click outside to close
  var eventModal = document.getElementById("eventModal");
  if (eventModal) {
    eventModal.addEventListener("click", function(e) {
      if (e.target === e.currentTarget) {
        e.currentTarget.classList.remove("active");
        currentEventId = null;
      }
    });
  }

  // Save/Update event
  var eventForm = document.getElementById("eventForm");
  if (eventForm) {
    eventForm.addEventListener("submit", async function(e) {
      e.preventDefault();

      var eventId = document.getElementById("eventId").value;
      var isEdit = !!eventId;

      var eventDate = document.getElementById("evDate").value || document.getElementById("eventDateHidden").value;
      if (!eventDate) {
        toast("Please select an event date", "error");
        return;
      }

      var title = document.getElementById("evTitle").value.trim();
      if (!title) {
        toast("Please enter an event title", "error");
        return;
      }

      var category = document.getElementById("evCategory").value || "Shoot";
      var amount = parseInt(document.getElementById("evAmount").value) || 0;
      var time = document.getElementById("evTime").value;
      var notes = document.getElementById("evNotes").value.trim();

      var eventData = {
        type: "event",
        title: title,
        date: eventDate,
        eventDate: eventDate,
        time: time,
        category: category,
        bookingAmount: amount,
        amount: amount,
        notes: notes,
      };

      try {
        if (isEdit) {
          // Try server update first
          try {
            await API.put("/creator/calendar/" + eventId, eventData);
          } catch (e) {
            // Server failed, update locally
          }
          // Update local storage
          var localEvents = getLocalCalendarEvents();
          var idx = localEvents.findIndex(function(e) { return e._id === eventId || e.id === eventId; });
          if (idx !== -1) {
            localEvents[idx] = Object.assign(localEvents[idx], eventData);
            localEvents[idx]._isLocal = true;
            saveLocalCalendarEvents(localEvents);
          }
          toast("Event updated", "success");
        } else {
          // Create new event
          var newEvent = Object.assign({}, eventData, {
            _id: generateLocalId(),
            _isLocal: true,
            createdAt: new Date().toISOString(),
          });

          // Try server save
          try {
            var result = await API.post("/creator/calendar", eventData);
            if (result && result.event && result.event._id) {
              newEvent._id = result.event._id;
              newEvent._isLocal = false;
            }
          } catch (e) {
            // Server failed, keep local only
          }

          // Save to local storage
          var localEvents = getLocalCalendarEvents();
          localEvents.push(newEvent);
          saveLocalCalendarEvents(localEvents);
          toast("Event created", "success");
        }

        // Close modal and refresh
        document.getElementById("eventModal").classList.remove("active");
        currentEventId = null;
        loadPrivateCalendar();
      } catch (err) {
        toast(err.message || "Error saving event", "error");
      }
    });
  }

  // Delete event
  var eventDeleteBtn = document.getElementById("eventDeleteBtn");
  if (eventDeleteBtn) {
    eventDeleteBtn.addEventListener("click", async function() {
      var eventId = document.getElementById("eventId").value || window._currentEventId;
      if (!eventId) return;
      if (!confirm("Delete this event?")) return;

      try {
        // Try server delete
        try {
          await API.delete("/creator/calendar/" + eventId);
        } catch (e) {
          // Server failed, delete locally
        }
        // Remove from local storage
        var localEvents = getLocalCalendarEvents();
        localEvents = localEvents.filter(function(e) { return e._id !== eventId && e.id !== eventId; });
        saveLocalCalendarEvents(localEvents);
        toast("Event deleted", "success");
        document.getElementById("eventModal").classList.remove("active");
        currentEventId = null;
        window._currentEventId = null;
        loadPrivateCalendar();
      } catch (err) {
        toast(err.message || "Error deleting event", "error");
      }
    });
  }

  // ─── LOCAL STORAGE HELPERS ──────────────────────────────────────────────────

  var CALENDAR_STORAGE_KEY = "bookmyshot_private_calendar";

  function getLocalCalendarEvents() {
    try {
      var data = localStorage.getItem(CALENDAR_STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  function saveLocalCalendarEvents(events) {
    try {
      localStorage.setItem(CALENDAR_STORAGE_KEY, JSON.stringify(events));
    } catch (e) {
      // silent
    }
  }

  function generateLocalId() {
    return "local_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
  }

  // ─── PUBLIC AVAILABILITY CALENDAR ────────────────────────────────────────────

  async function loadPublicCalendar() {
    const result = await API.get("/creator/calendar/availability");
    const events = result.events || [];

    // Destroy existing calendar if any
    if (availabilityCalendar) {
      availabilityCalendar.destroy();
      availabilityCalendar = null;
    }

    var calEl = document.getElementById("availabilityCalendar");
    calEl.innerHTML = "";

    var fcEvents = events.map(function(e) {
      return {
        id: e._id,
        title: e.type === "booking" ? "📅 Booked" : "🚫 Unavailable",
        start: e.date,
        allDay: true,
        className: "event-unavailable",
        extendedProps: { type: e.type, notes: e.notes || "" },
      };
    });

    availabilityCalendar = new FullCalendar.Calendar(calEl, {
      initialView: "dayGridMonth",
      headerToolbar: {
        left: "prev,next today",
        center: "title",
        right: "dayGridMonth,listMonth",
      },
      height: "auto",
      events: fcEvents,
      selectable: true,
      selectMirror: true,
      dayMaxEvents: 3,
      eventClick: function(info) {
        if (confirm('Remove blocked date "' + info.event.title + '"?')) {
          deleteCalendarEvent(info.event.id);
        }
      },
      dateClick: function(info) {
        document.getElementById("unavailDate").value = info.dateStr;
      },
    });

    availabilityCalendar.render();

    // Update the blocked dates list
    var availabilityList = document.getElementById("availabilityList");
    if (events.length > 0) {
      availabilityList.innerHTML = events.map(function(e) {
        return '<div style="padding:0.5rem;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center">' +
          '<span style="color:var(--danger)">' + Utils.formatDate(e.date) + ' — ' + (e.type === "booking" ? "📅 Booked" : "🚫 " + (e.title || "Unavailable")) + '</span>' +
          '<button class="btn btn-sm btn-outline" onclick="window.deleteCalendarEvent(\'' + e._id + '\')">Remove</button>' +
          '</div>';
      }).join("");
    } else {
      availabilityList.innerHTML = "<p style='color:var(--text-muted)'>No blocked dates. Click a date above to mark it unavailable.</p>";
    }

    // Wire up the mark unavailable button
    var markBtn = document.getElementById("markUnavailableBtn");
    if (markBtn) {
      markBtn.onclick = async function() {
        var date = document.getElementById("unavailDate").value;
        var reason = document.getElementById("unavailReason").value.trim() || "Unavailable";
        if (!date) {
          toast("Please select a date", "error");
          return;
        }
        try {
          await API.post("/creator/calendar", { type: "unavailable", title: reason, date: date });
          toast("Date marked unavailable", "success");
          document.getElementById("unavailDate").value = "";
          document.getElementById("unavailReason").value = "";
          loadPublicCalendar();
        } catch (e) {
          toast(e.message, "error");
        }
      };
    }
  }

  // ─── SHARED CALENDAR HELPERS ────────────────────────────────────────────────

  window.deleteCalendarEvent = async function(id) {
    try {
      await API.delete("/creator/calendar/" + id);
      toast("Event removed", "success");
      loadPrivateCalendar();
      loadPublicCalendar();
    } catch (e) {
      toast(e.message, "error");
    }
  };

  // ─── MESSAGES ───────────────────────────────────────────────────────────────

  async function loadMessages() {
    const result = await API.get("/messages");
    const conversations = result.conversations || [];
    var chatList = document.getElementById("chatList");

    if (conversations.length > 0) {
      chatList.innerHTML = conversations.map(function(c) {
        var userName = (c.user && c.user.name) || "User";
        var userId = (c.user && c.user._id) || "";
        var lastMsg = (c.lastMessage && c.lastMessage.content) || "";
        return '<div style="padding:0.75rem;cursor:pointer;border-bottom:1px solid var(--border)" onclick="window.openChat(\'' + userId + '\',\'' + Utils.escapeHtml(userName) + '\')">' +
          '<strong>' + Utils.escapeHtml(userName) + '</strong><br><small>' + Utils.escapeHtml(lastMsg.slice(0, 40)) + '...</small></div>';
      }).join("");
    } else {
      chatList.innerHTML = "<p style='padding:1rem;color:var(--text-muted)'>No messages</p>";
    }
  }

  window.openChat = async function(userId, name) {
    activeChatUser = userId;
    try {
      const result = await API.get("/messages/" + userId);
      var messages = result.messages || [];
      var chatBody = document.getElementById("chatBody");
      if (messages.length > 0) {
        chatBody.innerHTML = messages.map(function(m) {
          var senderId = (m.sender && (m.sender._id || m.sender)) || "";
          var sent = String(senderId) === String(user.id);
          return '<div class="msg ' + (sent ? "sent" : "") + '"><div class="msg-bubble">' + Utils.escapeHtml(m.content) + '</div></div>';
        }).join("");
      } else {
        chatBody.innerHTML = "<p style='padding:1rem;color:var(--text-muted)'>Chat with " + Utils.escapeHtml(name) + "</p>";
      }
    } catch(e) {
      toast(e.message, "error");
    }
  };

  // Send message
  var sendMsg = document.getElementById("sendMsg");
  if (sendMsg) {
    sendMsg.addEventListener("click", async function() {
      var content = document.getElementById("chatInput").value.trim();
      if (!content || !activeChatUser) return;
      try {
        await API.post("/messages", { receiverId: activeChatUser, content: content });
        document.getElementById("chatInput").value = "";
        window.openChat(activeChatUser, "");
      } catch(e) {
        toast(e.message, "error");
      }
    });
  }

  // Enter key to send message
  var chatInput = document.getElementById("chatInput");
  if (chatInput) {
    chatInput.addEventListener("keypress", function(e) {
      if (e.key === "Enter") {
        document.getElementById("sendMsg").click();
      }
    });
  }

  // ─── EARNINGS ────────────────────────────────────────────────────────────────

  async function loadEarnings() {
    const result = await API.get("/creator/earnings");
    const earnings = result.earnings || { total: 0, pending: 0, completed: 0 };
    var totalEl = document.getElementById("earningsTotal");
    if (totalEl) {
      totalEl.textContent = Utils.formatMoney(earnings.total || 0);
    }
  }

  // ─── SETTINGS ────────────────────────────────────────────────────────────────

  function loadSettings() {
    document.getElementById("settingsContent").innerHTML =
      '<div class="card"><h3>Account Settings</h3>' +
      '<p style="color:var(--text-muted)">Email: ' + Utils.escapeHtml(user.email) + '</p>' +
      '<p style="color:var(--text-muted)">Role: ' + Utils.escapeHtml(user.role) + '</p>' +
      '<p style="color:var(--text-muted)">Account management coming soon.</p></div>';
  }

  // ─── START ──────────────────────────────────────────────────────────────────

  init();
})();