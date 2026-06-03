// Theme Toggle Functionality
(function() {
  const SUN = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>';
  const MOON = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
  const fab = document.getElementById('cc-theme-fab');
  
  function syncFab(theme) {
    fab.innerHTML = theme === 'dark' ? SUN : MOON;
    fab.title = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
    fab.setAttribute('aria-label', fab.title);
  }
  
  if (fab) {
    syncFab(localStorage.getItem('cc_theme') || 'light');
    fab.addEventListener('click', function() {
      const next = (localStorage.getItem('cc_theme') || 'light') === 'dark' ? 'light' : 'dark';
      localStorage.setItem('cc_theme', next);
      document.documentElement.setAttribute('data-theme', next);
      syncFab(next);
    });
  }
})();

// Password Reset Functionality
(async () => {
  const form = document.getElementById('resetForm');
  const formMsg = document.getElementById('formMsg');
  const submitBtn = document.getElementById('submitBtn');
  const invalidDiv = document.getElementById('invalidState');

  const showMsg = (msg, type) => {
    formMsg.textContent = msg;
    formMsg.className = `form-msg ${type}`;
    formMsg.style.display = 'block';
  };

  let recoverySessionReady = false;

  // Check if Supabase client is available
  if (typeof window.sbClient !== 'undefined' && window.sbClient.auth) {
    window.sbClient.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        recoverySessionReady = true;
        if (form) form.style.display = '';
        if (invalidDiv) invalidDiv.style.display = 'none';
      }
    });
  }

  // Check for recovery token in URL hash
  const hash = window.location.hash;
  if (!hash.includes('type=recovery') && !hash.includes('access_token')) {
    if (form) form.style.display = 'none';
    if (invalidDiv) invalidDiv.style.display = 'block';
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      formMsg.style.display = 'none';

      const password = document.getElementById('password').value;
      const confirmPassword = document.getElementById('confirmPassword').value;

      if (password !== confirmPassword) {
        showMsg('Passwords do not match.', 'error');
        return;
      }
      if (password.length < 8) {
        showMsg('Password must be at least 8 characters.', 'error');
        return;
      }
      if (!recoverySessionReady) {
        showMsg('Recovery session not ready. Please use the link from your email.', 'error');
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Updating...';

      try {
        const { error } = await window.sbClient.auth.updateUser({ password });
        if (error) throw error;
        showMsg('Password updated! Redirecting to login…', 'success');
        setTimeout(() => {
          window.location.href = '/pages/login.html';
        }, 2000);
      } catch (err) {
        showMsg(err.message || 'Something went wrong. Please try again.', 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Update password';
      }
    });
  }
})();