document.addEventListener('DOMContentLoaded', async () => {
  const content  = document.getElementById('listingContent');
  const template = document.getElementById('listingTemplate');
  const listingId = new URLSearchParams(window.location.search).get('id');

  if (!listingId) {
    content.innerHTML = '<p style="color:var(--red);text-align:center;padding:3rem">No listing ID in URL.</p>';
    return;
  }

  try {
    const { listing, reviews } = await api.get(`/api/listings/${listingId}`);
    const seller = listing.seller || {};
    const images = listing.images || [];

    // Clone template
    const node = template.content.cloneNode(true);

    // Main image
    const mainImg = node.querySelector('#mainImg');
    mainImg.src = images[0] || '';
    mainImg.alt = listing.title;
    if (!images[0]) {
      node.querySelector('#galleryWrap').style.display = 'none';
    }

    // Thumbnails
    const thumbsEl = node.querySelector('#thumbs');
    if (images.length > 1) {
      images.forEach((src, i) => {
        const img = document.createElement('img');
        img.src = src;
        img.style.cssText = `width:64px;height:64px;object-fit:cover;border-radius:8px;cursor:pointer;border:2px solid ${i===0?'#00C97F':'#e5e7eb'};flex-shrink:0`;
        img.addEventListener('click', () => {
          mainImg.src = src;
          thumbsEl.querySelectorAll('img').forEach(t => t.style.borderColor = '#e5e7eb');
          img.style.borderColor = '#00C97F';
        });
        thumbsEl.appendChild(img);
      });
    } else {
      thumbsEl.style.display = 'none';
    }

    // Header section
    node.querySelector('#listingTitle').textContent = listing.title || '';
    const catBadge = node.querySelector('#listingCatBadge');
    catBadge.textContent = listing.category || '';

    const availBadge = node.querySelector('#listingAvailBadge');
    if (listing.is_available === false) {
      availBadge.textContent = 'Unavailable';
      availBadge.style.cssText += ';background:#fee2e2;color:#dc2626;border:1px solid rgba(220,38,38,.2)';
    } else {
      availBadge.textContent = 'Available';
      availBadge.style.cssText += ';background:#e6fff4;color:#00965d;border:1px solid rgba(0,201,127,.2)';
    }

    const headerRating = node.querySelector('#listingHeaderRating');
    headerRating.innerHTML = `${starsHtml(listing.rating_avg || 0)}<span style="font-size:.85rem;color:#4b5563;font-weight:600">${Number(listing.rating_avg || 0).toFixed(1)}</span><span style="font-size:.8rem;color:#9ca3af">(${listing.review_count || 0} reviews)</span>`;

    const headerMeta = node.querySelector('#listingHeaderMeta');
    headerMeta.innerHTML = `
      ${listing.delivery_method ? `<span style="font-size:.8rem;background:#f3f5f4;color:#374151;padding:3px 10px;border-radius:100px;font-weight:600">📦 ${listing.delivery_method}</span>` : ''}
      ${listing.turnaround_time ? `<span style="font-size:.8rem;background:#f3f5f4;color:#374151;padding:3px 10px;border-radius:100px;font-weight:600">⏱ ${listing.turnaround_time}</span>` : ''}`;

    node.querySelector('#listingDesc').textContent = listing.description || '';

    // Service detail chips
    const chips = node.querySelector('#serviceChips');
    const chipData = [
      listing.delivery_method && { label: 'Delivery', value: listing.delivery_method, icon: '📦' },
      listing.turnaround_time && { label: 'Turnaround', value: listing.turnaround_time, icon: '⏱' },
      listing.availability    && { label: 'Availability', value: listing.availability, icon: '📅' },
      listing.category        && { label: 'Category', value: listing.category, icon: '🏷' },
    ].filter(Boolean);
    chips.innerHTML = chipData.map(c => `
      <div style="display:flex;align-items:center;gap:7px;background:#f8fafc;border:1px solid #e5e7eb;border-radius:10px;padding:8px 14px;min-width:0">
        <span style="font-size:.95rem">${c.icon}</span>
        <div>
          <div style="font-size:.67rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#9ca3af">${c.label}</div>
          <div style="font-size:.82rem;font-weight:600;color:#111827">${c.value}</div>
        </div>
      </div>`).join('');

    // Seller card
    const sellerContent = node.querySelector('#sellerCardContent');
    sellerContent.innerHTML = `
      ${avatarHtml(seller, 'md')}
      <div style="flex:1;min-width:0">
        <a href="/pages/profile.html?id=${listing.seller_id}" style="font-weight:800;font-size:.95rem;color:#111827;text-decoration:none;display:block;margin-bottom:2px">${seller.name || 'Seller'}</a>
        <div style="font-size:.78rem;color:#9ca3af;margin-bottom:6px">${seller.rank || ''}</div>
        ${seller.bio ? `<p style="font-size:.82rem;color:#4b5563;line-height:1.6;margin:0;overflow:hidden;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical">${seller.bio}</p>` : ''}
      </div>`;

    // Booking sidebar
    node.querySelector('#bookingPrice').textContent    = listing.price ? `R${Number(listing.price).toFixed(0)}` : 'Request quote';
    node.querySelector('#bookingPriceType').textContent = listing.price_type ? `per ${listing.price_type}` : (listing.price ? '' : 'Price on request');
    node.querySelector('#bookingStars').innerHTML      = starsHtml(listing.rating_avg || 0);
    node.querySelector('#bookingRatingText').textContent = `${Number(listing.rating_avg || 0).toFixed(1)} · ${listing.review_count || 0} review${listing.review_count === 1 ? '' : 's'}`;
    node.querySelector('#bookingSeller').innerHTML     = `
      ${avatarHtml(seller, 'xs')}
      <a href="/pages/profile.html?id=${listing.seller_id}" style="text-decoration:none;color:#111827;font-weight:700;font-size:.88rem">${seller.name || 'Seller'}</a>`;

    // If the logged-in user is the seller, replace the booking card with an edit prompt
    const currentUser = window.Auth?.getUser?.() || null;
    if (currentUser && listing.seller_id === currentUser.id) {
      const bookCard = node.querySelector('.booking-card');
      if (bookCard) bookCard.innerHTML = `
        <div style="text-align:center;padding:2rem 1rem">
          <div style="font-size:2.5rem;margin-bottom:12px">✏️</div>
          <div style="font-weight:800;font-size:1rem;color:#111827;margin-bottom:6px">This is your listing</div>
          <p style="font-size:.82rem;color:#9ca3af;margin-bottom:18px;line-height:1.6">Buyers can browse and book this service.<br>Manage it from your dashboard.</p>
          <a href="/pages/listing-form.html?edit=${listing.id}" class="btn btn-ghost btn-sm" style="border-radius:10px">Edit listing</a>
        </div>`;
    }

    // Reviews
    const reviewsEl = node.querySelector('#reviewsList');
    reviewsEl.innerHTML = reviews.length
      ? reviews.map(r => `
          <div style="padding:16px 0;border-bottom:1px solid #f3f5f4;last-child:border-bottom:0">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
              ${avatarHtml(r.buyer || {}, 'xs')}
              <div>
                <div style="font-weight:700;font-size:.85rem;color:#111827">${r.buyer?.name || 'Buyer'}</div>
                <div style="display:flex;align-items:center;gap:6px;margin-top:2px">${starsHtml(r.rating)}<span style="font-size:.75rem;color:#9ca3af">${new Date(r.created_at).toLocaleDateString()}</span></div>
              </div>
            </div>
            ${r.content ? `<p style="font-size:.85rem;color:#4b5563;line-height:1.7;margin:0 0 8px">${r.content}</p>` : ''}
            ${r.seller_reply ? `<div style="background:#f8fafc;border-left:3px solid #00C97F;padding:10px 14px;border-radius:0 8px 8px 0;font-size:.82rem;color:#374151;font-style:italic"><strong style="font-style:normal;color:#00965d">Seller:</strong> ${r.seller_reply}</div>` : ''}
          </div>`).join('')
      : '<p style="font-size:.85rem;color:#9ca3af;padding:12px 0">No reviews yet — be the first to book!</p>';

    content.innerHTML = '';
    content.appendChild(node);

    // Book button
    document.getElementById('bookBtn')?.addEventListener('click', async () => {
      if (!Auth.isLoggedIn()) { window.location.href = '/pages/login.html'; return; }
      const btn   = document.getElementById('bookBtn');
      const notes = document.getElementById('bookingNotes')?.value.trim();
      const dt    = document.getElementById('bookingDate')?.value;
      btn.disabled = true;
      btn.textContent = 'Sending…';
      try {
        await api.post('/api/bookings', {
          listingId:         listing.id,
          preferredDateTime: dt || undefined,
          message:           notes || undefined,
        });
        // Show confirmed state
        btn.textContent = '✓ Request sent!';
        btn.style.background = '#10b981';
        if (document.getElementById('bookingNotes')) document.getElementById('bookingNotes').disabled = true;
        if (document.getElementById('bookingDate'))  document.getElementById('bookingDate').disabled  = true;
        document.getElementById('msgBtn')?.insertAdjacentHTML('afterend',
          `<p style="font-size:.78rem;color:#10b981;text-align:center;margin-top:.5rem;font-weight:600">
            Request received! The seller will respond shortly.
          </p>`);
        showToast('Booking request sent! The seller will respond shortly.', 'success');
      } catch (err) {
        showToast(err.message, 'error');
        btn.disabled = false;
        btn.textContent = 'Book this service';
      }
    });

    // Message button
    document.getElementById('msgBtn').addEventListener('click', () => {
      if (!Auth.isLoggedIn()) { window.location.href = '/pages/login.html'; return; }
      window.location.href = `/pages/inbox.html?sellerId=${listing.seller_id}&listingId=${listing.id}`;
    });

  } catch (err) {
    content.innerHTML = `<p style="color:var(--red);text-align:center;padding:3rem">${err.message}</p>`;
  }
});
