/* ─────────────────────────────────────────────────────────────────────────
   CampusConnect — Admin Panel JS
   ───────────────────────────────────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', async () => {
  if (!Auth.requireAuth()) return;

  // Guard: admins only
  const me = await Auth.getProfile();
  if (!me?.is_admin) { window.location.replace('/pages/dashboard.html'); return; }

  // Sidebar profile
  const snEl = document.getElementById('sidebarName');
  const saEl = document.getElementById('sidebarAvatarWrap');
  if (snEl) snEl.textContent = me.name || '—';
  if (saEl) saEl.innerHTML = avatarHtml(me, 'xs');

  // ── Tab navigation ─────────────────────────────────────────────────────
  const sections = document.querySelectorAll('.a-section');
  const navItems = document.querySelectorAll('.a-nav-item[data-tab]');
  const sectionLoaders = {
    overview:      loadOverview,
    listings:      () => loadListings('pending'),
    users:         () => loadUsers('all'),
    reports:       () => loadReports('open'),
    categories:    loadCategories,
    announcements: loadAnnouncements,
    log:           loadLog,
  };
  let activeTab = 'overview';

  function switchTab(tab) {
    if (activeTab === tab) return;
    activeTab = tab;
    sections.forEach(s => s.classList.toggle('active', s.id === `tab-${tab}`));
    navItems.forEach(n => n.classList.toggle('active', n.dataset.tab === tab));
    sectionLoaders[tab]?.();
  }

  navItems.forEach(btn => btn.addEventListener('click', () => switchTab(btn.dataset.tab)));

  // Logout
  document.getElementById('logoutBtn')?.addEventListener('click', () => Auth.signOut());

  // ── Initial load ────────────────────────────────────────────────────────
  await loadOverview();
  updateNavBadges();

  // ── Listings filter row ─────────────────────────────────────────────────
  document.getElementById('listingsFilterRow')?.addEventListener('click', e => {
    const pill = e.target.closest('[data-status]');
    if (!pill) return;
    document.querySelectorAll('#listingsFilterRow .a-filter-pill').forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    loadListings(pill.dataset.status);
  });

  // Listings search
  let listingsSearchTimer;
  document.getElementById('listingsSearch')?.addEventListener('input', e => {
    clearTimeout(listingsSearchTimer);
    listingsSearchTimer = setTimeout(() => {
      const status = document.querySelector('#listingsFilterRow .a-filter-pill.active')?.dataset.status || 'pending';
      loadListings(status, e.target.value);
    }, 300);
  });

  // Select all checkbox
  document.getElementById('selectAll')?.addEventListener('change', e => {
    document.querySelectorAll('.row-cb').forEach(cb => { cb.checked = e.target.checked; });
    updateBulkBar();
  });

  // ── Users filter row ────────────────────────────────────────────────────
  document.getElementById('usersFilterRow')?.addEventListener('click', e => {
    const pill = e.target.closest('[data-status]');
    if (!pill) return;
    document.querySelectorAll('#usersFilterRow .a-filter-pill').forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    loadUsers(pill.dataset.status, document.getElementById('usersSearch')?.value || '');
  });

  let usersSearchTimer;
  document.getElementById('usersSearch')?.addEventListener('input', e => {
    clearTimeout(usersSearchTimer);
    usersSearchTimer = setTimeout(() => {
      const status = document.querySelector('#usersFilterRow .a-filter-pill.active')?.dataset.status || 'all';
      loadUsers(status, e.target.value);
    }, 300);
  });

  // ── Reports filter row ──────────────────────────────────────────────────
  document.getElementById('reportsFilterRow')?.addEventListener('click', e => {
    const pill = e.target.closest('[data-status]');
    if (!pill) return;
    document.querySelectorAll('#reportsFilterRow .a-filter-pill').forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    loadReports(pill.dataset.status);
  });
});

/* ─── Helpers ──────────────────────────────────────────────────────────────── */

const esc = s => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const fmtDate = s => s ? new Date(s).toLocaleDateString('en-ZA', { day:'numeric', month:'short', year:'numeric' }) : '—';
const fmtRel  = s => formatRelTime?.(s) ?? fmtDate(s);
const fmtMoney = v => (v === null || v === undefined) ? 'Quote' : `R${Number(v).toFixed(2)}`;

function statusBadge(status) {
  const labels = { pending:'Pending', approved:'Approved', rejected:'Rejected', featured:'Featured',
    active:'Active', suspended:'Suspended', open:'Open', resolved:'Resolved', inactive:'Inactive' };
  return `<span class="s-badge ${status}">${labels[status] || status}</span>`;
}

async function updateNavBadges() {
  try {
    const { pendingListings, openReports } = await api.get('/api/admin/stats');
    const pb = document.getElementById('pendingBadge');
    const rb = document.getElementById('reportsBadge');
    if (pb) { pb.textContent = pendingListings || 0; pb.style.display = pendingListings > 0 ? '' : 'none'; }
    if (rb) { rb.textContent = openReports || 0; rb.style.display = openReports > 0 ? '' : 'none'; }
    // Also update stat elements if already rendered
    ['stat-pending', 'stat-reports'].forEach(id => {
      const el = document.getElementById(id);
      if (el && el.textContent === '—') el.textContent = id === 'stat-pending' ? pendingListings : openReports;
    });
  } catch {}
}

/* ─── OVERVIEW ─────────────────────────────────────────────────────────────── */
async function loadOverview() {
  try {
    const [stats, { users: signups }, { log }] = await Promise.all([
      api.get('/api/admin/stats'),
      api.get('/api/admin/recent-signups?limit=8'),
      api.get('/api/admin/activity-log?limit=8'),
    ]);

    document.getElementById('stat-users').textContent    = stats.totalUsers   ?? 0;
    document.getElementById('stat-listings').textContent = stats.totalListings ?? 0;
    document.getElementById('stat-pending').textContent  = stats.pendingListings ?? 0;
    document.getElementById('stat-reports').textContent  = stats.openReports  ?? 0;
    document.getElementById('stat-orders').textContent   = stats.totalOrders  ?? 0;
    document.getElementById('stat-signups').textContent  = stats.newSignups   ?? 0;

    // Update nav badges
    const pb = document.getElementById('pendingBadge');
    const rb = document.getElementById('reportsBadge');
    if (pb) { pb.textContent = stats.pendingListings || 0; pb.style.display = stats.pendingListings > 0 ? '' : 'none'; }
    if (rb) { rb.textContent = stats.openReports || 0; rb.style.display = stats.openReports > 0 ? '' : 'none'; }

    // Recent signups
    document.getElementById('recentSignupsBody').innerHTML = signups.length ? signups.map(u => `
      <tr>
        <td>
          <div class="a-user-preview">
            <div class="a-user-av">${u.avatar_url ? `<img src="${esc(u.avatar_url)}" alt="">` : esc(initials(u.name))}</div>
            <div><div class="a-user-name">${esc(u.name)}</div><div class="a-user-email">${esc(u.email)}</div></div>
          </div>
        </td>
        <td>${esc(u.faculty || '—')}</td>
        <td>${u.is_verified ? '<span class="s-badge approved">✓ Verified</span>' : '<span class="s-badge inactive">Unverified</span>'}</td>
        <td>${fmtRel(u.created_at)}</td>
      </tr>`).join('') :
      '<tr><td colspan="4"><div class="a-empty"><div class="a-empty-icon">👥</div><p>No signups yet</p></div></td></tr>';

    // Activity feed
    document.getElementById('activityFeed').innerHTML = log.length ? log.map(entry => `
      <div class="a-activity-item">
        <div class="a-activity-dot"></div>
        <div class="a-activity-text">${esc(entry.admin_name || 'Admin')} <strong>${esc(formatAction(entry.action))}</strong>${entry.details?.title ? ` "${esc(entry.details.title)}"` : ''}</div>
        <div class="a-activity-time">${fmtRel(entry.created_at)}</div>
      </div>`).join('') :
      '<div class="a-empty"><div class="a-empty-icon">📋</div><p>No activity yet</p></div>';
  } catch (err) {
    showToast(err.message, 'error');
  }
}

/* ─── LISTINGS ─────────────────────────────────────────────────────────────── */
let selectedListingIds = new Set();

async function loadListings(status = 'pending', q = '') {
  const tbody = document.getElementById('listingsBody');
  tbody.innerHTML = '<tr><td colspan="8"><div class="a-empty"><div class="a-empty-icon">⏳</div><p>Loading…</p></div></td></tr>';
  selectedListingIds.clear();
  updateBulkBar();

  try {
    let url = `/api/admin/listings?status=${status}`;
    if (q) url += `&q=${encodeURIComponent(q)}`;
    const { listings } = await api.get(url);

    if (!listings.length) {
      tbody.innerHTML = '<tr><td colspan="8"><div class="a-empty"><div class="a-empty-icon">📋</div><h3>No listings found</h3><p>Try a different filter.</p></div></td></tr>';
      return;
    }

    tbody.innerHTML = listings.map(l => {
      const thumb = l.images?.[0]
        ? `<img class="a-listing-thumb" src="${esc(l.images[0])}" alt="">`
        : `<div class="a-listing-thumb-ph">${esc(categoryIcon(l.category))}</div>`;

      return `<tr>
        <td><input type="checkbox" class="row-cb" data-id="${esc(l.id)}" onchange="onRowCheck()"></td>
        <td>
          <div class="a-listing-preview">
            ${thumb}
            <div>
              <div class="a-listing-title" title="${esc(l.title)}">${esc(l.title)}</div>
              <div class="a-listing-meta">${esc(l.category)}</div>
            </div>
          </div>
        </td>
        <td>
          <div class="a-user-preview">
            <div class="a-user-av">${l.seller?.avatar_url ? `<img src="${esc(l.seller.avatar_url)}" alt="">` : esc(initials(l.seller?.name))}</div>
            <div><div class="a-user-name">${esc(l.seller?.name || '—')}</div></div>
          </div>
        </td>
        <td>${esc(l.category)}</td>
        <td>${fmtMoney(l.price)}</td>
        <td>${statusBadge(l.status || 'approved')}</td>
        <td>${fmtRel(l.created_at)}</td>
        <td>
          <div class="a-action-group">
            ${l.status !== 'approved' && l.status !== 'featured' ? `<button class="a-btn a-btn-success a-btn-sm" onclick="approveListing('${esc(l.id)}', this)">✓ Approve</button>` : ''}
            ${l.status !== 'rejected' ? `<button class="a-btn a-btn-danger a-btn-sm" onclick="rejectListing('${esc(l.id)}', '${esc(l.title)}')">✗ Reject</button>` : ''}
            ${l.status !== 'featured' ? `<button class="a-btn a-btn-feature a-btn-sm" onclick="featureListing('${esc(l.id)}', this)">★ Feature</button>` : ''}
            <button class="a-btn a-btn-ghost a-btn-sm" onclick="deleteListing('${esc(l.id)}', '${esc(l.title)}')">🗑</button>
          </div>
          ${l.moderation_note ? `<div style="font-size:.72rem;color:var(--coral);margin-top:4px">Note: ${esc(l.moderation_note)}</div>` : ''}
        </td>
      </tr>`;
    }).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="8" style="color:var(--coral);padding:16px">${esc(err.message)}</td></tr>`;
  }
}

function onRowCheck() {
  selectedListingIds.clear();
  document.querySelectorAll('.row-cb:checked').forEach(cb => selectedListingIds.add(cb.dataset.id));
  const all = document.querySelectorAll('.row-cb');
  document.getElementById('selectAll').checked = all.length > 0 && selectedListingIds.size === all.length;
  updateBulkBar();
}

function updateBulkBar() {
  const bar = document.getElementById('bulkBar');
  const count = document.getElementById('bulkCount');
  if (!bar || !count) return;
  const n = selectedListingIds.size;
  bar.classList.toggle('visible', n > 0);
  count.textContent = n;
}

function clearSelection() {
  selectedListingIds.clear();
  document.querySelectorAll('.row-cb, #selectAll').forEach(cb => { cb.checked = false; });
  updateBulkBar();
}

async function approveListing(id, btn) {
  btn.disabled = true;
  try {
    await api.patch(`/api/admin/listings/${id}/approve`);
    btn.closest('tr')?.remove();
    showToast('Listing approved.', 'success');
    updateNavBadges();
  } catch (err) { showToast(err.message, 'error'); btn.disabled = false; }
}

function rejectListing(id, title) {
  openModal('Reject Listing', `
    <p style="font-size:.875rem;color:var(--text-2);margin-bottom:14px">Rejecting: <strong>${esc(title)}</strong></p>
    <div class="a-form-group">
      <label class="a-form-label">Reason for rejection</label>
      <textarea class="a-form-input" id="rejectReason" placeholder="Explain why this listing is being rejected…"></textarea>
    </div>`, 'Reject', async () => {
    const reason = document.getElementById('rejectReason')?.value || 'Does not meet our guidelines.';
    try {
      await api.patch(`/api/admin/listings/${id}/reject`, { reason });
      document.querySelectorAll(`.row-cb[data-id="${id}"]`).forEach(cb => cb.closest('tr')?.remove());
      closeModal();
      showToast('Listing rejected.', 'success');
      updateNavBadges();
    } catch (err) { showToast(err.message, 'error'); }
  }, 'a-btn-danger');
}

async function featureListing(id, btn) {
  btn.disabled = true;
  try {
    await api.patch(`/api/admin/listings/${id}/feature`);
    const row = btn.closest('tr');
    if (row) {
      const statusCell = row.querySelector('.s-badge');
      if (statusCell) statusCell.outerHTML = statusBadge('featured');
    }
    btn.remove();
    showToast('Listing featured!', 'success');
  } catch (err) { showToast(err.message, 'error'); btn.disabled = false; }
}

function deleteListing(id, title) {
  openModal('Delete Listing', `<p style="font-size:.875rem;color:var(--text-2)">Permanently delete <strong>${esc(title)}</strong>? This cannot be undone.</p>`,
    'Delete', async () => {
    try {
      await api.delete(`/api/admin/listings/${id}`);
      document.querySelectorAll(`.row-cb[data-id="${id}"]`).forEach(cb => cb.closest('tr')?.remove());
      closeModal();
      showToast('Listing deleted.', 'success');
    } catch (err) { showToast(err.message, 'error'); }
  }, 'a-btn-danger');
}

async function bulkAction(action) {
  if (!selectedListingIds.size) return;
  try {
    await api.patch('/api/admin/listings/bulk', { ids: [...selectedListingIds], action });
    showToast(`${selectedListingIds.size} listing(s) ${action}d.`, 'success');
    clearSelection();
    const status = document.querySelector('#listingsFilterRow .a-filter-pill.active')?.dataset.status || 'pending';
    loadListings(status);
    updateNavBadges();
  } catch (err) { showToast(err.message, 'error'); }
}

function bulkReject() {
  if (!selectedListingIds.size) return;
  openModal('Bulk Reject', `
    <p style="font-size:.875rem;color:var(--text-2);margin-bottom:14px">Rejecting <strong>${selectedListingIds.size}</strong> listings.</p>
    <div class="a-form-group">
      <label class="a-form-label">Reason (applied to all)</label>
      <textarea class="a-form-input" id="bulkRejectReason" placeholder="Rejection reason…"></textarea>
    </div>`, 'Reject All', async () => {
    const reason = document.getElementById('bulkRejectReason')?.value || 'Does not meet our guidelines.';
    try {
      await api.patch('/api/admin/listings/bulk', { ids: [...selectedListingIds], action: 'reject', reason });
      closeModal();
      showToast(`${selectedListingIds.size} listing(s) rejected.`, 'success');
      clearSelection();
      loadListings(document.querySelector('#listingsFilterRow .a-filter-pill.active')?.dataset.status || 'pending');
      updateNavBadges();
    } catch (err) { showToast(err.message, 'error'); }
  }, 'a-btn-danger');
}

/* ─── USERS ────────────────────────────────────────────────────────────────── */
async function loadUsers(status = 'all', q = '') {
  const tbody = document.getElementById('usersBody');
  tbody.innerHTML = '<tr><td colspan="6"><div class="a-empty"><div class="a-empty-icon">⏳</div><p>Loading…</p></div></td></tr>';

  try {
    let url = `/api/admin/users?status=${status}`;
    if (q) url += `&q=${encodeURIComponent(q)}`;
    const { users } = await api.get(url);

    if (!users.length) {
      tbody.innerHTML = '<tr><td colspan="6"><div class="a-empty"><div class="a-empty-icon">👥</div><h3>No users found</h3></div></td></tr>';
      return;
    }

    tbody.innerHTML = users.map(u => `
      <tr>
        <td>
          <div class="a-user-preview">
            <div class="a-user-av">${u.avatar_url ? `<img src="${esc(u.avatar_url)}" alt="">` : esc(initials(u.name))}</div>
            <div><div class="a-user-name">${esc(u.name)}</div><div class="a-user-email">${esc(u.email)}</div></div>
          </div>
        </td>
        <td>${esc(u.faculty || '—')}</td>
        <td>${fmtRel(u.created_at)}</td>
        <td>${u.listing_count ?? 0}</td>
        <td>${u.is_suspended ? statusBadge('suspended') : statusBadge('active')}</td>
        <td>
          <div class="a-action-group">
            ${u.is_suspended
              ? `<button class="a-btn a-btn-success a-btn-sm" onclick="reactivateUser('${esc(u.id)}', '${esc(u.name)}', this)">↑ Reactivate</button>`
              : `<button class="a-btn a-btn-danger a-btn-sm" onclick="suspendUser('${esc(u.id)}', '${esc(u.name)}')">⊘ Suspend</button>`}
            <a class="a-btn a-btn-ghost a-btn-sm" href="/pages/profile.html?id=${esc(u.id)}" target="_blank">View</a>
          </div>
        </td>
      </tr>`).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" style="color:var(--coral);padding:16px">${esc(err.message)}</td></tr>`;
  }
}

function suspendUser(id, name) {
  openModal('Suspend User', `<p style="font-size:.875rem;color:var(--text-2)">Suspend <strong>${esc(name)}</strong>? They will no longer be able to access the platform.</p>`,
    'Suspend', async () => {
    try {
      await api.patch(`/api/admin/users/${id}/suspend`);
      closeModal();
      showToast('User suspended.', 'success');
      loadUsers(document.querySelector('#usersFilterRow .a-filter-pill.active')?.dataset.status || 'all');
    } catch (err) { showToast(err.message, 'error'); }
  }, 'a-btn-danger');
}

async function reactivateUser(id, name, btn) {
  btn.disabled = true;
  try {
    await api.patch(`/api/admin/users/${id}/reactivate`);
    showToast(`${name} reactivated.`, 'success');
    loadUsers(document.querySelector('#usersFilterRow .a-filter-pill.active')?.dataset.status || 'all');
  } catch (err) { showToast(err.message, 'error'); btn.disabled = false; }
}

/* ─── REPORTS ──────────────────────────────────────────────────────────────── */
async function loadReports(status = 'open') {
  const container = document.getElementById('reportsContainer');
  container.innerHTML = '<div class="a-empty"><div class="a-empty-icon">⏳</div><p>Loading…</p></div>';

  try {
    const { reports } = await api.get(`/api/admin/reports?status=${status}`);
    if (!reports.length) {
      container.innerHTML = '<div class="a-empty"><div class="a-empty-icon">🚩</div><h3>No reports found</h3><p>All clear!</p></div>';
      return;
    }
    container.innerHTML = reports.map(r => `
      <div class="a-report-card" id="report-${esc(r.id)}">
        <div class="a-report-header">
          <div>
            <div class="a-report-type">${esc(r.report_type || 'Content')} Issue</div>
            <div class="a-report-listing">${r.listing ? esc(r.listing.title) : 'Deleted listing'}</div>
          </div>
          <div style="display:flex;align-items:center;gap:8px">
            ${statusBadge(r.resolved ? 'resolved' : 'open')}
            <span style="font-size:.72rem;color:var(--text-3)">${fmtRel(r.created_at)}</span>
          </div>
        </div>
        <div class="a-report-reason">${esc(r.reason || 'No reason provided.')}</div>
        ${r.action_taken ? `<div style="font-size:.78rem;color:var(--text-3);margin-top:4px">Action taken: <strong>${esc(r.action_taken)}</strong></div>` : ''}
        ${!r.resolved ? `
        <div class="a-report-footer">
          <span class="a-report-meta">${r.listing ? `Listed by seller · ${r.listing.status || ''}` : ''}</span>
          <div class="a-action-group">
            <button class="a-btn a-btn-ghost a-btn-sm" onclick="dismissReport('${esc(r.id)}')">Dismiss</button>
            ${r.listing ? `<button class="a-btn a-btn-danger a-btn-sm" onclick="reportAction('${esc(r.id)}','reject_listing')">Reject Listing</button>` : ''}
            ${r.listing ? `<button class="a-btn a-btn-danger a-btn-sm" onclick="reportAction('${esc(r.id)}','suspend_user')">Suspend Seller</button>` : ''}
          </div>
        </div>` : ''}
      </div>`).join('');
  } catch (err) {
    container.innerHTML = `<div class="a-empty"><p style="color:var(--coral)">${esc(err.message)}</p></div>`;
  }
}

async function dismissReport(id) {
  try {
    await api.patch(`/api/admin/reports/${id}/dismiss`);
    document.getElementById(`report-${id}`)?.remove();
    showToast('Report dismissed.', 'success');
    updateNavBadges();
  } catch (err) { showToast(err.message, 'error'); }
}

function reportAction(id, action) {
  const label = action === 'reject_listing' ? 'Reject Listing' : 'Suspend Seller';
  openModal(`Take Action — ${label}`, `
    <div class="a-form-group">
      <label class="a-form-label">Reason / note</label>
      <textarea class="a-form-input" id="reportActionReason" placeholder="Optional reason…"></textarea>
    </div>`, label, async () => {
    const reason = document.getElementById('reportActionReason')?.value || '';
    try {
      await api.patch(`/api/admin/reports/${id}/action`, { action, reason });
      document.getElementById(`report-${id}`)?.remove();
      closeModal();
      showToast('Action taken.', 'success');
      updateNavBadges();
    } catch (err) { showToast(err.message, 'error'); }
  }, 'a-btn-danger');
}

/* ─── CATEGORIES ───────────────────────────────────────────────────────────── */
let categoriesData = [];

async function loadCategories() {
  const card = document.getElementById('categoriesCard');
  card.innerHTML = '<div class="a-empty"><div class="a-empty-icon">⏳</div><p>Loading…</p></div>';
  try {
    const { categories } = await api.get('/api/admin/categories');
    categoriesData = categories;
    renderCategories();
  } catch (err) {
    card.innerHTML = `<div class="a-empty"><p style="color:var(--coral)">${esc(err.message)}</p></div>`;
  }
}

function renderCategories() {
  const card = document.getElementById('categoriesCard');
  if (!categoriesData.length) {
    card.innerHTML = '<div class="a-empty"><div class="a-empty-icon">📚</div><h3>No categories yet</h3><p>Add your first category above.</p></div>';
    return;
  }
  card.innerHTML = categoriesData.map((c, i) => `
    <div class="a-cat-item" data-id="${esc(c.id)}">
      <div class="a-reorder-btns">
        <button class="a-reorder-btn" onclick="moveCat('${esc(c.id)}', -1)" ${i === 0 ? 'disabled' : ''}>▲</button>
        <button class="a-reorder-btn" onclick="moveCat('${esc(c.id)}', 1)" ${i === categoriesData.length - 1 ? 'disabled' : ''}>▼</button>
      </div>
      <div class="a-cat-icon">${esc(c.icon || '✨')}</div>
      <div class="a-cat-info">
        <div class="a-cat-name">${esc(c.name)}</div>
        <div class="a-cat-desc">${esc(c.description || 'No description')}</div>
      </div>
      <div class="a-action-group">
        <button class="a-btn a-btn-ghost a-btn-sm" onclick="editCategory('${esc(c.id)}')">Edit</button>
        <button class="a-btn a-btn-danger a-btn-sm" onclick="deleteCategory('${esc(c.id)}', '${esc(c.name)}')">Delete</button>
      </div>
    </div>`).join('');
}

async function moveCat(id, dir) {
  const i = categoriesData.findIndex(c => c.id === id);
  const j = i + dir;
  if (j < 0 || j >= categoriesData.length) return;
  [categoriesData[i], categoriesData[j]] = [categoriesData[j], categoriesData[i]];
  renderCategories();
  try {
    await api.patch('/api/admin/categories/reorder', { ids: categoriesData.map(c => c.id) });
  } catch (err) { showToast(err.message, 'error'); }
}

function openAddCategory() {
  openModal('Add Category', `
    <div class="a-form-group"><label class="a-form-label">Name *</label><input class="a-form-input" id="catName" placeholder="e.g. Photography"></div>
    <div class="a-form-group"><label class="a-form-label">Icon (emoji)</label><input class="a-form-input" id="catIcon" placeholder="📸" style="width:80px"></div>
    <div class="a-form-group"><label class="a-form-label">Description</label><textarea class="a-form-input" id="catDesc" placeholder="Short description…"></textarea></div>`,
    'Add Category', async () => {
    const name = document.getElementById('catName')?.value.trim();
    if (!name) { showToast('Name is required.', 'error'); return; }
    try {
      await api.post('/api/admin/categories', { name, icon: document.getElementById('catIcon')?.value || '✨', description: document.getElementById('catDesc')?.value || '' });
      closeModal();
      showToast('Category added.', 'success');
      loadCategories();
    } catch (err) { showToast(err.message, 'error'); }
  });
}

function editCategory(id) {
  const cat = categoriesData.find(c => c.id === id);
  if (!cat) return;
  openModal('Edit Category', `
    <div class="a-form-group"><label class="a-form-label">Name *</label><input class="a-form-input" id="catName" value="${esc(cat.name)}"></div>
    <div class="a-form-group"><label class="a-form-label">Icon</label><input class="a-form-input" id="catIcon" value="${esc(cat.icon || '✨')}" style="width:80px"></div>
    <div class="a-form-group"><label class="a-form-label">Description</label><textarea class="a-form-input" id="catDesc">${esc(cat.description || '')}</textarea></div>`,
    'Save Changes', async () => {
    const name = document.getElementById('catName')?.value.trim();
    if (!name) { showToast('Name is required.', 'error'); return; }
    try {
      await api.put(`/api/admin/categories/${id}`, { name, icon: document.getElementById('catIcon')?.value || cat.icon, description: document.getElementById('catDesc')?.value || '' });
      closeModal();
      showToast('Category updated.', 'success');
      loadCategories();
    } catch (err) { showToast(err.message, 'error'); }
  });
}

function deleteCategory(id, name) {
  openModal('Delete Category', `<p style="font-size:.875rem;color:var(--text-2)">Delete <strong>${esc(name)}</strong>? Existing listings in this category won't be affected.</p>`,
    'Delete', async () => {
    try {
      await api.delete(`/api/admin/categories/${id}`);
      closeModal();
      showToast('Category deleted.', 'success');
      loadCategories();
    } catch (err) { showToast(err.message, 'error'); }
  }, 'a-btn-danger');
}

/* ─── ANNOUNCEMENTS ────────────────────────────────────────────────────────── */
async function loadAnnouncements() {
  const card = document.getElementById('announcementsCard');
  card.innerHTML = '<div class="a-empty"><div class="a-empty-icon">⏳</div><p>Loading…</p></div>';
  try {
    const { announcements } = await api.get('/api/admin/announcements');
    if (!announcements.length) {
      card.innerHTML = '<div class="a-empty"><div class="a-empty-icon">📢</div><h3>No announcements yet</h3><p>Create one above.</p></div>';
      return;
    }
    card.innerHTML = announcements.map(a => `
      <div class="a-ann-item" id="ann-${esc(a.id)}">
        <div class="a-ann-dot ${a.is_active ? 'on' : 'off'}"></div>
        <div class="a-ann-body">
          <div class="a-ann-title">${esc(a.title)}</div>
          <div class="a-ann-content">${esc(a.content)}</div>
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
            ${a.is_active ? '<span class="s-badge active">Active</span>' : '<span class="s-badge inactive">Inactive</span>'}
            <span class="s-badge ${a.target_role === 'all' ? 'approved' : 'featured'}">${esc(targetRoleLabel(a.target_role))}</span>
            <span class="a-ann-meta">Created ${fmtRel(a.created_at)}</span>
          </div>
        </div>
        <div class="a-action-group" style="flex-shrink:0">
          <button class="a-btn a-btn-ghost a-btn-sm" onclick="editAnnouncement('${esc(a.id)}', ${JSON.stringify(a).replace(/"/g,'&quot;')})">Edit</button>
          ${a.is_active
            ? `<button class="a-btn a-btn-danger a-btn-sm" onclick="deactivateAnn('${esc(a.id)}')">Turn Off</button>`
            : `<button class="a-btn a-btn-success a-btn-sm" onclick="activateAnn('${esc(a.id)}')">Turn On</button>`}
          <button class="a-btn a-btn-ghost a-btn-sm" onclick="deleteAnn('${esc(a.id)}')">🗑</button>
        </div>
      </div>`).join('');
  } catch (err) {
    card.innerHTML = `<div class="a-empty"><p style="color:var(--coral)">${esc(err.message)}</p></div>`;
  }
}

function openAddAnnouncement() {
  openModal('New Announcement', announcementForm(), 'Publish', async () => {
    const title   = document.getElementById('annTitle')?.value.trim();
    const content = document.getElementById('annContent')?.value.trim();
    const role    = document.getElementById('annRole')?.value || 'all';
    if (!title || !content) { showToast('Title and content required.', 'error'); return; }
    try {
      await api.post('/api/admin/announcements', { title, content, target_role: role });
      closeModal();
      showToast('Announcement published.', 'success');
      loadAnnouncements();
    } catch (err) { showToast(err.message, 'error'); }
  });
}

function editAnnouncement(id, ann) {
  if (typeof ann === 'string') ann = JSON.parse(ann.replace(/&quot;/g, '"'));
  openModal('Edit Announcement', announcementForm(ann), 'Save Changes', async () => {
    const title   = document.getElementById('annTitle')?.value.trim();
    const content = document.getElementById('annContent')?.value.trim();
    const role    = document.getElementById('annRole')?.value || 'all';
    if (!title || !content) { showToast('Title and content required.', 'error'); return; }
    try {
      await api.put(`/api/admin/announcements/${id}`, { title, content, target_role: role });
      closeModal();
      showToast('Announcement updated.', 'success');
      loadAnnouncements();
    } catch (err) { showToast(err.message, 'error'); }
  });
}

function announcementForm(ann = {}) {
  return `
    <div class="a-form-group"><label class="a-form-label">Title *</label><input class="a-form-input" id="annTitle" value="${esc(ann.title || '')}" placeholder="e.g. Maintenance tonight"></div>
    <div class="a-form-group"><label class="a-form-label">Message *</label><textarea class="a-form-input" id="annContent" placeholder="Announcement message…">${esc(ann.content || '')}</textarea></div>
    <div class="a-form-group"><label class="a-form-label">Target audience</label>
      <select class="a-form-select" id="annRole">
        <option value="all" ${ann.target_role === 'all' ? 'selected' : ''}>All users</option>
        <option value="students" ${ann.target_role === 'students' ? 'selected' : ''}>Students only</option>
        <option value="admin" ${ann.target_role === 'admin' ? 'selected' : ''}>Admins only</option>
      </select>
    </div>`;
}

async function deactivateAnn(id) {
  try {
    await api.patch(`/api/admin/announcements/${id}/deactivate`);
    showToast('Announcement turned off.', 'success');
    loadAnnouncements();
  } catch (err) { showToast(err.message, 'error'); }
}

async function activateAnn(id) {
  try {
    await api.patch(`/api/admin/announcements/${id}/activate`);
    showToast('Announcement turned on.', 'success');
    loadAnnouncements();
  } catch (err) { showToast(err.message, 'error'); }
}

function deleteAnn(id) {
  openModal('Delete Announcement', '<p style="font-size:.875rem;color:var(--text-2)">Permanently delete this announcement?</p>',
    'Delete', async () => {
    try {
      await api.delete(`/api/admin/announcements/${id}`);
      closeModal();
      showToast('Announcement deleted.', 'success');
      loadAnnouncements();
    } catch (err) { showToast(err.message, 'error'); }
  }, 'a-btn-danger');
}

/* ─── ACTIVITY LOG ─────────────────────────────────────────────────────────── */
async function loadLog() {
  const tbody = document.getElementById('logBody');
  tbody.innerHTML = '<tr><td colspan="5"><div class="a-empty"><div class="a-empty-icon">⏳</div><p>Loading…</p></div></td></tr>';
  try {
    const { log } = await api.get('/api/admin/activity-log?limit=100');
    if (!log.length) {
      tbody.innerHTML = '<tr><td colspan="5"><div class="a-empty"><div class="a-empty-icon">📋</div><h3>No activity yet</h3></div></td></tr>';
      return;
    }
    tbody.innerHTML = log.map(entry => `
      <tr>
        <td>
          <div style="font-size:.875rem;font-weight:600">${esc(entry.admin_name || 'Admin')}</div>
        </td>
        <td><span style="font-size:.8rem;font-weight:600;text-transform:capitalize">${esc(formatAction(entry.action))}</span></td>
        <td><span style="font-size:.78rem;color:var(--text-3)">${esc(entry.target_type || '—')}</span></td>
        <td><div style="font-size:.75rem;color:var(--text-3);max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(detailsSummary(entry.details))}</div></td>
        <td><span style="font-size:.78rem;color:var(--text-3)">${fmtRel(entry.created_at)}</span></td>
      </tr>`).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" style="color:var(--coral);padding:16px">${esc(err.message)}</td></tr>`;
  }
}

/* ─── MODAL ────────────────────────────────────────────────────────────────── */
function openModal(title, bodyHtml, confirmText, onConfirm, confirmClass = 'a-btn-primary') {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').innerHTML = bodyHtml;
  const confirmBtn = document.getElementById('modalConfirmBtn');
  confirmBtn.textContent = confirmText;
  confirmBtn.className = `a-btn ${confirmClass}`;
  confirmBtn.onclick = onConfirm;
  document.getElementById('modalOverlay').classList.add('open');
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
}

document.getElementById('modalOverlay')?.addEventListener('click', e => {
  if (e.target === e.currentTarget) closeModal();
});

/* ─── Utility ──────────────────────────────────────────────────────────────── */
function initials(name = '') {
  const p = String(name).trim().split(' ');
  return ((p[0]?.[0] ?? '') + (p[1]?.[0] ?? '')).toUpperCase() || '?';
}

function categoryIcon(cat) {
  const icons = { Tutoring:'📚', 'Creative Arts':'🎨', 'Tech Support':'💻',
    'Food & Baking':'🍞', Photography:'📸', 'Hair & Beauty':'💄',
    Music:'🎵', Fitness:'🏋️', Writing:'✍️', Other:'✨' };
  return icons[cat] || '📦';
}

function formatAction(action = '') {
  return action.replace(/_/g, ' ');
}

function targetRoleLabel(role) {
  return { all:'All users', students:'Students', admin:'Admins' }[role] || role;
}

function detailsSummary(details) {
  if (!details || typeof details !== 'object') return '—';
  if (details.title) return `"${details.title}"`;
  if (details.name) return details.name;
  if (details.count) return `${details.count} items`;
  return JSON.stringify(details).slice(0, 60);
}

// ── Admin data export (CSV / PDF) ────────────────────────────────────────────
async function adminExport(type, format) {
  try {
    const { title, rows } = await api.get(`/api/reports/export?type=${type}`);
    if (!rows || !rows.length) { showToast('No data to export.', 'error'); return; }
    const date = new Date().toISOString().slice(0, 10);
    const slug = type.replace(/[^a-z0-9]+/gi, '-');

    if (format === 'csv') {
      const headers = Object.keys(rows[0]);
      const escape = (v) => {
        const s = String(v ?? '');
        return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
      };
      const csv = [headers.map(escape).join(','), ...rows.map(r => headers.map(k => escape(r[k])).join(','))].join('\n');
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
      a.download = `campusconnect-admin-${slug}-${date}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
    } else {
      const { jsPDF } = window.jspdf;
      const headers = Object.keys(rows[0]);
      const doc = new jsPDF({ orientation: headers.length > 5 ? 'landscape' : 'portrait' });
      const BRAND = [0, 201, 127];
      doc.setFillColor(...BRAND);
      doc.rect(0, 0, doc.internal.pageSize.getWidth(), 18, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.text('CampusConnect — Admin', 12, 12);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`Report: ${title}`, doc.internal.pageSize.getWidth() - 12, 12, { align: 'right' });
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(8);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 12, 24);
      doc.autoTable({
        startY: 28,
        head: [headers],
        body: rows.map(r => headers.map(k => r[k] ?? '')),
        styles: { fontSize: 7, cellPadding: 2.5 },
        headStyles: { fillColor: BRAND, textColor: [255, 255, 255], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [240, 255, 248] },
        margin: { left: 12, right: 12 },
      });
      doc.save(`campusconnect-admin-${slug}-${date}.pdf`);
    }
  } catch (err) {
    showToast(err.message || 'Export failed.', 'error');
  }
}