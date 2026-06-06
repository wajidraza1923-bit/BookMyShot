/**
 * Admin Dashboard — BookMyShot
 */
const user = Utils.requireAuth(["admin"]);
if (!user) return;

Utils.initSidebar();
document.getElementById("menuDash")?.addEventListener("click", () => document.getElementById("sidebar").classList.toggle("open"));
document.getElementById("logoutBtn").onclick = () => { API.clearAuth(); location.href = "/login.html"; };

const titles = {
  overview: "Admin Overview",
  creators: "Manage Creators",
  bookings: "All Bookings",
  users: "Manage Users",
  portfolios: "Creator Portfolios",
  homepage: "Homepage CMS",
  contacts: "Contact Forms",
  notifications: "Notifications",
};

document.querySelectorAll(".nav-item").forEach((item) => {
  item.addEventListener("click", () => {
    document.getElementById("panelTitle").textContent = titles[item.dataset.panel] || "Admin";
    loadPanel(item.dataset.panel);
  });
});

async function loadPanel(panel) {
  Utils.showLoader(true);
  try {
    if (panel === "overview") await loadOverview();
    if (panel === "creators") await loadCreators();
    if (panel === "bookings") await loadBookings();
    if (panel === "users") await loadUsers();
    if (panel === "portfolios") await loadPortfolios();
    if (panel === "homepage") await loadHomepage();
    if (panel === "contacts") await loadContacts();
    if (panel === "notifications") await loadNotifications();
    if (panel === "payments") await loadPayments();
    if (panel === "inquiries") await loadInquiries();
    if (panel === "commissions") await loadCommissions();
  } catch (e) {
    toast(e.message, "error");
  }
  Utils.showLoader(false);
}

async function loadOverview() {
  const { stats } = await API.get("/admin/analytics");
  document.getElementById("adminStats").innerHTML = `
    <div class="card stat-card"><div class="value">${stats.users}</div><div class="label">Users</div></div>
    <div class="card stat-card"><div class="value">${stats.creators}</div><div class="label">Creators</div></div>
    <div class="card stat-card"><div class="value">${stats.bookings}</div><div class="label">Bookings</div></div>
    <div class="card stat-card"><div class="value">${Utils.formatMoney(stats.totalEarnings)}</div><div class="label">Earnings</div></div>
    <div class="card stat-card"><div class="value">${stats.pendingCreators}</div><div class="label">Pending Creators</div></div>
    <div class="card stat-card"><div class="value">${stats.contacts}</div><div class="label">New Contacts</div></div>`;
  document.getElementById("bookingChart").innerHTML = (stats.monthly || [])
    .map((m) => `<div style="margin:0.5rem 0">Month ${m._id}: ${m.count} bookings · ${Utils.formatMoney(m.revenue)}</div>`)
    .join("") || "<p>No data yet</p>";
}

async function loadCreators() {
  const { creators } = await API.get("/admin/creators");
  document.getElementById("creatorsTable").innerHTML = creators
    .map(
      (c) => `<tr>
      <td>${c.user?.name}</td><td>${c.user?.email}</td>
      <td><span class="badge badge-${c.status}">${c.status}</span></td>
      <td>${c.featured ? "★" : "—"}</td>
      <td>
        ${c.status === "pending" ? `<button class="btn btn-sm btn-primary" onclick="approveCreator('${c._id}')">Approve</button>
        <button class="btn btn-sm btn-danger" onclick="rejectCreator('${c._id}')">Reject</button>` : ""}
        <button class="btn btn-sm btn-outline" onclick="toggleFeatured('${c._id}',${!c.featured})">${c.featured ? "Unfeature" : "Feature"}</button>
        <button class="btn btn-sm btn-danger" onclick="deleteCreator('${c._id}')">Delete</button>
        <button class="btn btn-sm btn-outline" onclick="viewCalendar('${c._id}')">Calendar</button>
      </td></tr>`
    )
    .join("");
}

window.approveCreator = async (id) => {
  const note = prompt("Approval note (optional):", "Your creator account has been approved!");
  await API.patch(`/admin/creators/${id}/status`, { status: "approved", note: note || "Your creator account has been approved!" });
  toast("Creator approved — notification sent", "success");
  loadCreators();
};
window.rejectCreator = async (id) => {
  const reason = prompt("Reason for rejection:", "Your application did not meet our requirements.");
  if (!reason) return;
  await API.patch(`/admin/creators/${id}/status`, { status: "rejected", note: reason });
  toast("Creator rejected — notification sent", "success");
  loadCreators();
};
window.toggleFeatured = async (id, featured) => {
  await API.patch(`/admin/creators/${id}/featured`, { featured });
  loadCreators();
};
window.deleteCreator = async (id) => {
  if (!confirm("Delete creator and user account?")) return;
  await API.delete(`/admin/creators/${id}`);
  loadCreators();
};
window.viewCalendar = async (id) => {
  try {
    const { events } = await API.get(`/admin/creators/${id}/calendar`);
    const eventList = events.length
      ? events.map((e) => `${Utils.formatDate(e.date)} — ${e.type}: ${e.title || "—"}`).join("\n")
      : "No calendar events";
    // Show in a modal-like alert
    const modal = document.createElement("div");
    modal.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:9999";
    modal.innerHTML = `<div style="background:#141210;border:1px solid rgba(201,169,98,0.12);border-radius:12px;padding:2rem;max-width:500px;width:90%;max-height:80vh;overflow-y:auto">
      <h3 style="color:var(--gold-light);font-family:var(--font-display);margin-bottom:1rem">📅 Creator Calendar</h3>
      <pre style="color:var(--text);white-space:pre-wrap;font-family:inherit">${eventList}</pre>
      <button class="btn btn-primary btn-block" style="margin-top:1rem" onclick="this.closest('div[style]').parentElement.remove()">Close</button>
    </div>`;
    document.body.appendChild(modal);
  } catch (e) {
    toast(e.message, "error");
  }
};

async function loadBookings() {
  const { bookings } = await API.get("/bookings/all");
  document.getElementById("bookingsTable").innerHTML = bookings
    .map(
      (b) => `<tr>
      <td>${b.clientName}</td><td>${b.creator?.user?.name || "—"}</td>
      <td>${Utils.formatDate(b.eventDate)}</td>
      <td><span class="badge badge-${(b.status || "pending").toLowerCase().replace(/\s+/g, '-')}">${b.status}</span></td>
      <td>${Utils.formatMoney(b.amount || b.budget)}</td></tr>`
    )
    .join("");
}

async function loadPayments() {
  const { proofs } = await API.get("/admin/payment-proofs");
  document.getElementById("paymentsTable").innerHTML = proofs.length
    ? proofs.map((p) => {
        const statusClass = "status-" + (p.status === "verified" ? "verified" : p.status === "rejected" ? "rejected" : "pending");
        const actions = p.status === "pending"
          ? `<button class="btn btn-sm btn-success" onclick="verifyPaymentProof('${p._id}','verified')">✓ Verify</button>
             <button class="btn btn-sm btn-danger" onclick="verifyPaymentProof('${p._id}','rejected')">✗ Reject</button>`
          : `<span style="color:var(--text-muted);font-size:0.75rem">${p.status === "verified" ? "✅ Verified" : "❌ Rejected"}</span>`;
        return `<tr>
          <td>${p.user?.name || "—"}</td>
          <td>${p.booking?.eventType || "—"}</td>
          <td>${Utils.formatMoney(p.amount)}</td>
          <td>${p.note ? p.note.slice(0, 30) : "—"}</td>
          <td><span class="status-badge ${statusClass}">${p.status}</span></td>
          <td>${actions}</td>
        </tr>`;
      }).join("")
    : '<tr><td colspan="6"><div class="empty-state"><div class="icon">💳</div><h3>No payment proofs</h3></div></td></tr>';
}

window.verifyPaymentProof = async (id, status) => {
  try {
    await API.patch(`/admin/payment-proofs/${id}/verify`, { status });
    toast(`Payment ${status === "verified" ? "verified" : "rejected"}`, "success");
    loadPayments();
  } catch (e) {
    toast(e.message, "error");
  }
};

async function loadInquiries() {
  const { inquiries } = await API.get("/admin/inquiries");
  document.getElementById("inquiriesTable").innerHTML = inquiries.length
    ? inquiries.map((i) => {
        const statusClass = "status-" + (i.status || "pending");
        return `<tr>
          <td>${i.name || i.user?.name || "—"}</td>
          <td>${i.creator?.user?.name || "—"}</td>
          <td>${i.eventType || "—"}</td>
          <td>${Utils.formatDate(i.eventDate)}</td>
          <td>${Utils.formatMoney(i.budget)}</td>
          <td><span class="status-badge ${statusClass}">${i.status || "pending"}</span></td>
        </tr>`;
      }).join("")
    : '<tr><td colspan="6"><div class="empty-state"><div class="icon">📩</div><h3>No inquiries</h3></div></td></tr>';
}

async function loadUsers() {
  const { users } = await API.get("/admin/users");
  document.getElementById("usersTable").innerHTML = users
    .map(
      (u) => `<tr><td>${u.name}</td><td>${u.email}</td><td>${Utils.formatDate(u.createdAt)}</td>
      <td><button class="btn btn-sm btn-danger" onclick="deleteUser('${u._id}')">Delete</button></td></tr>`
    )
    .join("");
}
window.deleteUser = async (id) => {
  if (!confirm("Delete user?")) return;
  await API.delete(`/admin/users/${id}`);
  loadUsers();
};

async function loadPortfolios() {
  const { creators } = await API.get("/admin/portfolios");
  document.getElementById("portfoliosGrid").innerHTML = creators
    .map(
      (c) => `<div class="card"><h4 style="color:var(--cream)">${c.user?.name}</h4>
      <div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:0.5rem">
        ${(c.portfolio || []).slice(0, 4).map((p) => `<img src="${p}" style="width:60px;height:60px;object-fit:cover;border-radius:4px">`).join("")}
      </div><p style="font-size:0.8rem;color:var(--text-muted);margin-top:0.5rem">${(c.videos || []).length} videos</p></div>`
    )
    .join("");
}

async function loadHomepage() {
  const { homepage } = await API.get("/admin/homepage");
  document.getElementById("heroTitle").value = homepage.heroTitle || "";
  document.getElementById("heroSubtitle").value = homepage.heroSubtitle || "";
}
document.getElementById("homepageForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  await API.put("/admin/homepage", {
    heroTitle: document.getElementById("heroTitle").value,
    heroSubtitle: document.getElementById("heroSubtitle").value,
  });
  toast("Homepage saved", "success");
});

async function loadContacts() {
  const { contacts } = await API.get("/admin/contacts");
  document.getElementById("contactsTable").innerHTML = contacts
    .map(
      (c) => `<tr><td>${c.name}</td><td>${c.email}</td><td>${c.message.slice(0, 50)}...</td>
      <td>${c.status}</td><td><button class="btn btn-sm btn-outline" onclick="markContact('${c._id}')">Mark Read</button></td></tr>`
    )
    .join("");
}
window.markContact = async (id) => {
  await API.patch(`/admin/contacts/${id}`, { status: "read" });
  loadContacts();
};

async function loadCommissions() {
  try {
    const { commissions } = await API.get("/admin/commissions");
    const total = commissions.reduce((s, c) => s + (c.commissionAmount || 0), 0);
    const pending = commissions.filter((c) => c.status === "pending").length;
    document.getElementById("commTotal").textContent = Utils.formatMoney(total);
    document.getElementById("commPending").textContent = pending;
    document.getElementById("commissionsTable").innerHTML = commissions.length
      ? commissions.map((c) => {
          const statusClass = "status-" + (c.status || "pending");
          const actions = c.status === "pending"
            ? `<button class="btn btn-sm btn-success" onclick="releaseCommission('${c._id}')">Release</button>`
            : `<span style="color:var(--text-muted);font-size:0.75rem">✅ Released</span>`;
          return `<tr>
            <td>${c.booking?.eventType || "—"}</td>
            <td>${c.creator?.user?.name || "—"}</td>
            <td>${Utils.formatMoney(c.booking?.amount || 0)}</td>
            <td>${Utils.formatMoney(c.commissionAmount || 0)}</td>
            <td>${Utils.formatMoney((c.booking?.amount || 0) - (c.commissionAmount || 0))}</td>
            <td><span class="status-badge ${statusClass}">${c.status || "pending"}</span></td>
            <td>${actions}</td>
          </tr>`;
        }).join("")
      : '<tr><td colspan="7"><div class="empty-state"><div class="icon">📈</div><h3>No commissions yet</h3></div></td></tr>';
  } catch (e) {
    document.getElementById("commissionsTable").innerHTML = '<tr><td colspan="7"><div class="empty-state"><div class="icon">⚠️</div><h3>Failed to load commissions</h3></div></td></tr>';
  }
}

window.releaseCommission = async (id) => {
  if (!confirm("Release this commission payment to the creator?")) return;
  try {
    await API.patch(`/admin/commissions/${id}`, { status: "paid" });
    toast("Commission released", "success");
    loadCommissions();
  } catch (e) {
    toast(e.message, "error");
  }
};

async function loadNotifications() {
  const { notifications } = await API.get("/admin/notifications");
  document.getElementById("notificationsList").innerHTML = notifications
    .map((n) => `<div class="card" style="margin-bottom:0.5rem"><strong>${n.title}</strong><p>${n.message}</p><small>${Utils.formatDate(n.createdAt)}</small></div>`)
    .join("") || "<p>No notifications</p>";
}

loadPanel("overview");
Utils.showLoader(false);
