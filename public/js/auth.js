/**
 * CampusConnect — Auth helper v2
 * Uses Supabase JS client (window.sbClient) initialised by each page.
 */

const Auth = {
  get session() {
    try { return JSON.parse(localStorage.getItem('cc_session')); } catch { return null; }
  },

  get user() { return this.session?.user ?? null; },

  get accessToken() { return this.session?.access_token ?? null; },

  isLoggedIn() { return !!this.accessToken; },

  saveSession(session) {
    if (session) {
      localStorage.setItem('cc_session', JSON.stringify(session));
      localStorage.setItem('cc_user',    JSON.stringify(session.user));
    } else {
      localStorage.removeItem('cc_session');
      localStorage.removeItem('cc_user');
      localStorage.removeItem('cc_profile');
    }
  },

  async signIn(email, password) {
    const { data, error } = await window.sbClient.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    this.saveSession(data.session);
    return data;
  },

  async signOut() {
    if (window.sbClient) await window.sbClient.auth.signOut();
    this.saveSession(null);
    window.location.href = '/pages/login.html';
  },

  requireAuth(redirectTo = '/pages/login.html') {
    if (!this.isLoggedIn()) { window.location.href = redirectTo; return false; }
    return true;
  },

  requireGuest(redirectTo = '/pages/dashboard.html') {
    if (this.isLoggedIn()) { window.location.href = redirectTo; return false; }
    return true;
  },

  async getProfile(forceRefresh = false) {
    if (!forceRefresh) {
      const cached = localStorage.getItem('cc_profile');
      if (cached) return JSON.parse(cached);
    }
    try {
      const { user } = await api.get('/api/auth/me');
      localStorage.setItem('cc_profile', JSON.stringify(user));
      return user;
    } catch { return null; }
  },
};

window.Auth = Auth;