document.addEventListener('DOMContentLoaded', async () => {
  // Render categories
  const categoriesGrid = document.getElementById('categoriesGrid');
  if (categoriesGrid) {
    categoriesGrid.innerHTML = CATEGORIES.map(
      (c) => `<a class="cat-chip" href="/pages/browse.html?category=${encodeURIComponent(c.label)}">
        <span class="cat-icon">${c.icon}</span>${c.label}
      </a>`
    ).join('');
  }

  // Load featured listings
  const featuredGrid = document.getElementById('featuredListings');
  if (featuredGrid) {
    try {
      const { listings } = await api.get('/api/listings?sort=top-rated&limit=6');
      featuredGrid.innerHTML = listings.length
        ? listings.slice(0, 6).map(listingCardHtml).join('')
        : '<p style="color:var(--text-muted);grid-column:1/-1;text-align:center;padding:2rem">No listings yet — be the first to post!</p>';
    } catch (err) {
      featuredGrid.innerHTML = `<p style="color:var(--text-muted);grid-column:1/-1;text-align:center;padding:2rem">Could not load listings.</p>`;
    }
  }

  // Load top sellers
  const topSellersGrid = document.getElementById('topSellers');
  if (topSellersGrid) {
    try {
      const { leaderboard: topSellers } = await api.get('/api/leaderboard');
      topSellersGrid.innerHTML = (topSellers || []).length
        ? (topSellers || []).slice(0, 4).map((s) => `
            <a class="listing-card card-hover" href="/pages/profile.html?id=${s.sellerId}" style="display:block;text-decoration:none">
              <div class="listing-body" style="display:flex;align-items:center;gap:1rem;padding:1.5rem">
                ${avatarHtml({ avatar_url: s.avatarUrl, name: s.sellerName }, 'md')}
                <div style="flex:1;min-width:0">
                  <div style="font-weight:700;font-size:.97rem">${s.sellerName}</div>
                  <div style="font-size:.8rem;color:var(--text-secondary);margin:.2rem 0">${s.rankTitle || 'Member'}</div>
                  <div style="display:flex;align-items:center;gap:.5rem">
                    ${starsHtml(s.avgRating)}
                    <span style="font-size:.8rem;color:var(--text-muted)">${Number(s.avgRating||0).toFixed(1)}</span>
                  </div>
                </div>
                <div style="text-align:right;flex-shrink:0">
                  <div style="font-size:.75rem;color:var(--text-muted)">XP</div>
                  <div style="font-weight:800;font-size:1.1rem;color:var(--gold)">${s.xp||0}</div>
                </div>
              </div>
            </a>`).join('')
        : '<p style="color:var(--text-muted);grid-column:1/-1;text-align:center;padding:2rem">No sellers yet.</p>';
    } catch {
      topSellersGrid.innerHTML = '';
    }
  }

  // Load hero stats
  try {
    const { listings: all } = await api.get('/api/listings?limit=1');
    document.getElementById('statListings').textContent = all?.length ?? '—';
  } catch { /* non-critical */ }

  // AI Matchmaker
  const aiSearchBtn = document.getElementById('aiSearchBtn');
  const aiQuery     = document.getElementById('aiQuery');
  const aiResults   = document.getElementById('aiResults');

  const runAiSearch = async () => {
    const query = aiQuery?.value.trim();
    if (!query || !aiResults) return;
    aiResults.style.display = 'flex';
    aiResults.innerHTML = '<div class="spinner"></div>';
    try {
      const { matches } = await api.post('/api/ai/match', { query });
      if (!matches?.length) {
        aiResults.innerHTML = '<p style="color:var(--text-muted);font-size:.85rem">No matches found. Try a different request.</p>';
        return;
      }
      aiResults.innerHTML = matches.map((m) => `
        <a class="ai-result-card" href="/pages/listing.html?id=${m.listingId}" style="text-decoration:none;display:block">
          <div class="ai-result-top">
            <span class="ai-result-title">${m.title}</span>
            <span class="ai-result-price">${formatMoney(m.price)}</span>
          </div>
          <div class="ai-result-seller">${m.sellerName}</div>
          <div class="ai-result-reason">${m.reason || ''}</div>
        </a>`).join('');
    } catch (err) {
      aiResults.innerHTML = `<p style="color:var(--red);font-size:.85rem">${err.message}</p>`;
    }
  };

  aiSearchBtn?.addEventListener('click', runAiSearch);
  aiQuery?.addEventListener('keydown', (e) => { if (e.key === 'Enter') runAiSearch(); });
});
