document.addEventListener('DOMContentLoaded', () => {
  const email = localStorage.getItem('cc_pending_email');
  const verifyState = document.getElementById('verifyState');
  const successState = document.getElementById('successState');
  const resendBtn = document.getElementById('resendBtn');
  const backBtn = document.querySelector('.lp-back');
  
  if (email && verifyState) {
    const messagePara = verifyState.querySelector('p');
    if (messagePara) {
      messagePara.innerHTML = `We sent a 6-digit code to <strong>${email}</strong>. Click "Back to sign up" when you have it.`;
    }
  }
  
  if (verifyState) verifyState.style.display = '';
  if (successState) successState.style.display = 'none';
  
  const getRedirectUrl = () => email 
    ? `/pages/get-started.html?step=verify&email=${encodeURIComponent(email)}`
    : '/pages/get-started.html';
  
  if (backBtn) {
    backBtn.addEventListener('click', (e) => {
      e.preventDefault();
      window.location.href = getRedirectUrl();
    });
  }
  
  if (resendBtn) {
    resendBtn.addEventListener('click', () => {
      window.location.href = getRedirectUrl();
    });
  }
  
  // NO AUTO-REDIRECT - Page stays visible until user clicks button
});