document.addEventListener('DOMContentLoaded', async () => {
  if (!Auth.requireAuth()) return;

  // Buyers cannot create listings
  const me = await Auth.getProfile();
  if (me?.account_type === 'buyer') {
    document.body.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;padding:2rem;text-align:center;font-family:'Inter',sans-serif;background:#f3f5f4">
        <div style="font-size:3rem;margin-bottom:16px">🛒</div>
        <h2 style="font-size:1.35rem;font-weight:800;color:#111827;margin:0 0 10px">Buyers can't create listings</h2>
        <p style="font-size:.9rem;color:#4b5563;max-width:360px;line-height:1.65;margin:0 0 24px">
          Your account is registered as a buyer. To sell your skills, create a new account and select <strong>"Sell my skills"</strong> during registration.
        </p>
        <div style="display:flex;gap:12px;flex-wrap:wrap;justify-content:center">
          <a href="/pages/browse.html" style="padding:11px 24px;background:#00C97F;color:#fff;border-radius:10px;font-weight:700;text-decoration:none;font-size:.9rem">Browse services</a>
          <a href="/pages/dashboard.html" style="padding:11px 24px;background:#f3f5f4;color:#374151;border:1.5px solid #e5e7eb;border-radius:10px;font-weight:700;text-decoration:none;font-size:.9rem">Back to dashboard</a>
        </div>
      </div>`;
    return;
  }

  const form      = document.getElementById('listingForm');
  const formMsg   = document.getElementById('formMsg');
  const submitBtn = document.getElementById('submitBtn');
  const catSelect = document.getElementById('category');
  const imgInput  = document.getElementById('imageInput');
  const previews  = document.getElementById('imagePreviews');
  const uploadBtn = document.getElementById('imgUploadBtn');

  let selectedFiles = [];

  // Populate categories
  CATEGORIES.forEach((c) => {
    catSelect.insertAdjacentHTML('beforeend', `<option value="${c.label}">${c.label}</option>`);
  });

  // Image preview handling
  imgInput.addEventListener('change', () => {
    const newFiles = Array.from(imgInput.files);
    selectedFiles = [...selectedFiles, ...newFiles].slice(0, 5);
    renderPreviews();
  });

  const renderPreviews = () => {
    // Remove old previews (keep the upload button)
    previews.querySelectorAll('.img-preview-item').forEach(el => el.remove());
    selectedFiles.forEach((file, i) => {
      const url = URL.createObjectURL(file);
      const div = document.createElement('div');
      div.className = 'img-preview-item';
      div.style.cssText = 'position:relative;width:80px;height:80px;border-radius:8px;overflow:hidden;border:1px solid var(--border)';
      div.innerHTML = `<img src="${url}" style="width:100%;height:100%;object-fit:cover">
        <button type="button" style="position:absolute;top:3px;right:3px;background:rgba(0,0,0,.7);color:#fff;border:none;border-radius:50%;width:20px;height:20px;font-size:11px;cursor:pointer;display:flex;align-items:center;justify-content:center" data-idx="${i}">✕</button>`;
      div.querySelector('button').addEventListener('click', () => {
        selectedFiles.splice(i, 1);
        renderPreviews();
      });
      previews.insertBefore(div, uploadBtn);
    });
  };

  const showMsg = (msg, type) => {
    formMsg.textContent   = msg;
    formMsg.className     = `form-msg ${type}`;
    formMsg.style.display = 'block';
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    formMsg.style.display = 'none';
    submitBtn.disabled = true;
    submitBtn.classList.add('loading');

    try {
      const fd = new FormData();
      fd.append('title',           document.getElementById('title').value.trim());
      fd.append('description',     document.getElementById('description').value.trim());
      fd.append('category',        catSelect.value);
      fd.append('price_type',      document.getElementById('price_type').value);
      fd.append('delivery_method', document.getElementById('delivery_method').value);
      fd.append('turnaround_time', document.getElementById('turnaround_time').value.trim());

      const price = document.getElementById('price').value;
      if (price) fd.append('price', price);

      fd.append('availability', document.getElementById('isAvailable').checked ? 'true' : 'false');

      selectedFiles.forEach((f) => fd.append('images', f));

      const { listing } = await api.upload('/api/listings', fd);
      showMsg('Listing published!', 'success');
      form.reset();
      selectedFiles = [];
      renderPreviews();
      setTimeout(() => { window.location.href = `/pages/listing.html?id=${listing.id}`; }, 1000);
    } catch (err) {
      showMsg(err.message, 'error');
      submitBtn.disabled = false;
      submitBtn.classList.remove('loading');
    }
  });
});
