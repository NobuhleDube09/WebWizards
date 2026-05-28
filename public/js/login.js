document.addEventListener('DOMContentLoaded', () => {
  // Show message if already logged in
  if (Auth.isLoggedIn()) {
    const formMsg = document.getElementById('formMsg');
    if (formMsg) {
      formMsg.textContent = 'You are already logged in! Redirecting to dashboard...';
      formMsg.className = 'form-msg success';
      formMsg.style.display = 'block';
      setTimeout(() => {
        window.location.href = '/pages/dashboard.html';
      }, 2000);
    }
    return;
  }
  //Auth.requireGuest();

  const form      = document.getElementById('loginForm');
  const formMsg   = document.getElementById('formMsg');
  const submitBtn = document.getElementById('submitBtn');

  const showMsg = (msg, type) => {
    formMsg.textContent  = msg;
    formMsg.className    = `form-msg ${type}`;
    formMsg.style.display = 'block';
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    formMsg.style.display = 'none';
    submitBtn.disabled = true;
    submitBtn.classList.add('loading');

    try {
      await Auth.signIn(form.email.value.trim(), form.password.value);
      const profile = await Auth.getProfile(true);
      if (profile && !profile.is_verified) {
        // Account exists but OTP not completed — sign back out and send them to verify
        await Auth.signOut();
        const email = encodeURIComponent(form.email.value.trim());
        window.location.href = `/pages/get-started.html?step=verify&email=${email}`;
        return;
      }
      // Admins go straight to the admin panel
      window.location.href = profile?.is_admin ? '/pages/admin.html' : '/pages/dashboard.html';
    } catch (err) {
      showMsg(err.message, 'error');
      submitBtn.disabled = false;
      submitBtn.classList.remove('loading');
    }
  });
});
