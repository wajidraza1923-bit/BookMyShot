/**
 * User Dashboard — BookMyShot
 */
const user = Utils.requireAuth(["user"]);
if (!user) return;

let activeChatUser = null;

Utils.initSidebar();
document.getElementById("menuDash")?.addEventListener("click", () => document.getElementById("sidebar").classList.toggle("open"));
document.getElementById("logoutBtn").onclick = () => { API.clearAuth(); location.href = "/"; };

document.querySelectorAll(".nav-item[data-panel]").forEach((item) => {
  item.addEventListener("click", (e) => {
    e.preventDefault();
    Utils.$$("#sidebar .nav-item").forEach((i) => i.classList.remove("active"));
    item.classList.add("active");
    Utils.$$(".panel").forEach((p) => p.classList.remove("active"));
    Utils.$(`#panel-${item.dataset.panel}`)?.classList.add("active");
    if (item.dataset.panel === "bookings") loadBookings();
    if (item.dataset.panel === "favorites") loadFavorites();
    if (item.dataset.panel === "messages") loadMessages();    if (item.dataset.panel === 'notifications') loadNotifications();
    if (item.dataset.panel === 'wallet') loadWallet();  });
});

async function loadBookings() {
  const { bookings } = await API.get("/bookings/my");
  document.getElementById("bookingsTable").innerHTML = bookings.length
    ? bookings.map((b) => `
      <tr>
        <td>${b.creator?.user?.name || "—"}</td>
        <td>${b.eventType}</td>
        <td>${Utils.formatDate(b.eventDate)}</td>
        <td><span class="badge badge-${(b.status || "pending").toLowerCase().replace(/\s+/g, '-')}">${b.status}</span></td>
        <td>
          <button class="btn btn-sm btn-outline" onclick="downloadInvoice('${b._id}')">Invoice</button>
          <button class="btn btn-sm btn-primary" onclick="chatCreator('${b.creator?.user?._id}')">Message</button>
          ${b.budget ? `<button class="btn btn-sm btn-secondary" onclick="payBooking('${b._id}', ${b.budget})">Pay</button>` : ""}
        </td>
      </tr>`).join("")
    : "<tr><td colspan='5'>No bookings yet. <a href='/'>Browse photographers</a></td></tr>";
}

window.downloadInvoice = (id) => {
  fetch(`/api/user/bookings/${id}/invoice`, { headers: { Authorization: `Bearer ${API.getToken()}` } })
    .then((r) => r.blob())
    .then((blob) => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `invoice-${id}.pdf`;
      a.click();
    });
};

window.payBooking = async (id, amount) => {
  if (!amount) {
    toast("Amount unavailable", "error");
    return;
  }
  try {
    const order = await API.post("/payments/order", { amount, bookingId: id });
    await API.post("/payments/verify", { razorpay_order_id: order.orderId });
    toast("Payment completed successfully", "success");
    loadBookings();
  } catch (err) {
    toast(err.message || "Payment failed", "error");
  }
};

async function loadNotifications() {
  const { notifications } = await API.get("/notifications");
  document.getElementById("notificationsList").innerHTML = notifications.length
    ? notifications.map((n) => `<div class="card" style="margin-bottom:0.5rem"><strong>${n.title}</strong><p>${n.message}</p><small>${Utils.formatDate(n.createdAt)}</small></div>`).join("")
    : "<div class='feature-card'>No notifications yet.</div>";
}

async function loadWallet() {
  const { bookings } = await API.get("/bookings/my");
  const paid = bookings
    .filter((b) => b.status === "Completed" || b.status === "Payment Approved" || b.status === "paid")
    .reduce((sum, b) => sum + (b.amount || b.budget || 0), 0);
  const pending = bookings
    .filter((b) => b.status === "Booking Created" || b.status === "Creator Accepted" || b.status === "pending" || b.status === "accepted")
    .reduce((sum, b) => sum + (b.amount || b.budget || 0), 0);
  document.getElementById("walletBalance").textContent = Utils.formatMoney(paid);
  document.getElementById("pendingPayments").textContent = Utils.formatMoney(pending);
}


window.chatCreator = (userId) => {
  document.querySelector('[data-panel="messages"]').click();
  setTimeout(() => openChat(userId), 300);
};

async function loadFavorites() {
  const { favorites } = await API.get("/user/favorites");
  document.getElementById("favoritesGrid").innerHTML = favorites.length
    ? favorites.map((c) => `
      <div class="card">
        <img src="${c.portfolio?.[0] || "https://images.unsplash.com/photo-1554048612-b6a482b17f70?w=400"}" style="width:100%;height:160px;object-fit:cover;border-radius:8px">
        <h4 style="margin-top:0.75rem;color:var(--cream)">${c.user?.name}</h4>
        <p style="color:var(--text-muted);font-size:0.85rem">${c.specialty}</p>
        <button class="btn btn-card btn-sm" style="margin-top:0.5rem" onclick="toggleFav('${c._id}')">Remove</button>
      </div>`).join("")
    : "<p>No favorites saved</p>";
}

window.toggleFav = async (id) => {
  await API.post(`/user/favorites/${id}`);
  loadFavorites();
};

async function loadMessages() {
  const { conversations } = await API.get("/messages");
  document.getElementById("chatList").innerHTML = conversations
    .map((c) => `<div style="padding:0.75rem;cursor:pointer;border-bottom:1px solid var(--border)" onclick="openChat('${c.user._id}')">
      <strong>${c.user.name}</strong><br><small>${c.lastMessage?.content?.slice(0, 40) || ""}</small></div>`).join("") || "<p style='padding:1rem'>No messages</p>";
}

window.openChat = async (userId) => {
  activeChatUser = userId;
  const { messages } = await API.get(`/messages/${userId}`);
  document.getElementById("chatBody").innerHTML = messages.map((m) => {
    const sent = m.sender._id === user.id;
    return `<div class="msg ${sent ? "sent" : ""}"><div class="msg-bubble">${m.content}</div></div>`;
  }).join("");
};

document.getElementById("sendMsg")?.addEventListener("click", async () => {
  const content = document.getElementById("chatInput").value.trim();
  if (!content || !activeChatUser) return;
  await API.post("/messages", { receiverId: activeChatUser, content });
  document.getElementById("chatInput").value = "";
  openChat(activeChatUser);
});

loadBookings();
Utils.showLoader(false);
