// Shared minimal dashboard interactions
document.addEventListener('DOMContentLoaded', () => {
  const menuToggle = document.getElementById('menuToggle');
  const mobileSidebar = document.getElementById('mobileSidebar');
  const sidebarClose = document.getElementById('sidebarClose');

  if (menuToggle && mobileSidebar) {
    menuToggle.addEventListener('click', () => {
      mobileSidebar.classList.toggle('open');
      menuToggle.classList.toggle('open');
    });
  }
  if (sidebarClose && mobileSidebar) {
    sidebarClose.addEventListener('click', () => mobileSidebar.classList.remove('open'));
  }

  // Simple panel/tab switching for dashboards that include panels
  document.querySelectorAll('.nav-item[data-panel]').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      const panel = el.getAttribute('data-panel');
      document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
      const target = document.getElementById('panel-' + panel) || document.getElementById('panel-' + panel.replace('#',''));
      if (target) target.classList.add('active');
      document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
      el.classList.add('active');
      const sidebar = document.getElementById('sidebar');
      if (sidebar?.classList.contains('open')) sidebar.classList.remove('open');
    });
  });
  // Init page-specific handlers
  try {
    const path = window.location.pathname;
    if (path.includes('/creator/')) initCreatorDashboard();
    if (path.includes('/cameraman/')) initCameramanDashboard();
    if (path.includes('/user/')) initUserDashboard();
    if (path.includes('/admin/')) initAdminDashboard();
  } catch (err) { console.error(err); }
});

function saveToLocal(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function readFromLocal(key) {
  try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch(e){return null}
}

function initCreatorDashboard() {
  const upload = document.getElementById('portfolioUpload');
  const preview = document.getElementById('portfolioPreview');
  const bookingList = document.getElementById('creatorBookingList');
  const advanceReceived = document.getElementById('advanceReceived');
  const remainingDue = document.getElementById('remainingDue');
  const blockDateInput = document.getElementById('blockDateInput');
  const blockDateBtn = document.getElementById('blockDateBtn');
  const blockedDatesList = document.getElementById('blockedDatesList');

  const portfolio = readFromLocal('bms_portfolio') || [];
  if (preview) {
    preview.innerHTML = '';
    portfolio.filter(p=>p.owner==='me' || !p.owner).forEach(item=>{
      const el = document.createElement('div'); el.style.borderRadius='12px'; el.style.overflow='hidden';
      el.innerHTML = `<div style="background-image:url('${item.src}');background-size:cover;height:120px;background-position:center"></div><div style="padding:0.6rem"><strong>${item.title||'Untitled'}</strong></div>`;
      preview.appendChild(el);
    });
  }

  if (upload) {
    upload.addEventListener('change', (e)=>{
      const files = Array.from(e.target.files || []);
      files.forEach(file => {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const arr = readFromLocal('bms_portfolio') || [];
          arr.push({ id: 'p_'+Date.now(), owner: 'me', title: file.name, type: file.type, src: ev.target.result, rating:4.9, createdAt: new Date().toISOString() });
          saveToLocal('bms_portfolio', arr);
          try { localStorage.setItem('bms_portfolio_updated_at', Date.now().toString()); } catch(e){}
          // update preview
          if (preview) {
            const d = document.createElement('div'); d.style.borderRadius='12px'; d.style.overflow='hidden';
            d.innerHTML = `<div style="background-image:url('${ev.target.result}');background-size:cover;height:120px;background-position:center"></div><div style="padding:0.6rem"><strong>${file.name}</strong></div>`;
            preview.prepend(d);
          }
          // notify other pages
          window.dispatchEvent(new Event('storage'));
        };
        reader.readAsDataURL(file);
      });
    });
  }

  // Block dates
  if (blockDateBtn && blockDateInput) {
    blockDateBtn.addEventListener('click', ()=>{
      const date = blockDateInput.value; if (!date) return;
      const arr = readFromLocal('bms_blocked_dates') || [];
      if (!arr.includes(date)) arr.push(date);
      saveToLocal('bms_blocked_dates', arr);
      renderBlockedDates();
    });
  }
  function renderBlockedDates(){
    const arr = readFromLocal('bms_blocked_dates') || [];
    if (blockedDatesList) blockedDatesList.innerHTML = arr.map(d=>`<div class="feature-card">${d}</div>`).join('');
  }
  renderBlockedDates();

  // Load bookings for creator (simple filter)
  if (bookingList) {
    const bookings = readFromLocal('bms_bookings') || [];
    bookingList.innerHTML = bookings.map(b=>`<article class="feature-card"><h3>${b.package}</h3><p>Date: ${b.date || 'TBA'} — ${b.status}</p></article>`).join('') || '<div class="feature-card">No bookings yet</div>';
  }

  // Payments summary (simple)
  if (advanceReceived) advanceReceived.textContent = '₹' + (readFromLocal('bms_advance') || 0);
  if (remainingDue) remainingDue.textContent = '₹' + (readFromLocal('bms_remaining') || 0);
}

function initUserDashboard(){
  const table = document.getElementById('bookingsTable');
  const favoritesGrid = document.getElementById('favoritesGrid');
  const walletBalance = document.getElementById('walletBalance');
  const pendingPayments = document.getElementById('pendingPayments');

  const bookings = readFromLocal('bms_bookings') || [];
  if (table) {
    table.innerHTML = bookings.map(b=>`<tr><td>BookMyShot</td><td>${b.package}</td><td>${b.date||'TBA'}</td><td>${b.status}</td><td><a class="btn btn-secondary" href="/user/dashboard.html">View</a></td></tr>`).join('') || '<tr><td colspan="5">No bookings yet</td></tr>';
  }
  if (favoritesGrid) {
    const favs = readFromLocal('bms_favorites') || [];
    favoritesGrid.innerHTML = favs.map(f=>`<article class="cinematic-card"><div class="cinematic-thumb" style="background-image:url('${f.src}')"></div><div class="cinematic-body"><h3>${f.title||'Creator'}</h3></div></article>`).join('') || '<div class="feature-card">No favorites yet</div>';
  }
  if (walletBalance) walletBalance.textContent = '₹' + (readFromLocal('bms_wallet') || 0);
  if (pendingPayments) pendingPayments.textContent = '₹' + (readFromLocal('bms_pending') || 0);
}

function initCameramanDashboard() {
  initCreatorDashboard();
}

function initAdminDashboard() {
  const approvals = document.getElementById('adminApprovals');
  const analytics = document.getElementById('adminAnalytics');
  const revenue = document.getElementById('adminRevenue');
  const users = document.getElementById('adminUsers');
  const bookings = document.getElementById('adminBookings');
  if (approvals) approvals.innerHTML = '<div class="feature-card"><h3>Creator Approvals</h3><p>Pending creator requests and profile reviews.</p></div>';
  if (analytics) analytics.innerHTML = '<div class="feature-card"><h3>Analytics Snapshot</h3><p>Summary of traffic, bookings and creator performance.</p></div>';
  if (revenue) revenue.innerHTML = '<div class="feature-card"><h3>Revenue</h3><p>₹0 — revenue data to be integrated.</p></div>';
  if (users) users.innerHTML = '<div class="feature-card"><h3>User Management</h3><p>Manage creators, users and access permissions.</p></div>';
  if (bookings) bookings.innerHTML = '<div class="feature-card"><h3>Booking Management</h3><p>Approve, review and assign new booking requests.</p></div>';
}

// Listen to storage updates from other tabs/pages
window.addEventListener('storage', (e)=>{
  try { if (window.location.pathname === '/' || window.location.pathname.endsWith('/index.html')) {
      // homepage should reload creators
      if (typeof loadFeaturedCreators === 'function') loadFeaturedCreators();
    }
  } catch(err){console.error(err)}
});
