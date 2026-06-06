/**
 * Shared UI utilities
 */
const Utils = {
  $(sel, ctx = document) {
    return ctx.querySelector(sel);
  },
  $$(sel, ctx = document) {
    return [...ctx.querySelectorAll(sel)];
  },

  formatDate(d) {
    return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  },

  formatMoney(n) {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n || 0);
  },

  requireAuth(roles) {
    const user = API.getUser();
    if (!user || !API.getToken()) {
      window.location.href = "/login.html";
      return null;
    }
    if (roles && !roles.includes(user.role)) {
      window.location.href = "/";
      return null;
    }
    return user;
  },

  initSidebar() {
    Utils.$$("#sidebar .nav-item").forEach((item) => {
      item.addEventListener("click", (e) => {
        e.preventDefault();
        const panel = item.dataset.panel;
        Utils.$$("#sidebar .nav-item").forEach((i) => i.classList.remove("active"));
        item.classList.add("active");
        Utils.$$(".panel").forEach((p) => p.classList.remove("active"));
        Utils.$(`#panel-${panel}`)?.classList.add("active");
      });
    });
  },

  showLoader(show) {
    const el = Utils.$("#pageLoader");
    if (el) el.classList.toggle("hidden", !show);
  },

  escapeHtml(str) {
    if (!str) return "";
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  },
};

function toast(message, type = "info") {
  let container = Utils.$("#toastContainer");
  if (!container) {
    container = document.createElement("div");
    container.id = "toastContainer";
    document.body.appendChild(container);
  }
  const t = document.createElement("div");
  t.className = `toast toast-${type}`;
  t.textContent = message;
  container.appendChild(t);
  setTimeout(() => t.classList.add("show"), 10);
  setTimeout(() => {
    t.classList.remove("show");
    setTimeout(() => t.remove(), 300);
  }, 3500);
}