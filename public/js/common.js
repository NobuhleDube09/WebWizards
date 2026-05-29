/**
 * CampusConnect — Shared UI helpers v2
 */

/* ── Constants ─────────────────────────────────────────────────────────────── */
const CATEGORIES = [
  { label: 'Tutoring',        icon: '📚' },
  { label: 'Creative Arts',   icon: '🎨' },
  { label: 'Tech Support',    icon: '💻' },
  { label: 'Food & Baking',   icon: '🍞' },
  { label: 'Photography',     icon: '📸' },
  { label: 'Hair & Beauty',   icon: '💄' },
  { label: 'Music',           icon: '🎵' },
  { label: 'Fitness',         icon: '🏋️' },
  { label: 'Writing',         icon: '✍️' },
  { label: 'Other',           icon: '✨' },
];

/* ── Formatting ─────────────────────────────────────────────────────────────── */
const formatMoney = (value) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return 'Quote';
  return `R${Number(value).toFixed(2)}`;
};

const formatRelTime = (dateStr) => {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  if (diff < 60_000)   return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 604_800_000) return `${Math.floor(diff / 86_400_000)}d ago`;
  return new Date(dateStr).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' });
};

/* ── Avatar ─────────────────────────────────────────────────────────────────── */
const avatarInitials = (name = '') => {
  const parts = name.trim().split(' ');
  return (parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '');
};

const avatarHtml = (user, size = 'sm') => {
  if (user?.avatar_url) {
    return `<img class="avatar avatar-${size}" src="${user.avatar_url}" alt="${user.name || ''}">`;
  }
  const initials = avatarInitials(user?.name || user?.email || '?');
  const px = { xs: 28, sm: 40, md: 56, lg: 88, xl: 120 }[size] ?? 40;
  const fs = Math.round(px * 0.38);
  return `<div class="avatar-placeholder avatar-${size}" style="width:${px}px;height:${px}px;font-size:${fs}px">${initials.toUpperCase()}</div>`;
};

/* ── Stars ───────────────────────────────────────────────────────────────────── */
const starsHtml = (rating) => {
  const r = Math.round(Number(rating) || 0);
  return `<span class="stars" title="${rating} stars">${
    Array.from({ length: 5 }, (_, i) => `<span class="star ${i < r ? 'filled' : ''}">★</span>`).join('')
  }</span>`;
};

/* ── Toast ──────────────────────────────────────────────────────────────────── */
const ensureToastContainer = () => {
  let el = document.getElementById('toast-container');
  if (!el) { el = document.createElement('div'); el.id = 'toast-container'; document.body.appendChild(el); }
  return el;
};

const showToast = (message, type = 'info', duration = 3500) => {
  const container = ensureToastContainer();
  const icons = { success: '✓', error: '✕', info: 'i' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span class="toast-icon">${icons[type] ?? 'i'}</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('toast-out');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
  }, duration);
};

/* ── Listing card ────────────────────────────────────────────────────────────── */
const listingCardHtml = (listing) => {
  const img = listing.images?.[0];
  const seller = listing.seller || {};
  const rating = Number(listing.rating_avg || 0).toFixed(1);
  const cat = CATEGORIES.find(c => c.label === listing.category);

  return `
    <article class="listing-card" onclick="window.location='/pages/listing.html?id=${listing.id}'">
      <div class="listing-img-wrap">
        ${img
          ? `<img class="listing-img" src="${img}" alt="${listing.title}" loading="lazy">`
          : `<div class="listing-img-placeholder">${listing.category ?? 'Service'}</div>`
        }
        <span class="badge badge-muted" style="position:absolute;top:.75rem;left:.75rem">${listing.category}</span>
        ${listing.is_available === false ? `<span class="badge badge-accent" style="position:absolute;top:.75rem;right:.75rem">Unavailable</span>` : ''}
      </div>
      <div class="listing-body">
        <h3 class="listing-title">${listing.title}</h3>
        <p class="listing-desc">${listing.description || ''}</p>
        <div class="listing-footer">
          <div class="listing-seller">
            ${avatarHtml(seller, 'xs')}
            <span class="truncate">${seller.name || 'Seller'}</span>
          </div>
          <div style="display:flex;align-items:center;gap:.6rem">
            <span style="font-size:.8rem;color:var(--text-muted)">${starsHtml(listing.rating_avg)} ${rating} (${listing.review_count || 0})</span>
            <span class="listing-price">${formatMoney(listing.price)}</span>
          </div>
        </div>
      </div>
    </article>`;
};

/* ── Navigation ──────────────────────────────────────────────────────────────── */
const bindNav = () => {
  const nav = document.querySelector('.nav');
  if (!nav) return;

  const isLoggedIn = window.Auth?.isLoggedIn?.() ?? false;
  const user       = isLoggedIn
    ? (JSON.parse(localStorage.getItem('cc_profile') || 'null') || {})
    : null;
  const firstName  = user?.name ? user.name.trim().split(' ')[0] : '';

  const loggedInHtml = `
    <a class="nav-link" href="/pages/browse.html">Browse</a>
    <a class="nav-link" href="/pages/inbox.html">Inbox</a>
    <a class="nav-link" href="/pages/leaderboard.html">Leaderboard</a>
    <a class="nav-link btn btn-ghost btn-sm" href="/pages/dashboard.html">Dashboard</a>
    <a class="nav-user-pill" href="/pages/profile.html?id=${user?.id ?? ''}">
      ${avatarHtml(user ?? {}, 'xs')}
      <span class="nav-username">${firstName}</span>
    </a>`;

  const loggedOutHtml = `
    <a class="nav-link" href="/pages/browse.html">Browse</a>
    <a class="nav-link" href="/pages/leaderboard.html">Leaderboard</a>
    <a class="btn btn-ghost btn-sm" href="/pages/login.html">Log in</a>
    <a class="btn btn-primary btn-sm" href="/pages/get-started.html">Sign up free</a>`;

  // Replace #navLinks content — no duplicates, no appended siblings
  const navLinks = nav.querySelector('#navLinks');
  if (navLinks) navLinks.innerHTML = isLoggedIn && user ? loggedInHtml : loggedOutHtml;
};

/* ── Active nav link ─────────────────────────────────────────────────────────── */
const highlightActiveNav = () => {
  const path = window.location.pathname;
  document.querySelectorAll('#navLinks .nav-link').forEach(a => {
    const href = a.getAttribute('href')?.split('?')[0];
    a.classList.toggle('active', !!href && (path === href || path.startsWith(href) && href !== '/'));
  });
};

/* ── Announcement banner ─────────────────────────────────────────────────────── */
const ANN_TYPE_STYLE = {
  info:    { bg: '#eff6ff', border: '#bfdbfe', color: '#1d4ed8', icon: 'ℹ' },
  warning: { bg: '#fffbeb', border: '#fcd34d', color: '#92400e', icon: '⚠' },
  success: { bg: '#ecfdf5', border: '#6ee7b7', color: '#065f46', icon: '✓' },
  error:   { bg: '#fff1f2', border: '#fca5a5', color: '#991b1b', icon: '!' },
};

const loadAnnouncementBanner = async () => {
  // Skip on admin page
  if (window.location.pathname.includes('admin')) return;

  try {
    const res = await fetch('/api/announcements');
    if (!res.ok) return;
    const { announcements } = await res.json();
    if (!announcements?.length) return;

    const profile = (() => { try { return JSON.parse(localStorage.getItem('cc_profile')); } catch { return null; } })();
    const role = profile ? (profile.is_admin ? 'admin' : 'user') : 'guest';

    // Filter by target_role
    const visible = announcements.filter(a => {
      const t = a.target_role || 'all';
      return t === 'all' || t === role;
    });
    if (!visible.length) return;

    // Build banner — show the most recent active one
    const ann = visible[0];
    const style = ANN_TYPE_STYLE[ann.type] || ANN_TYPE_STYLE.info;
    const banner = document.createElement('div');
    banner.id = 'cc-ann-banner';
    banner.style.cssText = [
      `background:${style.bg}`,
      `border-bottom:2px solid ${style.border}`,
      `color:${style.color}`,
      'padding:10px 20px',
      'font-size:.85rem',
      'font-weight:500',
      'display:flex',
      'align-items:center',
      'justify-content:space-between',
      'gap:12px',
      'z-index:9998',
      'position:sticky',
      'top:0',
      'font-family:Inter,sans-serif',
    ].join(';');

    banner.innerHTML = `
      <span style="display:flex;align-items:center;gap:8px">
        <strong>${style.icon}</strong>
        <strong>${ann.title}:</strong>
        <span>${ann.content}</span>
      </span>
      <button onclick="document.getElementById('cc-ann-banner').remove()" style="background:none;border:none;cursor:pointer;font-size:1.1rem;color:inherit;padding:0 4px;line-height:1;opacity:.7">&times;</button>`;

    document.body.insertAdjacentElement('afterbegin', banner);
  } catch { /* silent */ }
};

/* ── Theme (dark / light mode) ───────────────────────────────────────────────── */
const CC_THEME_KEY = 'cc_theme';

const getTheme = () => localStorage.getItem(CC_THEME_KEY) || 'light';

const applyTheme = (theme) => {
  document.documentElement.setAttribute('data-theme', theme);
};

const toggleTheme = () => {
  const next = getTheme() === 'dark' ? 'light' : 'dark';
  localStorage.setItem(CC_THEME_KEY, next);
  applyTheme(next);
  _syncThemeFab();
};

const _sunIcon  = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`;
const _moonIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;

const _syncThemeFab = () => {
  const fab = document.getElementById('cc-theme-fab');
  if (!fab) return;
  const isDark = getTheme() === 'dark';
  fab.setAttribute('title', isDark ? 'Switch to light mode' : 'Switch to dark mode');
  fab.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
  fab.innerHTML = isDark ? _sunIcon : _moonIcon;
};

// Apply saved theme as early as possible (reduces flash when script loads)
applyTheme(getTheme());

/* ── Init on DOM ready ───────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  // Sign out immediately if the cached profile is suspended
  try {
    const p = JSON.parse(localStorage.getItem('cc_profile') || 'null');
    if (p?.is_suspended && !window.location.pathname.includes('login') && !window.location.pathname.includes('register')) {
      showToast('Your account has been suspended. Please contact support.', 'error', 6000);
      setTimeout(() => window.Auth?.signOut?.(), 2000);
      return;
    }
  } catch { /* ignore */ }

  bindNav();
  highlightActiveNav();
  loadAnnouncementBanner();

  // Inject theme toggle FAB
  if (!document.getElementById('cc-theme-fab')) {
    const fab = document.createElement('button');
    fab.id = 'cc-theme-fab';
    fab.onclick = toggleTheme;
    document.body.appendChild(fab);
    _syncThemeFab();
  }
});

window.showToast      = showToast;
window.avatarHtml     = avatarHtml;
window.starsHtml      = starsHtml;
window.listingCardHtml = listingCardHtml;
window.formatMoney    = formatMoney;
window.formatRelTime  = formatRelTime;
window.CATEGORIES     = CATEGORIES;
window.toggleTheme    = toggleTheme;