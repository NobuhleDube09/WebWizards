
  (function() {
    // DOM elements
    const titleInput = document.getElementById('listingTitle');
    const descInput = document.getElementById('listingDesc');
    const categorySelect = document.getElementById('listingCategory');
    const priceInput = document.getElementById('listingPrice');
    const turnaroundInput = document.getElementById('turnaroundTime');
    const submitBtn = document.getElementById('submitListingBtn');
    const previewTitle = document.getElementById('previewTitle');
    const previewCategory = document.getElementById('previewCategory');
    const previewPrice = document.getElementById('previewPrice');
    const previewTurnaround = document.getElementById('previewTurnaround');
    
    // Chip groups
    const priceChips = document.querySelectorAll('#priceTypeGroup .chip');
    const deliveryChips = document.querySelectorAll('#deliveryGroup .chip');
    const priceTypeHidden = document.getElementById('priceTypeValue');
    const deliveryHidden = document.getElementById('deliveryValue');

    // Image upload variables
    let uploadedFiles = []; // store base64 or file objects for preview
    const fileInput = document.getElementById('fileInput');
    const uploadArea = document.getElementById('imageUploadArea');
    const previewContainer = document.getElementById('imagePreviewContainer');

    // Live preview updates
    function updatePreview() {
      previewTitle.textContent = titleInput.value.trim() || 'Your listing title';
      previewCategory.textContent = categorySelect.options[categorySelect.selectedIndex]?.text || 'Category';
      
      const priceType = priceTypeHidden.value;
      const priceVal = priceInput.value.trim();
      if (priceType === 'fixed' && priceVal) {
        previewPrice.textContent = `R ${parseInt(priceVal).toLocaleString()}`;
      } else if (priceType === 'quote') {
        previewPrice.textContent = 'Quote / Negotiable';
      } else {
        previewPrice.textContent = '—';
      }
      
      const turnaround = turnaroundInput.value.trim();
      previewTurnaround.textContent = turnaround ? `⏱️ ${turnaround}` : '';
    }

    titleInput.addEventListener('input', updatePreview);
    categorySelect.addEventListener('change', updatePreview);
    priceInput.addEventListener('input', updatePreview);
    turnaroundInput.addEventListener('input', updatePreview);

    // Chip handlers for price type
    priceChips.forEach(chip => {
      chip.addEventListener('click', () => {
        priceChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        const value = chip.getAttribute('data-value');
        priceTypeHidden.value = value;
        updatePreview();
        if (value === 'quote') {
          priceInput.placeholder = 'Leave blank for quote';
          priceInput.value = '';
        } else {
          priceInput.placeholder = 'e.g. 250';
        }
      });
    });

    // Chip handlers for delivery method
    deliveryChips.forEach(chip => {
      chip.addEventListener('click', () => {
        deliveryChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        deliveryHidden.value = chip.getAttribute('data-value');
      });
    });

    // Image upload handling
    uploadArea.addEventListener('click', () => fileInput.click());
    uploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadArea.style.borderColor = '#f97316';
    });
    uploadArea.addEventListener('dragleave', () => {
      uploadArea.style.borderColor = 'rgba(249,115,22,0.3)';
    });
    uploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadArea.style.borderColor = 'rgba(249,115,22,0.3)';
      const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
      handleImageFiles(files);
    });

    fileInput.addEventListener('change', (e) => {
      const files = Array.from(e.target.files).filter(f => f.type.startsWith('image/'));
      handleImageFiles(files);
      fileInput.value = '';
    });

    function handleImageFiles(files) {
      const remainingSlots = 5 - uploadedFiles.length;
      const toAdd = files.slice(0, remainingSlots);
      toAdd.forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
          uploadedFiles.push({ data: e.target.result, file: file });
          renderImagePreviews();
        };
        reader.readAsDataURL(file);
      });
      if (toAdd.length < files.length) {
        alert('Maximum 5 images allowed.');
      }
    }

    function renderImagePreviews() {
      previewContainer.innerHTML = '';
      uploadedFiles.forEach((img, idx) => {
        const div = document.createElement('div');
        div.className = 'preview-item';
        div.innerHTML = `
          <img src="${img.data}" alt="preview">
          <div class="remove-image" data-index="${idx}"><i class="fas fa-times"></i></div>
        `;
        previewContainer.appendChild(div);
      });
      document.querySelectorAll('.remove-image').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const index = parseInt(btn.getAttribute('data-index'));
          uploadedFiles.splice(index, 1);
          renderImagePreviews();
        });
      });
    }

    // Form validation + submission
    function validateForm() {
      const title = titleInput.value.trim();
      const description = descInput.value.trim();
      const category = categorySelect.value;
      const turnaround = turnaroundInput.value.trim();
      const priceType = priceTypeHidden.value;
      
      if (!title) { alert('Please enter a title.'); titleInput.focus(); return false; }
      if (!description) { alert('Please enter a description.'); descInput.focus(); return false; }
      if (!category) { alert('Please select a category.'); categorySelect.focus(); return false; }
      if (!turnaround) { alert('Please enter turnaround time.'); turnaroundInput.focus(); return false; }
      
      if (priceType === 'fixed') {
        const price = priceInput.value.trim();
        if (!price || isNaN(price) || parseFloat(price) <= 0) {
          alert('Please enter a valid price (ZAR).');
          priceInput.focus();
          return false;
        }
      }
      return true;
    }

    submitBtn.addEventListener('click', () => {
      if (!validateForm()) return;
      
      // Construct listing object (not hardcoded)
      const listingData = {
        id: 'lst_' + Date.now(),
        title: titleInput.value.trim(),
        description: descInput.value.trim(),
        category: categorySelect.value,
        price_type: priceTypeHidden.value,
        price: priceTypeHidden.value === 'fixed' ? parseFloat(priceInput.value) : null,
        delivery_method: deliveryHidden.value,
        turnaround: turnaroundInput.value.trim(),
        images: uploadedFiles.map(img => img.data), // base64 for demo
        created_at: new Date().toISOString(),
        status: 'active'
      };
      
      // Simulate saving to localStorage / API
      let existingListings = [];
      try {
        const stored = localStorage.getItem('cc_listings');
        if (stored) existingListings = JSON.parse(stored);
      } catch(e) {}
      existingListings.unshift(listingData);
      localStorage.setItem('cc_listings', JSON.stringify(existingListings));
      
      // Also store a flag for dashboard
      localStorage.setItem('cc_last_listing', JSON.stringify(listingData));
      
      // Show success modal
      const modal = document.getElementById('successModal');
      modal.style.display = 'flex';
      
      // Optional: reset form lightly but keep preview
      submitBtn.disabled = false;
    });

    // Close modal + redirect
    document.getElementById('closeModalBtn').addEventListener('click', () => {
      window.location.href = '/pages/dashboard.html';
    });
    document.getElementById('successModal').addEventListener('click', (e) => {
      if (e.target === document.getElementById('successModal')) {
        window.location.href = '/pages/dashboard.html';
      }
    });

    // Initialize preview
    updatePreview();
    
    // Helper: set default price chip active already
  })();
