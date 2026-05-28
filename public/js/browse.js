document.addEventListener('DOMContentLoaded', async () => {
  const grid          = document.getElementById('listingsGrid');
  const searchInput   = document.getElementById('searchInput');
  const sortSelect    = document.getElementById('sortSelect');
  const categoryPills = document.getElementById('categoryPills');

  let activeCategory = new URLSearchParams(window.location.search).get('category') || '';
  let debounceTimer;

  // Render category filter pills
  CATEGORIES.forEach((c) => {
    const btn = document.createElement('button');
    btn.className = `b-cat-pill${activeCategory === c.label ? ' active' : ''}`;
    btn.dataset.cat = c.label;
    btn.textContent = c.label;
    categoryPills.appendChild(btn);
  });

  categoryPills.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-cat]');
    if (!btn) return;
    activeCategory = btn.dataset.cat;
    categoryPills.querySelectorAll('.b-cat-pill').forEach((p) =>
      p.classList.toggle('active', p.dataset.cat === activeCategory)
    );
    load();
  });

  const resultsCount = document.getElementById('resultsCount');

  const load = async () => {
    grid.innerHTML = '<div class="loading-wrap"><div class="spinner"></div></div>';
    if (resultsCount) resultsCount.innerHTML = '&nbsp;';
    const params = new URLSearchParams();
    const q = searchInput.value.trim();
    if (q) params.set('q', q);
    if (activeCategory) params.set('category', activeCategory);
    const sort = sortSelect.value;
    if (sort) params.set('sort', sort);

    try {
      const { listings } = await api.get(`/api/listings?${params}`);
      if (listings.length) {
        grid.innerHTML = listings.map(listingCardHtml).join('');
        if (resultsCount) resultsCount.innerHTML = `<strong>${listings.length}</strong> service${listings.length !== 1 ? 's' : ''} found`;
      } else {
        const hasFilter = q || activeCategory;
        grid.innerHTML = `
          <div class="b-empty">
            <div class="b-empty-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24"
                   fill="none" stroke="currentColor" stroke-width="1.8"
                   stroke-linecap="round" stroke-linejoin="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </div>
            <h3>No services found</h3>
            <p>${hasFilter ? 'Try adjusting your search or filters \u2014 or be the first to list a service in this category!' : 'No services have been listed yet. Be the first to offer yours!'}</p>
          </div>`;
        if (resultsCount) resultsCount.innerHTML = '0 services found';
      }
    } catch (err) {
      grid.innerHTML = `
        <div class="b-empty">
          <div class="b-empty-icon" style="background:rgba(239,68,68,.1);color:#ef4444">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24"
                 fill="none" stroke="currentColor" stroke-width="1.8"
                 stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          <h3>Something went wrong</h3>
          <p>${err.message}</p>
        </div>`;
    }
  };

  searchInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(load, 400);
  });

  sortSelect.addEventListener('change', load);

  await load();

  // ── Real-time: new / updated listings appear instantly ──────────────────
  if (window.sbClient) {
    let realtimeBanner = null;

    const showNewListingBanner = () => {
      if (realtimeBanner) return; // already showing
      realtimeBanner = document.createElement('div');
      realtimeBanner.id = 'rt-banner';
      realtimeBanner.innerHTML = `
        <span>🔔 New services just listed!</span>
        <button id="rt-refresh-btn">Refresh now</button>
        <button id="rt-dismiss-btn" aria-label="Dismiss">✕</button>`;
      realtimeBanner.style.cssText = `
        position:fixed;top:72px;left:50%;transform:translateX(-50%);
        background:#00C97F;color:#fff;padding:10px 18px;border-radius:999px;
        display:flex;align-items:center;gap:12px;font-size:.88rem;font-weight:600;
        box-shadow:0 4px 18px rgba(0,201,127,.35);z-index:9999;
        animation:rtSlideIn .3s ease;white-space:nowrap;`;
      document.head.insertAdjacentHTML('beforeend',
        `<style>@keyframes rtSlideIn{from{opacity:0;transform:translateX(-50%) translateY(-16px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}</style>`);
      document.body.appendChild(realtimeBanner);

      document.getElementById('rt-refresh-btn').addEventListener('click', () => {
        dismissBanner();
        load();
      });
      document.getElementById('rt-dismiss-btn').addEventListener('click', dismissBanner);

      // Auto-dismiss after 8 s
      setTimeout(dismissBanner, 8000);
    };

    const dismissBanner = () => {
      if (realtimeBanner) { realtimeBanner.remove(); realtimeBanner = null; }
    };

    window.sbClient
      .channel('public:listings-browse')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'listings' }, () => {
        // If no active search/filter, reload silently; otherwise show banner
        const hasFilter = searchInput.value.trim() || activeCategory;
        if (hasFilter) {
          showNewListingBanner();
        } else {
          dismissBanner();
          load();
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'listings' }, () => {
        dismissBanner();
        load();
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'listings' }, () => {
        dismissBanner();
        load();
      })
      .subscribe();
  }
});
