document.addEventListener('DOMContentLoaded', () => {
  Auth.requireGuest();

  const form      = document.getElementById('registerForm');
  const formMsg   = document.getElementById('formMsg');
  const submitBtn = document.getElementById('submitBtn');

  const showMsg = (msg, type) => {
    formMsg.textContent   = msg;
    formMsg.className     = `form-msg ${type}`;
    formMsg.style.display = 'block';
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    formMsg.style.display = 'none';

    if (form.password.value !== form.confirmPassword.value) {
      showMsg('Passwords do not match.', 'error');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.classList.add('loading');

    try {
      const { message } = await api.post('/api/auth/register', {
        email:        form.email.value.trim().toLowerCase(),
        password:     form.password.value,
        name:         form.name.value.trim(),
        faculty:      form.faculty.value.trim(),
        year_of_study: Number(form.year_of_study.value),
      });
      showMsg(message || 'Check your email to verify your account.', 'success');
      form.reset();
    } catch (err) {
      showMsg(err.message, 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.classList.remove('loading');
    }
  });
});