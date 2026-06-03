/**
 * CampusConnect — API client v2
 * Auth: Supabase access_token stored in cc_session (localStorage)
 */

const getToken = () => {
  try {
    const raw = localStorage.getItem('cc_session');
    if (!raw) return null;
    const s = JSON.parse(raw);
    return s?.access_token ?? null;
  } catch { 
    return null; 
  }
};

const api = {
  async request(method, path, body, opts = {}) {
    const token = getToken();
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers || {}),
    };
    const res = await fetch(path, {
      method,
      headers,
      ...(body !== undefined && { body: JSON.stringify(body) }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const e = new Error(data.error || `HTTP ${res.status}`);
      e.status = res.status;
      e.data = data;
      // Auto sign-out when the server marks this user as suspended
      if (res.status === 403 && data.error?.toLowerCase().includes('suspended')) {
        if (typeof showToast === 'function') showToast(data.error, 'error', 5000);
        setTimeout(() => window.Auth?.signOut?.(), 1800);
      }
      throw e;
    }
    return data;
  },

  get:    (path, opts)       => api.request('GET',    path, undefined, opts),
  post:   (path, body, opts) => api.request('POST',   path, body, opts),
  put:    (path, body, opts) => api.request('PUT',    path, body, opts),
  patch:  (path, body, opts) => api.request('PATCH',  path, body, opts),
  delete: (path, opts)       => api.request('DELETE', path, undefined, opts),

  async upload(path, formData) {
    const token = getToken();
    const res = await fetch(path, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { 
      const e = new Error(data.error || `HTTP ${res.status}`); 
      e.status = res.status; 
      throw e; 
    }
    return data;
  },

  // ========== DOWNLOAD/EXPORT FUNCTIONS ==========
  
  async downloadReport(type, format = 'csv') {
    try {
      const token = getToken();
      
      const response = await fetch(`/api/reports/export?type=${type}&format=${format}`, {
        method: 'GET',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Download failed');
      }
      
      // Handle file download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      // Get filename from Content-Disposition header or create one
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `${type}_export_${Date.now()}.${format}`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename=(.+)/);
        if (match) filename = match[1];
      }
      
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      return { success: true, message: 'Download started' };
      
    } catch (error) {
      console.error('Download error:', error);
      throw error;
    }
  },
  
  // Specific export functions
  async exportListings() {
    return this.downloadReport('listings', 'csv');
  },
  
  async exportOrders() {
    return this.downloadReport('orders', 'csv');
  },
  
  async exportEarnings() {
    return this.downloadReport('earnings', 'csv');
  }
};

// Make api available globally
window.api = api;