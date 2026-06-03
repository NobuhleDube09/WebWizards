// ==================== EXPORT FUNCTIONS ====================

function downloadCSV(rows, filename) {
  if (!rows || !rows.length) { 
    if (typeof showToast === 'function') showToast('No data to export.', 'error');
    return; 
  }
  const headers = Object.keys(rows[0]);
  const escape = (v) => {
    const s = String(v ?? '');
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers.map(escape).join(','), ...rows.map(r => headers.map(k => escape(r[k])).join(','))].join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

// PDF Export Function
async function downloadPDF(rows, title, filename) {
  if (!rows || !rows.length) { 
    if (typeof showToast === 'function') showToast('No data to export.', 'error');
    return; 
  }
  
  // Check if jsPDF is loaded
  if (typeof window.jspdf === 'undefined') {
    if (typeof showToast === 'function') showToast('PDF library not loaded. Please refresh the page.', 'error');
    return;
  }
  
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ 
    orientation: rows.length > 0 && Object.keys(rows[0]).length > 6 ? 'landscape' : 'portrait',
    unit: 'mm',
    format: 'a4'
  });
  
  const BRAND = [0, 150, 100]; // CampusConnect green
  
  // Header
  doc.setFillColor(...BRAND);
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 18, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('CampusConnect', 14, 13);
  doc.setFontSize(10);
  doc.text(`Report: ${title}`, doc.internal.pageSize.getWidth() - 14, 13, { align: 'right' });
  
  // Date
  doc.setTextColor(80, 80, 80);
  doc.setFontSize(9);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 25);
  
  const headers = Object.keys(rows[0]);
  const bodyData = rows.map(r => headers.map(k => {
    let val = r[k] ?? '';
    if (typeof val === 'string' && val.match(/^\d{4}-\d{2}-\d{2}/)) {
      val = new Date(val).toLocaleDateString();
    }
    return String(val);
  }));
  
  doc.autoTable({
    startY: 32,
    head: [headers.map(h => h.replace(/_/g, ' ').toUpperCase())],
    body: bodyData,
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: BRAND, textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [240, 248, 240] },
    margin: { left: 14, right: 14 }
  });
  
  doc.save(filename);
}

// SINGLE runReport function (DELETE the duplicate!)
async function runReport(type, format, btnEl) {
  btnEl.disabled = true;
  const origText = btnEl.textContent;
  btnEl.textContent = format === 'csv' ? 'Generating CSV...' : 'Generating PDF...';
  
  try {
    const { title, rows } = await api.get(`/api/reports/export?type=${type}`);
    const date = new Date().toISOString().slice(0, 10);
    const slug = type.replace(/[^a-z0-9]+/gi, '-');
    
    if (format === 'csv') {
      downloadCSV(rows, `campusconnect-${slug}-${date}.csv`);
      if (typeof showToast === 'function') showToast(`${title} exported as CSV!`, 'success');
    } else if (format === 'pdf') {
      await downloadPDF(rows, title, `campusconnect-${slug}-${date}.pdf`);
      if (typeof showToast === 'function') showToast(`${title} exported as PDF!`, 'success');
    }
  } catch (err) {
    console.error('Export error:', err);
    if (typeof showToast === 'function') showToast(err.message || 'Export failed.', 'error');
  }
  
  btnEl.disabled = false;
  btnEl.textContent = origText;
}

function initReportsTab(isBuyer) {
  const grid = document.getElementById('reportsGrid');
  if (!grid) return;

  const reports = isBuyer
    ? [
        { type: 'bookings',  icon: '📅', label: 'My Bookings',       desc: 'All services you have booked' },
        { type: 'reviews',   icon: '⭐', label: 'Reviews Received',   desc: 'Reviews left on your profile' },
      ]
    : [
        { type: 'listings',  icon: '📋', label: 'My Listings',        desc: 'All services you have listed' },
        { type: 'orders',    icon: '📦', label: 'My Orders',          desc: 'All orders you have received' },
        { type: 'earnings',  icon: '💰', label: 'My Earnings',        desc: 'Completed orders & total earned' },
        { type: 'bookings',  icon: '📅', label: 'My Bookings Made',   desc: 'Services you booked from others' },
        { type: 'reviews',   icon: '⭐', label: 'Reviews Received',   desc: 'Reviews left on your services' },
      ];

  grid.innerHTML = reports.map(r => `
    <div style="background:#fff;border:1.5px solid #e5e7eb;border-radius:16px;padding:20px 20px 16px;display:flex;flex-direction:column;gap:10px">
      <div style="font-size:1.5rem">${r.icon}</div>
      <div>
        <div style="font-size:.92rem;font-weight:700;color:#111827;margin-bottom:2px">${r.label}</div>
        <div style="font-size:.78rem;color:#9ca3af">${r.desc}</div>
      </div>
      <div style="display:flex;gap:8px;margin-top:4px">
        <button class="rpt-btn" data-type="${r.type}" data-fmt="csv"
          style="flex:1;padding:8px 0;border-radius:8px;border:1.5px solid #e5e7eb;background:#fff;font-size:.8rem;font-weight:600;cursor:pointer;color:#374151;font-family:inherit">
          ⬇ CSV
        </button>
        <button class="rpt-btn" data-type="${r.type}" data-fmt="pdf"
          style="flex:1;padding:8px 0;border-radius:8px;border:none;background:#00C97F;color:#fff;font-size:.8rem;font-weight:600;cursor:pointer;font-family:inherit">
          ⬇ PDF
        </button>
      </div>
    </div>`).join('');

  grid.querySelectorAll('.rpt-btn').forEach(btn => {
    btn.addEventListener('click', () => runReport(btn.dataset.type, btn.dataset.fmt, btn));
  });
}
// ==================== RIGHT PANEL MESSAGES ====================

async function initMessagesPanel(me) {
  const convListEl = document.getElementById('dmConvList');
  const threadEl   = document.getElementById('dmThread');
  if (!convListEl) return;

  let allConvs     = [];
  let activeConvId = null;
  let rtChannel    = null;

  const esc = (s) => String(s ?? '').replace(/[<>&"']/g,
    c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c]));

  const initials = (name) =>
    (name || '?').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();

  const renderConvList = (convs) => {
    if (!convs.length) {
      convListEl.innerHTML = '<div class="dm-empty">No conversations yet.</div>';
      return;
    }
    convListEl.innerHTML = convs.map(c => {
      const isBuyer = c.buyer_id === me?.id;
      const role    = isBuyer ? 'buyer' : 'seller';
      const label   = isBuyer ? 'Buyer'  : 'Seller';
      return `
      <div class="dm-conv-item ${c.id === activeConvId ? 'active' : ''}" data-id="${c.id}">
        <div class="dm-conv-avatar">${initials(c.other_user?.name)}</div>
        <div class="dm-conv-info">
          <div class="dm-conv-name" style="display:flex;align-items:center;gap:5px">
            <span>${esc(c.other_user?.name || 'Student')}</span>
            <span class="dm-role-badge ${role}">${label}</span>
          </div>
          <div class="dm-conv-preview">${esc(c.last_message || 'No messages yet')}</div>
        </div>
      </div>`;
    }).join('');
    convListEl.querySelectorAll('.dm-conv-item').forEach(item => {
      item.addEventListener('click', () => openConv(item.dataset.id));
    });
  };

  const openConv = async (id) => {
    activeConvId = id;
    const conv = allConvs.find(c => c.id === id);
    convListEl.style.display = 'none';
    threadEl.style.display   = 'flex';
    threadEl.innerHTML = `
      <div class="dm-thread-header">
        <button class="dm-back-btn" id="dmBack">← Back</button>
        <span class="dm-thread-name">${esc(conv?.other_user?.name || 'Chat')}</span>
      </div>
      <div id="dmMessages" class="dm-messages">
        <div class="loading-wrap"><div class="spinner"></div></div>
      </div>
      <form id="dmForm" class="dm-input-row">
        <input type="text" id="dmInput" placeholder="Type a message…" autocomplete="off">
        <button type="submit" class="btn btn-primary btn-sm">Send</button>
      </form>`;

    document.getElementById('dmBack').addEventListener('click', () => {
      convListEl.style.display = '';
      threadEl.style.display   = 'none';
      activeConvId = null;
      unsubscribeRT();
    });

    try {
      const { messages } = await api.get(`/api/chat/conversations/${id}/messages`);
      const msgEl = document.getElementById('dmMessages');
      if (!msgEl) return;
      msgEl.innerHTML = messages.length
        ? messages.map(m => bubbleHtml(m)).join('')
        : '<div style="text-align:center;color:var(--text-3);padding:1rem;font-size:.8rem">Say hello! 👋</div>';
      msgEl.scrollTop = msgEl.scrollHeight;
    } catch (err) {
      const msgEl = document.getElementById('dmMessages');
      if (msgEl) msgEl.innerHTML = `<p style="color:var(--accent);text-align:center;padding:1rem;font-size:.8rem">${esc(err.message)}</p>`;
    }

    subscribeRT(id);

    document.getElementById('dmForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const inp     = document.getElementById('dmInput');
      const content = inp.value.trim();
      if (!content) return;
      inp.value = '';
      inp.focus();
      try {
        await api.post(`/api/chat/conversations/${id}/messages`, { content });
      } catch (err) {
        if (typeof showToast === 'function') showToast(err.message, 'error');
      }
    });
  };

  const bubbleHtml = (m) => {
    const isSelf = m.sender_id === me?.id;
    return `<div class="dm-bubble ${isSelf ? 'self' : 'other'}">${esc(m.content)}</div>`;
  };

  const appendBubble = (m) => {
    const msgEl = document.getElementById('dmMessages');
    if (!msgEl) return;
    const div = document.createElement('div');
    div.className = `dm-bubble ${m.sender_id === me?.id ? 'self' : 'other'}`;
    div.textContent = m.content;
    msgEl.appendChild(div);
    msgEl.scrollTop = msgEl.scrollHeight;
  };

  const subscribeRT = (convId) => {
    unsubscribeRT();
    rtChannel = window.sbClient
      .channel(`conv-${convId}`)
      .on('postgres_changes', {
        event:  'INSERT',
        schema: 'public',
        table:  'messages',
        filter: `conversation_id=eq.${convId}`,
      }, (payload) => appendBubble(payload.new))
      .subscribe();
  };

  const unsubscribeRT = () => {
    if (rtChannel) {
      window.sbClient.removeChannel(rtChannel);
      rtChannel = null;
    }
  };

  try {
    const { conversations } = await api.get('/api/chat/conversations');
    allConvs = conversations || [];
    renderConvList(allConvs);
  } catch (err) {
    convListEl.innerHTML = `<p style="color:var(--accent);padding:1rem;font-size:.8rem">${esc(err.message)}</p>`;
  }
}

// ==================== REVIEW MODAL ====================

let _reviewOrderId = null;
let _reviewRating  = 0;

function openReviewModal(orderId, listingTitle) {
  _reviewOrderId = orderId;
  _reviewRating  = 0;

  const modal   = document.getElementById('reviewModal');
  const sub     = document.getElementById('reviewModalSub');
  const content = document.getElementById('reviewContent');
  const stars   = document.querySelectorAll('#starPicker span');

  if (!modal) return;
  sub.textContent = listingTitle ? `for "${listingTitle}"` : '';
  content.value = '';
  stars.forEach(s => { s.style.color = '#e5e7eb'; });

  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

// ==================== MAIN DASHBOARD INITIALIZATION ====================

document.addEventListener('DOMContentLoaded', async () => {
  if (!window.Auth || !Auth.requireAuth()) return;

  const cachedProfile = localStorage.getItem('cc_profile');
  if (cachedProfile) {
    try {
      const p = JSON.parse(cachedProfile);
      if (p?.is_admin) { window.location.replace('/pages/admin.html'); return; }
    } catch {}
  }

  // ===== EXPORT BUTTONS =====
  const exportListingsBtn = document.getElementById('exportListingsBtn');
  if (exportListingsBtn) {
    exportListingsBtn.addEventListener('click', async () => {
      try {
        exportListingsBtn.disabled = true;
        exportListingsBtn.textContent = 'Downloading...';
        await window.api.exportListings();
        if (typeof showToast === 'function') showToast('Listings exported successfully!', 'success');
      } catch (error) {
        if (typeof showToast === 'function') showToast(error.message, 'error');
      } finally {
        exportListingsBtn.disabled = false;
        exportListingsBtn.textContent = '📊 Export Listings';
      }
    });
  }

  const exportOrdersBtn = document.getElementById('exportOrdersBtn');
  if (exportOrdersBtn) {
    exportOrdersBtn.addEventListener('click', async () => {
      try {
        exportOrdersBtn.disabled = true;
        exportOrdersBtn.textContent = 'Downloading...';
        await window.api.exportOrders();
        if (typeof showToast === 'function') showToast('Orders exported successfully!', 'success');
      } catch (error) {
        if (typeof showToast === 'function') showToast(error.message, 'error');
      } finally {
        exportOrdersBtn.disabled = false;
        exportOrdersBtn.textContent = '📋 Export Orders';
      }
    });
  }

  const exportEarningsBtn = document.getElementById('exportEarningsBtn');
  if (exportEarningsBtn) {
    exportEarningsBtn.addEventListener('click', async () => {
      try {
        exportEarningsBtn.disabled = true;
        exportEarningsBtn.textContent = 'Downloading...';
        await window.api.exportEarnings();
        if (typeof showToast === 'function') showToast('Earnings exported successfully!', 'success');
      } catch (error) {
        if (typeof showToast === 'function') showToast(error.message, 'error');
      } finally {
        exportEarningsBtn.disabled = false;
        exportEarningsBtn.textContent = '💰 Export Earnings';
      }
    });
  }

  // ===== REVIEW MODAL SETUP =====
  const modal  = document.getElementById('reviewModal');
  const close  = document.getElementById('reviewModalClose');
  const stars  = document.querySelectorAll('#starPicker span');
  const submit = document.getElementById('reviewSubmitBtn');

  if (modal) {
    const closeModal = () => {
      modal.style.display = 'none';
      document.body.style.overflow = '';
    };
    close?.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

    stars.forEach(star => {
      star.addEventListener('mouseenter', () => {
        const n = Number(star.dataset.star);
        stars.forEach(s => { s.style.color = Number(s.dataset.star) <= n ? '#f59e0b' : '#e5e7eb'; });
      });
      star.addEventListener('mouseleave', () => {
        stars.forEach(s => { s.style.color = Number(s.dataset.star) <= _reviewRating ? '#f59e0b' : '#e5e7eb'; });
      });
      star.addEventListener('click', () => {
        _reviewRating = Number(star.dataset.star);
        stars.forEach(s => { s.style.color = Number(s.dataset.star) <= _reviewRating ? '#f59e0b' : '#e5e7eb'; });
      });
    });

    submit?.addEventListener('click', async () => {
      const content = document.getElementById('reviewContent')?.value.trim();
      if (!_reviewRating) { 
        if (typeof showToast === 'function') showToast('Please select a star rating.', 'error');
        return; 
      }
      if (!content) { 
        if (typeof showToast === 'function') showToast('Please write a review.', 'error');
        return; 
      }

      submit.disabled = true;
      submit.textContent = 'Submitting…';
      try {
        await api.post('/api/reviews', { orderId: _reviewOrderId, rating: _reviewRating, content });
        if (typeof showToast === 'function') showToast('Review submitted! Thank you.', 'success');
        closeModal();
        setTimeout(() => window.location.reload(), 900);
      } catch (err) {
        if (typeof showToast === 'function') showToast(err.message, 'error');
        submit.disabled = false;
        submit.textContent = 'Submit review';
      }
    });
  }

  // ===== TAB SWITCHING =====
  const tabBtns   = document.querySelectorAll('.dash-nav-item[data-tab]');
  const tabPanels = document.querySelectorAll('.dashboard-tab');

  const switchTab = (name) => {
    tabBtns.forEach(b => b.classList.toggle('active', b.dataset.tab === name));
    tabPanels.forEach(p => {
      p.classList.toggle('active-tab', p.id === `tab-${name}`);
    });
  };

  tabBtns.forEach(btn => btn.addEventListener('click', () => switchTab(btn.dataset.tab)));

  document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    await Auth.signOut();
    window.location.href = '/';
  });

  // ===== DOM REFS =====
  const statsGrid      = document.getElementById('statsGrid');
  const recentActivity = document.getElementById('recentActivity');
  const myListings     = document.getElementById('myListings');
  const ordersList     = document.getElementById('ordersList');
  const bookingsList   = document.getElementById('bookingsList');
  const reviewsList    = document.getElementById('reviewsList');

  // ===== ORDER CARD RENDERER =====
  const statusBadge = (s) => {
    const map = { pending:'badge-yellow', accepted:'badge-teal', completed:'badge-teal', declined:'badge-red' };
    return `<span class="badge ${map[s] || 'badge-muted'}">${s}</span>`;
  };

  const orderCard = (o, isBuyer = false) => `
    <div class="order-card">
      <div class="order-card-header">
        ${statusBadge(o.status)}
        <span style="font-size:.78rem;color:var(--text-muted)">${formatRelTime(o.created_at)}</span>
      </div>
      <div style="font-weight:600;margin:.4rem 0">${o.listing?.title || 'Order #' + o.id.slice(0, 8)}</div>
      <div style="font-size:.83rem;color:var(--text-muted)">
        ${o.agreed_price ? `R${Number(o.agreed_price).toFixed(0)}` : 'Price TBD'} ·
        Deadline: ${o.deadline ? new Date(o.deadline).toLocaleDateString() : 'Not set'}
      </div>
      ${!isBuyer && o.status === 'pending' ? `
        <div class="flex gap-2 mt-3">
          <button class="btn btn-primary btn-sm accept-btn" data-id="${o.id}">Accept</button>
          <button class="btn btn-ghost btn-sm decline-btn" data-id="${o.id}">Decline</button>
        </div>` : ''}
      ${isBuyer && o.status === 'accepted' ? `
        <div class="mt-3">
          <button class="btn btn-primary btn-sm complete-btn" data-id="${o.id}">Mark complete</button>
        </div>` : ''}
    </div>`;

  let allOrders = [];

  const filterOrders = (status) => {
    const filtered = status === 'all' ? allOrders : allOrders.filter(o => o.status === status);
    ordersList.innerHTML = filtered.length
      ? `<div class="flex flex-col gap-3">${filtered.map(o => orderCard(o)).join('')}</div>`
      : `<p style="color:var(--text-muted);padding:2rem;text-align:center">No ${status === 'all' ? '' : status} orders.</p>`;
    bindOrderActions();
  };

  document.getElementById('orderTabs')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-status]');
    if (!btn) return;
    document.querySelectorAll('#orderTabs .tab-pill').forEach(p => p.classList.toggle('active', p === btn));
    filterOrders(btn.dataset.status);
  });

  const bindOrderActions = () => {
    document.querySelectorAll('.accept-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const values = await showPrompt([
          { id: 'scope',    label: 'Agreed scope',              placeholder: 'What will you deliver?' },
          { id: 'price',    label: 'Agreed price (R)',           placeholder: 'e.g. 250',  type: 'number' },
          { id: 'deadline', label: 'Deadline (YYYY-MM-DD)',      placeholder: 'e.g. 2026-06-30' },
        ]);
        if (!values) return;
        try {
          await api.patch(`/api/bookings/${btn.dataset.id}/respond`, {
            action: 'accept', agreedScope: values.scope,
            agreedPrice: values.price ? Number(values.price) : undefined,
            deadline: values.deadline || undefined,
          });
          if (typeof showToast === 'function') showToast('Order accepted!', 'success');
          setTimeout(() => window.location.reload(), 800);
        } catch (err) { if (typeof showToast === 'function') showToast(err.message, 'error'); }
      });
    });

    document.querySelectorAll('.decline-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const ok = await showConfirm('Decline this order?', { confirmText: 'Decline', danger: true });
        if (!ok) return;
        try {
          await api.patch(`/api/bookings/${btn.dataset.id}/respond`, { action: 'decline' });
          if (typeof showToast === 'function') showToast('Order declined.', 'success');
          setTimeout(() => window.location.reload(), 800);
        } catch (err) { if (typeof showToast === 'function') showToast(err.message, 'error'); }
      });
    });

    document.querySelectorAll('.complete-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const ok = await showConfirm('Mark this order as complete?', { confirmText: 'Mark complete' });
        if (!ok) return;
        try {
          await api.patch(`/api/bookings/${btn.dataset.id}/complete`, {});
          if (typeof showToast === 'function') showToast('Marked complete!', 'success');
          setTimeout(() => window.location.reload(), 800);
        } catch (err) { if (typeof showToast === 'function') showToast(err.message, 'error'); }
      });
    });
  };

  // ===== LOAD ALL DATA =====
  try {
    const [{ summary, listings, recentOrders, recentReviews }, buyerRes, reviewsMineRes, me] = await Promise.all([
      api.get('/api/dashboard/seller'),
      api.get('/api/bookings/mine?role=buyer').catch(() => ({ orders: [] })),
      api.get('/api/reviews/mine').catch(() => ({ reviews: [] })),
      Auth.getProfile(),
    ]);

    if (me) {
      const firstName = (me.name || 'there').split(' ')[0];
      const now = new Date();
      const h = now.getHours();
      const greeting = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
      const dateStr = now.toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase();

      const greetEl = document.getElementById('dashGreeting');
      const nameEl  = document.getElementById('dashWelcomeName');
      if (greetEl) greetEl.textContent = dateStr;
      if (nameEl)  nameEl.textContent  = `${greeting}, ${firstName}!`;

      const sidebarName = document.getElementById('sidebarName');
      const sidebarRank = document.getElementById('sidebarRank');
      const sidebarAv   = document.getElementById('sidebarAvatarWrap');
      if (sidebarName) sidebarName.textContent = me.name || '—';
      if (sidebarRank) sidebarRank.textContent = me.rank_title || '';
      if (sidebarAv)   sidebarAv.innerHTML     = avatarHtml(me, 'sm');

      if (me.is_admin) {
        const adminLink = document.getElementById('adminNavLink');
        if (adminLink) adminLink.style.display = '';
      }

      const profAv = document.getElementById('profileAvatarWrap');
      const profNm = document.getElementById('profileName');
      const profRk = document.getElementById('profileRank');
      const profMt = document.getElementById('profileMeta');
      if (profAv) profAv.innerHTML = avatarHtml(me, 'lg');
      if (profNm) profNm.textContent = me.name || '—';
      if (profRk) profRk.textContent = me.rank_title || 'Newcomer';
      if (profMt) profMt.textContent = [me.faculty, me.university].filter(Boolean).join(' · ') || '';

      const el = (id) => document.getElementById(id);
      if (el('pcListings')) el('pcListings').textContent = summary.activeListings ?? 0;
      if (el('pcRating'))   el('pcRating').textContent   = me.avg_rating ? Number(me.avg_rating).toFixed(1) + '★' : '—';
      if (el('pcXp'))       el('pcXp').textContent       = me.xp ?? 0;

      if (me.account_type === 'buyer') {
        document.querySelectorAll('.dash-nav-item[data-tab="listings"], .dash-nav-item[data-tab="orders"]')
          .forEach(el => el.style.display = 'none');
        document.querySelectorAll('.d-header-actions a[href*="listing-form"]')
          .forEach(el => el.style.display = 'none');
        const listingsTab = document.getElementById('tab-listings');
        if (listingsTab) {
          listingsTab.innerHTML = `
            <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:48px 24px;text-align:center;gap:16px">
              <div style="font-size:3rem">🛒</div>
              <h3 style="font-size:1.2rem;font-weight:800;color:#111827;margin:0">You're registered as a buyer</h3>
              <p style="font-size:.9rem;color:#4b5563;max-width:360px;margin:0;line-height:1.6">
                Buyers can browse and book services, but can't create listings.<br>
                To sell your skills, create a new account and select <strong>"Sell my skills"</strong>.
              </p>
              <a href="/pages/browse.html" class="d-btn primary" style="margin-top:8px">Browse services</a>
            </div>`;
        }
        const ordersTab = document.getElementById('tab-orders');
        if (ordersTab) {
          ordersTab.innerHTML = `
            <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:48px 24px;text-align:center;gap:12px">
              <p style="font-size:.9rem;color:#4b5563">Buyers don't receive orders — check your <strong>Bookings</strong> tab to see services you've booked.</p>
              <button class="d-btn primary" onclick="switchTab('bookings')">View my bookings</button>
            </div>`;
        }
      }
    }

    const isBuyer = me?.account_type === 'buyer';
    const buyerBookings = (buyerRes.orders || []).length;

    statsGrid.innerHTML = isBuyer ? `
      <div class="d-stat-card sc-coral">
        <div class="sc-blob"></div>
        <div class="sc-icon"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></div>
        <div class="sc-label">Services booked</div>
        <div class="sc-value">${buyerBookings}</div>
      </div>
      <div class="d-stat-card sc-teal">
        <div class="sc-blob"></div>
        <div class="sc-icon"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg></div>
        <div class="sc-label">Completed bookings</div>
        <div class="sc-value">${(buyerRes.orders || []).filter(o => o.status === 'completed').length}</div>
      </div>
      <div class="d-stat-card sc-purple">
        <div class="sc-blob"></div>
        <div class="sc-icon"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></div>
        <div class="sc-label">XP points</div>
        <div class="sc-value">${me?.xp ?? 0}</div>
      </div>
      <div class="d-stat-card sc-green">
        <div class="sc-blob"></div>
        <div class="sc-icon"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></div>
        <div class="sc-label">Reviews written</div>
        <div class="sc-value">${(reviewsMineRes.reviews || []).length}</div>
      </div>` :
      `<div class="d-stat-card sc-green">
        <div class="sc-blob"></div>
        <div class="sc-icon"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg></div>
        <div class="sc-label">Active listings</div>
        <div class="sc-value">${summary.activeListings}</div>
      </div>
      <div class="d-stat-card sc-gold">
        <div class="sc-blob"></div>
        <div class="sc-icon"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg></div>
        <div class="sc-label">Pending orders</div>
        <div class="sc-value">${summary.pendingOrders}</div>
      </div>
      <div class="d-stat-card sc-coral">
        <div class="sc-blob"></div>
        <div class="sc-icon"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></div>
        <div class="sc-label">Total earnings</div>
        <div class="sc-value">R${Number(summary.totalEarnings ?? 0).toFixed(0)}</div>
      </div>
      <div class="d-stat-card sc-purple">
        <div class="sc-blob"></div>
        <div class="sc-icon"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></div>
        <div class="sc-label">XP points</div>
        <div class="sc-value">${me?.xp ?? 0}</div>
      </div>`;

    document.getElementById('summaryRow').innerHTML = isBuyer ? `
      <div class="d-summary-card green" onclick="window.location='/pages/browse.html'" style="cursor:pointer">
        <div class="sc2-label"><svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>Browse services</div>
        <div class="sc2-value">∞</div>
        <div class="sc2-sub">Find a skill near you</div>
        <div class="sc2-arrow">›</div>
      </div>
      <div class="d-summary-card coral" data-tab-link="bookings">
        <div class="sc2-label"><svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>My bookings</div>
        <div class="sc2-value">${buyerBookings}</div>
        <div class="sc2-sub">Services booked</div>
        <div class="sc2-arrow">›</div>
      </div>
      <div class="d-summary-card gold" data-tab-link="reviews">
        <div class="sc2-label"><svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>Reviews</div>
        <div class="sc2-value">${(reviewsMineRes.reviews || []).length}</div>
        <div class="sc2-sub">Reviews you wrote</div>
        <div class="sc2-arrow">›</div>
      </div>` : `
      <div class="d-summary-card green" data-tab-link="listings">
        <div class="sc2-label"><svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>My listings</div>
        <div class="sc2-value">${listings.length}</div>
        <div class="sc2-sub">Active services</div>
        <div class="sc2-arrow">›</div>
      </div>
      <div class="d-summary-card gold" data-tab-link="orders">
        <div class="sc2-label"><svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>Incoming orders</div>
        <div class="sc2-value">${summary.pendingOrders}</div>
        <div class="sc2-sub">Awaiting response</div>
        <div class="sc2-arrow">›</div>
      </div>
      <div class="d-summary-card coral" data-tab-link="bookings">
        <div class="sc2-label"><svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>My bookings</div>
        <div class="sc2-value">${buyerBookings}</div>
        <div class="sc2-sub">Services booked</div>
        <div class="sc2-arrow">›</div>
      </div>`;

    document.querySelectorAll('[data-tab-link]').forEach(card => {
      card.addEventListener('click', () => switchTab(card.dataset.tabLink));
    });

    initMessagesPanel(me);
    initReportsTab(isBuyer);

    const recent = recentOrders.slice(0, 3);
    recentActivity.innerHTML = recent.length
      ? `<div class="d-section-header"><h3>Recent orders</h3><a href="#" data-tab-link="orders">View all →</a></div><div class="flex flex-col gap-3">${recent.map(o => orderCard(o)).join('')}</div>`
      : '';
    recentActivity.querySelectorAll('[data-tab-link]').forEach(a => {
      a.addEventListener('click', (e) => { e.preventDefault(); switchTab(a.dataset.tabLink); });
    });

    const dlCardHtml = (l) => {
      const img = l.images?.[0];
      const badge = l.is_available === false
        ? '<span style="position:absolute;top:8px;right:8px;background:#ef4444;color:#fff;font-size:.65rem;font-weight:700;padding:2px 7px;border-radius:6px">Unavailable</span>'
        : '<span style="position:absolute;top:8px;right:8px;background:#10b981;color:#fff;font-size:.65rem;font-weight:700;padding:2px 7px;border-radius:6px">Live</span>';
      const catBadge = `<span style="position:absolute;top:8px;left:8px;background:rgba(0,0,0,.45);color:#fff;font-size:.65rem;font-weight:600;padding:2px 7px;border-radius:6px">${l.category||''}</span>`;
      const priceLabel = l.price_type === 'negotiable' ? 'Negotiable' : l.price ? `R${Number(l.price).toFixed(0)}` : 'Free';
      return `
      <div class="dl-card">
        <div style="position:relative">
          ${img
            ? `<img class="dl-card-img" src="${img}" alt="${l.title}" loading="lazy">`
            : `<div class="dl-card-img-placeholder"><svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="M3 7h18M3 12h18M3 17h18"/></svg><span>${l.category||'Service'}</span></div>`
          }
          ${catBadge}${badge}
        </div>
        <div class="dl-card-body">
          <div class="dl-card-title">${l.title}</div>
          <div class="dl-card-meta">
            ${l.delivery_method ? `<span>📦 ${l.delivery_method}</span>` : ''}
            ${l.turnaround_time ? `<span>⏱ ${l.turnaround_time}</span>` : ''}
          </div>
          <div class="dl-card-price">${priceLabel}</div>
        </div>
        <div class="dl-card-actions">
          <button class="dl-action-btn dl-action-edit" data-id="${l.id}" onclick="window.location='/pages/listing-form.html?edit=${l.id}'">✏ Edit</button>
          <button class="dl-action-btn dl-action-toggle dl-toggle" data-id="${l.id}" data-avail="${l.is_available !== false}">${l.is_available === false ? '▶ Activate' : '⏸ Pause'}</button>
          <button class="dl-action-btn dl-action-delete dl-delete" data-id="${l.id}">🗑</button>
        </div>
      </div>`;
    };

    const bindListingActions = () => {
      document.querySelectorAll('.dl-toggle').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const id = btn.dataset.id;
          const nowAvail = btn.dataset.avail === 'true';
          try {
            await api.patch(`/api/listings/${id}`, { is_available: !nowAvail });
            if (typeof showToast === 'function') showToast(nowAvail ? 'Listing paused.' : 'Listing activated!', 'success');
            setTimeout(() => window.location.reload(), 600);
          } catch (err) { if (typeof showToast === 'function') showToast(err.message, 'error'); }
        });
      });
      document.querySelectorAll('.dl-delete').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const okDel = await showConfirm('Delete this listing? This cannot be undone.', { confirmText: 'Delete', danger: true });
          if (!okDel) return;
          try {
            await api.delete(`/api/listings/${btn.dataset.id}`);
            if (typeof showToast === 'function') showToast('Listing deleted.', 'success');
            setTimeout(() => window.location.reload(), 600);
          } catch (err) { if (typeof showToast === 'function') showToast(err.message, 'error'); }
        });
      });
    };

    myListings.innerHTML = listings.length
      ? `<div class="listings-grid">${listings.map(dlCardHtml).join('')}</div>`
      : `<div class="dl-empty">
          <div class="dl-empty-icon"><svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 7h18M3 12h18M3 17h18"/></svg></div>
          <h3>No listings yet</h3>
          <p>Share your skills and services with students on campus. Your first listing takes less than 2 minutes.</p>
          <a class="d-btn primary" href="/pages/listing-form.html">+ Create your first listing</a>
        </div>`;
    if (listings.length) bindListingActions();

    allOrders = recentOrders;
    filterOrders('all');

    const myBookings = buyerRes.orders || [];
    const reviewedOrderIds = new Set((reviewsMineRes.reviews || []).map(r => r.order_id));

    const bookingCard = (o) => {
      const canComplete = o.status === 'accepted';
      const canReview   = o.status === 'completed' && !reviewedOrderIds.has(o.id);
      const reviewed    = o.status === 'completed' && reviewedOrderIds.has(o.id);
      return `
        <div class="order-card">
          <div class="order-card-header">
            ${statusBadge(o.status)}
            <span style="font-size:.78rem;color:var(--text-muted)">${formatRelTime(o.created_at)}</span>
          </div>
          <div style="font-weight:600;margin:.4rem 0">
            ${o.listing?.title
              ? `<a href="/pages/listing.html?id=${o.listing_id}" style="text-decoration:none;color:inherit">${o.listing.title}</a>`
              : 'Order #' + o.id.slice(0,8)}
          </div>
          ${o.agreed_price ? `<div style="font-size:.83rem;color:var(--text-muted)">R${Number(o.agreed_price).toFixed(0)} · Deadline: ${o.deadline ? new Date(o.deadline).toLocaleDateString() : 'Not set'}</div>` : ''}
          ${o.buyer_message ? `<div style="font-size:.8rem;color:var(--text-3);margin-top:4px;font-style:italic">"${o.buyer_message}"</div>` : ''}
          <div class="flex gap-2 mt-3" style="flex-wrap:wrap">
            ${canComplete ? `<button class="btn btn-primary btn-sm complete-btn" data-id="${o.id}">Mark complete</button>` : ''}
            ${canReview   ? `<button class="btn btn-primary btn-sm review-btn" data-id="${o.id}" data-title="${(o.listing?.title||'').replace(/"/g,'&quot;')}">Leave review</button>` : ''}
            ${reviewed    ? `<span style="font-size:.78rem;color:var(--primary-d);font-weight:600;display:flex;align-items:center;gap:4px">&#10003; Reviewed</span>` : ''}
            <a href="/pages/inbox.html?sellerId=${o.seller_id}" class="btn btn-ghost btn-sm">Message seller</a>
          </div>
        </div>`;
    };

    const renderBookings = (status) => {
      const list = status === 'all' ? myBookings : myBookings.filter(o => o.status === status);
      bookingsList.innerHTML = list.length
        ? `<div class="flex flex-col gap-3">${list.map(bookingCard).join('')}</div>`
        : `<p style="color:var(--text-muted);padding:2rem;text-align:center">No ${status === 'all' ? '' : status + ' '}bookings yet. <a href="/pages/browse.html" style="color:var(--primary-d)">Browse services →</a></p>`;
      bookingsList.querySelectorAll('.complete-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const okComplete = await showConfirm('Mark this order as complete? This will allow you to leave a review.', { confirmText: 'Mark complete' });
          if (!okComplete) return;
          try {
            await api.patch(`/api/bookings/${btn.dataset.id}/complete`, {});
            if (typeof showToast === 'function') showToast('Marked complete! You can now leave a review.', 'success');
            setTimeout(() => window.location.reload(), 700);
          } catch (err) { if (typeof showToast === 'function') showToast(err.message, 'error'); }
        });
      });
      bookingsList.querySelectorAll('.review-btn').forEach(btn => {
        btn.addEventListener('click', () => openReviewModal(btn.dataset.id, btn.dataset.title));
      });
    };

    renderBookings('all');

    document.getElementById('bookingTabs')?.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-bstatus]');
      if (!btn) return;
      document.querySelectorAll('#bookingTabs .tab-pill').forEach(p => p.classList.toggle('active', p === btn));
      renderBookings(btn.dataset.bstatus);
    });

    reviewsList.innerHTML = recentReviews.length
      ? recentReviews.map(r => `
          <div class="review-card mb-2">
            <div class="review-header">
              ${avatarHtml(r.buyer || {}, 'xs')}
              <div>
                <span class="review-name">${r.buyer?.name || 'Buyer'}</span>
                <div>${starsHtml(r.rating)}</div>
              </div>
              <span style="margin-left:auto;font-size:.78rem;color:var(--text-muted)">${formatRelTime(r.created_at)}</span>
            </div>
            <p class="review-body">${r.content || ''}</p>
            ${r.seller_reply ? `<p class="review-reply" style="font-size:.8rem;color:var(--primary-d);border-left:3px solid var(--primary);padding-left:.75rem;margin-top:.5rem">Your reply: ${r.seller_reply}</p>` : ''}
          </div>`).join('')
      : '<p style="color:var(--text-muted);padding:2rem;text-align:center">No reviews received yet.</p>';

    const writtenEl = document.getElementById('reviewsWrittenList');
    const myWrittenReviews = reviewsMineRes.reviews || [];
    if (writtenEl) {
      writtenEl.innerHTML = myWrittenReviews.length
        ? myWrittenReviews.map(r => `
            <div class="review-card mb-2">
              <div class="review-header">
                <div>
                  <span class="review-name" style="font-weight:700">${r.listing?.title || 'Service'}</span>
                  <div>${starsHtml(r.rating)}</div>
                </div>
                <span style="margin-left:auto;font-size:.78rem;color:var(--text-muted)">${formatRelTime(r.created_at)}</span>
              </div>
              <p class="review-body">${r.content || ''}</p>
              ${r.seller_reply ? `<p style="font-size:.8rem;color:var(--text-2);border-left:3px solid var(--border);padding-left:.75rem;margin-top:.5rem;font-style:italic">Seller replied: ${r.seller_reply}</p>` : ''}
            </div>`).join('')
        : '<p style="color:var(--text-muted);padding:2rem;text-align:center">You have not written any reviews yet.</p>';
    }

    document.getElementById('reviewViewTabs')?.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-rview]');
      if (!btn) return;
      document.querySelectorAll('#reviewViewTabs .tab-pill').forEach(p => p.classList.toggle('active', p === btn));
      if (btn.dataset.rview === 'received') {
        reviewsList.style.display = '';
        if (writtenEl) writtenEl.style.display = 'none';
      } else {
        reviewsList.style.display = 'none';
        if (writtenEl) writtenEl.style.display = '';
      }
    });

    if (me) {
      document.querySelectorAll('#settingsName').forEach(el  => { el.value = me.name || ''; });
      document.querySelectorAll('#settingsBio').forEach(el   => { el.value = me.bio  || ''; });
      document.querySelectorAll('#settingsSkills').forEach(el => { el.value = (me.skills || []).join(', '); });
      document.querySelectorAll('#settingsUni').forEach(el   => { el.value = me.faculty || me.university || ''; });
      document.querySelectorAll('#settingsYear').forEach(el  => { el.value = me.year_of_study || ''; });
      document.querySelectorAll('#avatarPreview').forEach(el => { el.innerHTML = avatarHtml(me, 'sm'); });
    }

  } catch (err) {
    statsGrid.innerHTML = `<div style="color:var(--red);padding:1rem">${err.message}</div>`;
  }

  const applyUserUpdate = (u) => {
    const sn = document.getElementById('sidebarName');
    const sr = document.getElementById('sidebarRank');
    if (sn) sn.textContent = u.name || '—';
    if (sr) sr.textContent = u.rank_title || '';

    const profNm = document.getElementById('profileName');
    const profRk = document.getElementById('profileRank');
    if (profNm) profNm.textContent = u.name || '—';
    if (profRk) profRk.textContent = u.rank_title || 'Newcomer';

    const h = new Date().getHours();
    const greeting = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
    const firstName = (u.name || 'there').split(' ')[0];
    document.querySelectorAll('#dashWelcomeName').forEach(el => {
      el.textContent = `${greeting}, ${firstName}!`;
    });

    if (u.avatar_url) {
      const imgTag = (sz) => `<img class="avatar avatar-${sz}" src="${u.avatar_url}" alt="${u.name || ''}">`;
      const initTag = (sz) => `<span class="avatar avatar-${sz} avatar-init">${(u.name||'?').split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase()}</span>`;
      const tag = (sz) => u.avatar_url ? imgTag(sz) : initTag(sz);
      document.querySelectorAll('#sidebarAvatarWrap').forEach(el => { el.innerHTML = tag('sm'); });
      const profAv = document.getElementById('profileAvatarWrap');
      if (profAv) profAv.innerHTML = tag('lg');
      document.querySelectorAll('#avatarPreview').forEach(el => { el.innerHTML = tag('sm'); });
    }
  };

  document.getElementById('settingsForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('saveSettingsBtn');
    btn.disabled = true;
    try {
      const { user: updated } = await api.put('/api/profile', {
        name:         document.getElementById('settingsName').value.trim(),
        university:   document.getElementById('settingsUni')?.value.trim(),
        bio:          document.getElementById('settingsBio').value.trim(),
        skills:       document.getElementById('settingsSkills').value,
        year_of_study: document.getElementById('settingsYear')?.value ? Number(document.getElementById('settingsYear').value) : undefined,
      });
      if (typeof showToast === 'function') showToast('Settings saved!', 'success');
      if (updated) {
        localStorage.setItem('cc_profile', JSON.stringify(updated));
        applyUserUpdate(updated);
        document.querySelectorAll('#settingsName').forEach(el  => { el.value = updated.name || ''; });
        document.querySelectorAll('#settingsBio').forEach(el   => { el.value = updated.bio  || ''; });
        document.querySelectorAll('#settingsSkills').forEach(el => { el.value = (updated.skills || []).join(', '); });
        document.querySelectorAll('#settingsUni').forEach(el   => { el.value = updated.faculty || updated.university || ''; });
        document.querySelectorAll('#settingsYear').forEach(el  => { el.value = updated.year_of_study || ''; });
      }
    } catch (err) {
      if (typeof showToast === 'function') showToast(err.message, 'error');
    }
    btn.disabled = false;
  });

  document.getElementById('avatarInput')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!ALLOWED.includes(file.type)) {
      if (typeof showToast === 'function') showToast('Please choose a JPEG, PNG, WebP, or GIF image.', 'error');
      e.target.value = '';
      return;
    }
    const fd = new FormData();
    fd.append('avatar', file);
    try {
      const { user: updated } = await api.upload('/api/profile/avatar', fd);
      if (updated?.avatar_url) {
        updated.avatar_url = updated.avatar_url.split('?')[0] + '?t=' + Date.now();
      }
      if (typeof showToast === 'function') showToast('Avatar updated!', 'success');
      if (updated) {
        localStorage.setItem('cc_profile', JSON.stringify(updated));
        applyUserUpdate(updated);
      }
      e.target.value = '';
    } catch (err) {
      if (typeof showToast === 'function') showToast(err.message, 'error');
    }
  });
});