const pageLoader = document.getElementById('pageLoader');
const menuToggle = document.getElementById('menuToggle');
const mobileSidebar = document.getElementById('mobileSidebar');
const sidebarClose = document.getElementById('sidebarClose');
const scrollTopBtn = document.getElementById('scrollTopBtn');
const navbar = document.getElementById('navbar');
const navLinks = document.querySelectorAll('.topnav a');
const sections = document.querySelectorAll('main section, .footer-section');

function hideLoader() {
  document.body.classList.remove('loading');
  if (pageLoader) {
    pageLoader.classList.add('hidden');
  }
}

function toggleSidebar() {
  if (mobileSidebar) mobileSidebar.classList.toggle('open');
  if (menuToggle) menuToggle.classList.toggle('open');
  // Lock body scroll when menu is open
  if (mobileSidebar && mobileSidebar.classList.contains('open')) {
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = '';
  }
}

function closeSidebar() {
  if (mobileSidebar) mobileSidebar.classList.remove('open');
  if (menuToggle) menuToggle.classList.remove('open');
  document.body.style.overflow = '';
}

function handleScroll() {
  if (!navbar) return;
  if (window.scrollY > 40) {
    navbar.classList.add('scrolled');
  } else {
    navbar.classList.remove('scrolled');
  }
  setActiveNav();
}

function setActiveNav() {
  const offset = window.innerHeight * 0.2;
  let activeId = '';
  sections.forEach((section) => {
    const top = section.getBoundingClientRect().top;
    const id = section.id;
    if (top >= -offset && top < offset && id) {
      activeId = id;
    }
  });
  navLinks.forEach((link) => {
    const href = link.getAttribute('href');
    if (href && href.startsWith('#')) {
      link.classList.toggle('active', href === `#${activeId}`);
    }
  });
}

function smoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', (event) => {
      const targetId = anchor.getAttribute('href');
      if (targetId && targetId.startsWith('#')) {
        event.preventDefault();
        const targetElement = document.querySelector(targetId);
        if (targetElement) {
          targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
      closeSidebar();
    });
  });
}

function revealOnScroll() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, { threshold: 0.18 });
  document.querySelectorAll('.reveal').forEach((element) => observer.observe(element));
}

function buttonRipple(event) {
  const button = event.currentTarget;
  const ripple = document.createElement('span');
  ripple.className = 'ripple';
  const rect = button.getBoundingClientRect();
  ripple.style.left = `${event.clientX - rect.left}px`;
  ripple.style.top = `${event.clientY - rect.top}px`;
  button.appendChild(ripple);
  setTimeout(() => ripple.remove(), 600);
}

function attachRipples() {
  document.querySelectorAll('.btn-animated').forEach((button) => {
    button.addEventListener('click', buttonRipple);
  });
}

function animateCounters() {
  document.querySelectorAll('.counter').forEach((counter) => {
    const target = parseInt(counter.dataset.target, 10) || 0;
    let current = 0;
    const duration = 1200;
    const stepTime = Math.max(Math.floor(duration / target), 15);
    const increment = Math.ceil(target / (duration / stepTime));
    const update = setInterval(() => {
      current += increment;
      if (current >= target) {
        counter.textContent = counter.classList.contains('counter-currency') ? `₹${target}L` : target;
        clearInterval(update);
      } else {
        counter.textContent = current;
      }
    }, stepTime);
  });
}

function getCreatorPlaceholderImage() {
  return "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 640 360'%3E%3Crect width='640' height='360' fill='%2310212f'/%3E%3Ctext x='50%25' y='50%25' fill='%23f8fafc' font-family='Inter,system-ui,sans-serif' font-size='32' font-weight='700' text-anchor='middle' dominant-baseline='middle'%3EComing%20Soon%3C/text%3E%3C/svg%3E";
}

function getBadgeHtml(badge, rank) {
  // Show explicit badge if set
  if (badge) {
    const badges = {
      rank_1: '🏆 #1 Creator',
      rank_2: '🥈 #2 Creator',
      rank_3: '🥉 #3 Creator',
      rank_4: '⭐ #4 Creator',
      best_creator: '⭐ Verified Creator',
      most_trusted: '🛡 Most Trusted',
      premium_creator: '👑 Premium Creator',
      top_rated: '🌟 Top Rated',
      editors_choice: '✨ Rising Star'
    };
    const label = badges[badge];
    if (label) return `<div style="position:absolute;top:10px;left:10px;z-index:2;background:rgba(212,175,55,.9);color:#111;font-size:.58rem;font-weight:700;padding:.25rem .5rem;border-radius:6px;letter-spacing:.02em">${label}</div>`;
  }
  // Show rank number if rank is set (and no explicit badge)
  if (rank && rank > 0) {
    return `<div style="position:absolute;top:10px;left:10px;z-index:2;background:rgba(212,175,55,.9);color:#111;font-size:.58rem;font-weight:700;padding:.25rem .5rem;border-radius:6px;letter-spacing:.02em">#${rank} Creator</div>`;
  }
  return '';
}

async function loadFeaturedCreators() {
  const container = document.getElementById('featuredCreatorsContainer');
  if (!container) return;
  const section = container.closest('section') || document.getElementById('creators');
  container.innerHTML = '';
  try {
    const res = await API.get('/creators?featured=true');
    const now = new Date();
    const creators = (res.creators || []).filter(c => c.status === 'approved' && c.featured === true && (!c.featuredEndDate || new Date(c.featuredEndDate) > now));
    if (!creators.length) {
      if (section) section.style.display = 'none';
      return;
    }
    if (section) section.style.display = '';
    creators.slice(0, 4).forEach((c) => {
      const card = document.createElement('article');
      card.className = 'cinematic-card';
      card.style.position = 'relative';
      const thumb = c.portfolio?.[0] || c.user?.avatar || 'https://images.unsplash.com/photo-1554048612-b6a482b17f70?w=400';
      card.innerHTML = `
        <div style="position:absolute;top:10px;right:10px;z-index:2;background:rgba(255,140,39,.9);color:#fff;font-size:.6rem;font-weight:700;padding:.25rem .5rem;border-radius:6px;letter-spacing:.03em">★ FEATURED</div>
        <div class="cinematic-thumb" style="background-image:url('${thumb}')"></div>
        <div class="cinematic-body"><span>${c.specialty || c.category || 'Creator'}</span><h3>${c.user?.name || 'Creator'}</h3><div class="meta-row"><span>★ ${c.rating || 4.9}</span><span>${c.city || ''}</span></div></div>`;
      card.addEventListener('click', () => {
        window.location.href = `/creator-portfolio.html?id=${c._id}`;
      });
      container.appendChild(card);
    });
  } catch (e) {
    if (section) section.style.display = 'none';
  }
}

async function loadAllCreators() {
  const container = document.getElementById('allCreatorsContainer');
  if (!container) return;
  const section = container.closest('section') || document.getElementById('cinematic');
  container.innerHTML = '';
  try {
    const res = await API.get('/creators');
    const creators = (res.creators || []).filter(c => c.status === 'approved');
    if (!creators.length) {
      if (section) section.style.display = 'none';
      return;
    }
    // Sort: ranked creators first (ascending), then unranked
    creators.sort((a, b) => {
      const ra = a.rank || 9999;
      const rb = b.rank || 9999;
      return ra - rb;
    });
    if (section) section.style.display = '';
    // Show only 4 creators on homepage
    creators.slice(0, 4).forEach((c) => {
      const card = document.createElement('article');
      card.className = 'cinematic-card';
      card.style.position = 'relative';
      const thumb = c.portfolio?.[0] || c.user?.avatar || 'https://images.unsplash.com/photo-1554048612-b6a482b17f70?w=400';
      const badgeHtml = getBadgeHtml(c.badge, c.rank);
      card.innerHTML = `
        ${badgeHtml}
        <div class="cinematic-thumb" style="background-image:url('${thumb}')"></div>
        <div class="cinematic-body"><span>${c.specialty || c.category || 'Creator'}</span><h3>${c.user?.name || 'Creator'}</h3><div class="meta-row"><span>★ ${c.rating || 4.9}</span><span>${c.city || ''}</span></div></div>`;
      card.addEventListener('click', () => {
        window.location.href = `/creator-portfolio.html?id=${c._id}`;
      });
      container.appendChild(card);
    });
  } catch (e) {
    if (section) section.style.display = 'none';
  }
}

async function createBookingFromPackage(packageName) {
  const dateInput = document.querySelector('.booking-form-card input[type="date"]');
  const locationInput = document.querySelector('.booking-form-card input[type="text"]');
  const eventDate = dateInput?.value;
  const eventLocation = locationInput?.value?.trim();

  if (!eventDate || !eventLocation) {
    toast('Please select a date and location', 'error');
    return;
  }

  // Get user info if logged in (optional)
  const user = API.getUser();
  const token = API.getToken();

  try {
    // Submit as homepage general enquiry (NOT a creator booking)
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = 'Bearer ' + token;

    const res = await fetch(API.base + '/api/homepage-enquiries', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        eventType: packageName || 'General Enquiry',
        eventDate,
        eventLocation,
        name: user ? user.name : '',
        email: user ? user.email : '',
        phone: user ? (user.phone || '') : '',
        message: 'Submitted from BookMyShot homepage',
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Submission failed');

    toast('Enquiry submitted! Our team will contact you soon.', 'success');
    if (dateInput) dateInput.value = '';
    if (locationInput) locationInput.value = '';
  } catch (err) {
    toast(err.message || 'Submission failed', 'error');
  }
}

function attachPackageButtons() {
  document.querySelectorAll('.btn-book-package').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const pkg = btn.dataset.package || 'Luxury Booking';
      createBookingFromPackage(pkg);
    });
  });
}

function attachBookingButton() {
  const bookingButton = document.querySelector('.booking-form-card .btn-primary');
  if (bookingButton) {
    bookingButton.addEventListener('click', (e) => {
      e.preventDefault();
      createBookingFromPackage('Luxury Booking');
    });
  }
}

// Initialize immediately since script is at bottom of body (DOM is already ready)
(function init() {
  try { hideLoader(); } catch(e) {}
  try { revealOnScroll(); } catch(e) {}
  try { smoothScroll(); } catch(e) {}
  try { attachRipples(); } catch(e) {}
  try { attachPackageButtons(); } catch(e) {}
  try { attachBookingButton(); } catch(e) {}
  try { loadFeaturedCreators(); } catch(e) {}
  try { loadAllCreators(); } catch(e) {}
  try { animateCounters(); } catch(e) {}
  try { handleScroll(); } catch(e) {}
  try { attachDashboardNavigation(); } catch(e) {}
})();

window.addEventListener('scroll', handleScroll, { passive: true });
if (menuToggle) menuToggle.addEventListener('click', toggleSidebar);
if (sidebarClose) sidebarClose.addEventListener('click', closeSidebar);
if (scrollTopBtn) {
  scrollTopBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

// Removed storage event listener - was causing infinite reload loop
// when API calls wrote to localStorage triggering loadFeaturedCreators() repeatedly

function attachDashboardNavigation() {
  // Creator Dashboard button
  var creatorBtn = document.getElementById('sidebarCreatorDash');
  if (creatorBtn) {
    creatorBtn.addEventListener('click', function(e) {
      var user = API.getUser();
      var token = API.getToken();
      if (user && token && (user.role === 'creator' || user.role === 'admin')) {
        e.preventDefault();
        window.location.href = '/creator/dashboard.html';
      }
      // If not logged in as creator, let the default href ("/creator-auth.html") work naturally
    });
  }

  // User Dashboard button
  var userBtn = document.getElementById('sidebarUserDash');
  if (userBtn) {
    userBtn.addEventListener('click', function(e) {
      e.preventDefault();
      var user = API.getUser();
      var token = API.getToken();
      if (user && token && (user.role === 'user' || user.role === 'admin')) {
        window.location.href = '/user/dashboard.html';
      } else {
        window.location.href = '/user-auth.html';
      }
    });
  }

  // Admin Dashboard button
  var adminBtn = document.getElementById('sidebarAdminDash');
  if (adminBtn) {
    adminBtn.addEventListener('click', function(e) {
      e.preventDefault();
      var user = API.getUser();
      var token = API.getToken();
      if (user && token && user.role === 'admin') {
        window.location.href = '/admin/dashboard.html';
      } else {
        window.location.href = '/admin-login.html';
      }
    });
  }
}
