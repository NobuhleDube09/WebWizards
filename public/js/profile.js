document.addEventListener('DOMContentLoaded', async () => {
  const content  = document.getElementById('profileContent');
  const params   = new URLSearchParams(window.location.search);
  let sellerId   = params.get('id');

  // If no id param, try logged-in user's own profile
  if (!sellerId) {
    const me = await Auth.getProfile();
    sellerId = me?.id;
  }

  if (!sellerId) {
    content.innerHTML = '<p style="color:var(--red);text-align:center;padding:3rem">No profile found.</p>';
    return;
  }

  try {
    const { seller, listings } = await api.get(`/api/seller/${sellerId}`);
    const me      = await Auth.getProfile();
    const isOwner = me?.id === seller.id;

    const skillBadges = (seller.skills || []).map(s =>
      `<span class="badge badge-muted">${s}</span>`).join('');

    content.innerHTML = `
      <div class="card card-pad flex items-start gap-4 mb-4" style="flex-wrap:wrap">
        ${avatarHtml({ avatar_url: seller.avatar_url, name: seller.name }, 'xl')}
        <div style="flex:1;min-width:200px">
          <div class="flex items-center gap-2 flex-wrap mb-1">
            <h1 style="font-size:1.5rem;font-weight:800;margin:0">${seller.name}</h1>
            ${seller.is_verified ? '<span class="badge badge-teal">✓ Verified</span>' : ''}
          </div>
          <p style="font-size:.85rem;color:var(--text-muted);margin:.2rem 0 .5rem">${seller.faculty || ''} · Year ${seller.year_of_study || ''}</p>
          <div class="flex items-center gap-2 mb-2">
            ${starsHtml(seller.avg_rating)}
            <span style="font-size:.83rem;color:var(--text-muted)">${Number(seller.avg_rating || 0).toFixed(1)} · ${seller.rank_title || 'Newcomer'} · ${seller.xp || 0} XP</span>
          </div>
          <p style="color:var(--text-secondary);line-height:1.65;max-width:560px;margin-bottom:.5rem">${seller.bio || 'No bio yet.'}</p>
          ${skillBadges ? `<div class="flex flex-wrap gap-1 mt-1">${skillBadges}</div>` : ''}
          ${isOwner ? `<div class="flex gap-2 mt-3">
            ${me.account_type !== 'buyer' ? '<a href="/pages/listing-form.html" class="btn btn-primary btn-sm">+ New listing</a>' : ''}
            <button class="btn btn-ghost btn-sm" id="toggleEditBtn">Edit profile</button>
          </div>` : ''}
        </div>
      </div>
      ${isOwner ? `
      <div class="card card-pad mb-4" id="editPanel" style="display:none">
        <h3 style="margin-bottom:1rem">Edit profile</h3>
        <form id="profileForm" class="form-grid" style="gap:1rem;max-width:560px">
          <div class="form-grid-2">
            <div class="form-group"><label class="form-label">Display name</label><input name="name" value="${seller.name}" required></div>
            <div class="form-group"><label class="form-label">Faculty</label><input name="faculty" value="${seller.faculty || ''}"></div>
          </div>
          <div class="form-group"><label class="form-label">Bio</label><textarea name="bio" rows="3">${seller.bio || ''}</textarea></div>
          <div class="form-group"><label class="form-label">Skills (comma-separated)</label><input name="skills" value="${(seller.skills || []).join(', ')}"></div>
          <label class="flex items-center gap-2" style="cursor:pointer"><input type="checkbox" name="open_for_orders" ${seller.open_for_orders ? 'checked' : ''}> <span style="font-size:.88rem">Open for orders</span></label>
          <div><button type="submit" class="btn btn-primary btn-sm" id="saveProfileBtn">Save changes</button></div>
        </form>
        <div class="divider mt-3"></div>
        <div class="flex items-center gap-3 mt-2">
          ${avatarHtml({ avatar_url: seller.avatar_url, name: seller.name }, 'sm')}
          <label class="btn btn-ghost btn-sm" style="cursor:pointer">
            Upload photo<input type="file" id="avatarInput" accept="image/*" style="display:none">
          </label>
        </div>
      </div>` : ''}
      <div>
        <h2 style="margin-bottom:1.25rem">Listings</h2>
        <div class="listings-grid" id="sellerListings">
          ${listings.length ? listings.map(listingCardHtml).join('') : '<p style="color:var(--text-muted)">No listings yet.</p>'}
        </div>
      </div>`;

    if (isOwner) {
      document.getElementById('toggleEditBtn')?.addEventListener('click', () => {
        const panel = document.getElementById('editPanel');
        panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
      });

      document.getElementById('profileForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const f   = e.currentTarget;
        const btn = document.getElementById('saveProfileBtn');
        btn.disabled = true;
        try {
          await api.put('/api/profile', {
            name:           f.name.value.trim(),
            faculty:        f.faculty.value.trim(),
            bio:            f.bio.value.trim(),
            skills:         f.skills.value,
            open_for_orders: f.open_for_orders.checked,
          });
          showToast('Profile saved!', 'success');
          window.location.reload();
        } catch (err) {
          showToast(err.message, 'error');
          btn.disabled = false;
        }
      });

      document.getElementById('avatarInput')?.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const fd = new FormData();
        fd.append('avatar', file);
        try {
          await api.upload('/api/profile/avatar', fd);
          showToast('Avatar updated!', 'success');
          window.location.reload();
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    }
  } catch (err) {
    content.innerHTML = `<p style="color:var(--red);text-align:center;padding:3rem">${err.message}</p>`;
  }
});