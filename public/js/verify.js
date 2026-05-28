document.addEventListener('DOMContentLoaded', () => {
  // OTP verification is handled inline in get-started.html (step 3).
  // This page is reached only if someone navigates here directly.
  // Redirect them back to get-started so they can complete the OTP flow.
  const email = localStorage.getItem('cc_pending_email');
  const dest  = email
    ? `/pages/get-started.html?email=${encodeURIComponent(email)}`
    : '/pages/get-started.html';

  // Show the verifyState card briefly, then redirect
  document.getElementById('verifyState')?.style && (document.getElementById('verifyState').style.display = '');
  document.getElementById('successState') && (document.getElementById('successState').style.display = 'none');

  document.getElementById('resendBtn')?.addEventListener('click', () => {
    window.location.href = dest;
  });

  // Auto-redirect after 4 s if they don't click
  setTimeout(() => { window.location.replace(dest); }, 4000);
});
