document.addEventListener('DOMContentLoaded', async () => {
  const podium  = document.getElementById('podium');
  const lbList  = document.getElementById('lbList');
  const lbTabs  = document.getElementById('lbTabs');

  let data      = [];
  let metric    = 'earnings';

  const medalColors = ['var(--gold)', 'rgba(192,192,210,0.9)', 'rgba(184,115,51,0.9)'];
  const medalIcons  = ['1st', '2nd', '3rd'];

  const renderPodium = (rows) => {
    const top3 = rows.slice(0, 3);
    const order = top3.length >= 3 ? [top3[1], top3[0], top3[2]] : top3;
    const heights = ['80px', '110px', '60px'];
    podium.innerHTML = order.map((s, i) => {
      const origIdx = i === 0 ? 1 : i === 1 ? 0 : 2;
      return `
        <div style="display:flex;flex-direction:column;align-items:center;gap:.5rem">
          ${avatarHtml(s, 'sm')}
          <div style="font-weight:700;font-size:.85rem;max-width:80px;text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${s.sellerName}</div>
          <div style="width:72px;height:${heights[origIdx]};background:${medalColors[origIdx]};border-radius:8px 8px 0 0;display:flex;align-items:center;justify-content:center;font-size:1.5rem">${medalIcons[origIdx]}</div>
        </div>`;
    }).join('');
  };

  const renderList = (rows) => {
    if (!rows.length) {
      lbList.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:2rem">No leaderboard data yet this month.</p>';
      return;
    }
    lbList.innerHTML = `
      <table style="width:100%;border-collapse:collapse">
        <thead>
          <tr style="border-bottom:1px solid var(--border)">
            <th style="padding:.75rem 1.25rem;font-size:.78rem;color:var(--text-muted);font-weight:600;text-align:left">#</th>
            <th style="padding:.75rem 1rem;font-size:.78rem;color:var(--text-muted);font-weight:600;text-align:left">Seller</th>
            <th style="padding:.75rem 1rem;font-size:.78rem;color:var(--text-muted);font-weight:600;text-align:right">Orders</th>
            <th style="padding:.75rem 1rem;font-size:.78rem;color:var(--text-muted);font-weight:600;text-align:right">Rating</th>
            <th style="padding:.75rem 1rem;font-size:.78rem;color:var(--text-muted);font-weight:600;text-align:right">Earnings</th>
            <th style="padding:.75rem 1.25rem;font-size:.78rem;color:var(--text-muted);font-weight:600;text-align:right">XP</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map((s, i) => `
            <tr style="border-bottom:1px solid var(--border);transition:background .15s" onmouseenter="this.style.background='rgba(255,255,255,0.03)'" onmouseleave="this.style.background=''">
              <td style="padding:.85rem 1.25rem;font-weight:700;color:${i < 3 ? medalColors[i] : 'var(--text-muted)'}">${i < 3 ? medalIcons[i] : `#${i+1}`}</td>
              <td style="padding:.85rem 1rem">
                <a href="/pages/profile.html?id=${s.sellerId}" style="display:flex;align-items:center;gap:.6rem;text-decoration:none;color:inherit">
                  ${avatarHtml({ avatar_url: s.avatarUrl, name: s.sellerName }, 'xs')}
                  <div>
                    <div style="font-weight:600;font-size:.9rem">${s.sellerName}</div>
                    <div style="font-size:.75rem;color:var(--text-muted)">${s.rankTitle}</div>
                  </div>
                </a>
              </td>
              <td style="padding:.85rem 1rem;text-align:right;font-size:.88rem">${s.completedOrders}</td>
              <td style="padding:.85rem 1rem;text-align:right;font-size:.88rem">${starsHtml(s.avgRating)} <span style="color:var(--text-muted)">${Number(s.avgRating).toFixed(1)}</span></td>
              <td style="padding:.85rem 1rem;text-align:right;font-weight:700;color:var(--teal)">R${Number(s.totalEarnings).toFixed(0)}</td>
              <td style="padding:.85rem 1.25rem;text-align:right;font-weight:800;color:var(--gold)">${s.xp}</td>
            </tr>`).join('')}
        </tbody>
      </table>`;
  };

  const sortAndRender = () => {
    const sorted = [...data].sort((a, b) => {
      if (metric === 'rating')   return b.avgRating - a.avgRating;
      if (metric === 'orders')   return b.completedOrders - a.completedOrders;
      return b.totalEarnings - a.totalEarnings;
    });
    renderPodium(sorted);
    renderList(sorted);
  };

  lbTabs.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-metric]');
    if (!btn) return;
    metric = btn.dataset.metric;
    lbTabs.querySelectorAll('.tab-pill').forEach((p) => p.classList.toggle('active', p === btn));
    sortAndRender();
  });

  try {
    const { leaderboard } = await api.get('/api/leaderboard');
    data = leaderboard || [];
    sortAndRender();
  } catch (err) {
    lbList.innerHTML = `<p style="color:var(--red);text-align:center;padding:2rem">${err.message}</p>`;
  }
});
