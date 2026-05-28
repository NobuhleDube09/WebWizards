const fs = require('fs');
const path = require('path');

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <link rel="icon" href="/assets/campus_logo.svg" type="image/svg+xml">
  <title>Admin Panel &middot; CampusConnect</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }

    :root {
      --primary:    #00C97F;
      --primary-d:  #00a868;
      --primary-bg: #e6fff4;
      --gold:       #f59e0b;
      --gold-bg:    #fffbeb;
      --coral:      #ef4444;
      --coral-bg:   #fff1f2;
      --purple:     #8b5cf6;
      --purple-bg:  #f5f3ff;
      --amber:      #d97706;
      --amber-bg:   #fef3c7;
      --text:       #111827;
      --text-2:     #4b5563;
      --text-3:     #9ca3af;
      --border:     #e5e7eb;
      --bg:         #f3f5f4;
      --sidebar-w:  260px;
    }

    html, body { height:100%; overflow:hidden; font-family:'Inter',sans-serif; background:var(--bg); color:var(--text); font-size:14px; }

    /* Shell */
    .a-shell { display:flex; height:100vh; overflow:hidden; }

    /* Sidebar */
    .a-sidebar {
      width:var(--sidebar-w); flex-shrink:0;
      background:#fff; border-right:1px solid var(--border);
      display:flex; flex-direction:column; height:100vh; overflow:hidden;
    }
    .a-sidebar-logo {
      padding:20px 20px 16px; display:flex; align-items:center; gap:12px;
      border-bottom:1px solid var(--border); flex-shrink:0;
    }
    .a-sidebar-logo img { height:40px; width:auto; display:block; flex-shrink:0; }
    .a-sidebar-logo span { font-weight:800; font-size:1rem; color:var(--text); letter-spacing:-.02em; white-space:nowrap; }
    .a-admin-chip {
      margin:10px 16px 2px; background:var(--coral-bg); color:var(--coral);
      font-size:.65rem; font-weight:700; text-transform:uppercase; letter-spacing:.08em;
      padding:4px 10px; border-radius:6px; border:1px solid #fecdd3; text-align:center;
    }
    .a-sidebar-label { padding:16px 20px 6px; font-size:.68rem; font-weight:700; text-transform:uppercase; letter-spacing:.08em; color:var(--text-3); flex-shrink:0; }
    .a-sidebar-nav { flex:1; overflow-y:auto; padding:4px 12px 12px; }
    .a-sidebar-nav::-webkit-scrollbar { width:3px; }
    .a-sidebar-nav::-webkit-scrollbar-thumb { background:var(--border); border-radius:99px; }
    .a-nav-item {
      display:flex; align-items:center; gap:12px; width:100%;
      padding:11px 14px; border-radius:10px; font-size:.875rem; font-weight:500;
      color:var(--text-2); text-decoration:none; background:none; border:none; cursor:pointer;
      transition:background .15s,color .15s; text-align:left; font-family:inherit; margin-bottom:3px;
    }
    .a-nav-item:hover { background:var(--bg); color:var(--text); }
    .a-nav-item.active { background:var(--primary-bg); color:var(--primary-d); font-weight:700; }
    .a-nav-item.active .a-nav-icon { color:var(--primary); }
    .a-nav-item.danger { color:var(--coral); }
    .a-nav-item.danger:hover { background:var(--coral-bg); }
    .a-nav-icon { width:18px; height:18px; flex-shrink:0; display:flex; align-items:center; justify-content:center; }
    .a-nav-badge {
      margin-left:auto; min-width:18px; height:18px; padding:0 5px;
      background:var(--coral); color:#fff; border-radius:99px;
      font-size:.62rem; font-weight:700; display:flex; align-items:center; justify-content:center;
    }
    .a-sidebar-divider { height:1px; background:var(--border); margin:8px 12px; }
    .a-sidebar-footer {
      padding:16px 20px; border-top:1px solid var(--border);
      display:flex; align-items:center; gap:12px; flex-shrink:0;
    }
    .a-sf-name { font-size:.875rem; font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; color:var(--text); }
    .a-sf-role { font-size:.72rem; color:var(--coral); font-weight:600; }

    /* Main */
    .a-main { flex:1; display:flex; flex-direction:column; min-width:0; overflow:hidden; }
    .a-section { flex:1; overflow-y:auto; padding:28px; display:none; flex-direction:column; gap:0; }
    .a-section.active { display:flex; }
    .a-section::-webkit-scrollbar { width:5px; }
    .a-section::-webkit-scrollbar-thumb { background:var(--border); border-radius:99px; }

    /* Page header */
    .a-page-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:24px; flex-wrap:wrap; gap:12px; }
    .a-page-eyebrow { font-size:.72rem; font-weight:700; text-transform:uppercase; letter-spacing:.08em; color:var(--text-3); margin-bottom:2px; }
    .a-page-header h1 { font-size:1.6rem; font-weight:800; color:var(--text); }
    .a-page-header-actions { display:flex; align-items:center; gap:10px; flex-wrap:wrap; }

    /* Stat cards */
    .a-stat-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(160px,1fr)); gap:14px; margin-bottom:22px; }
    .a-stat-card { background:#fff; border-radius:14px; padding:20px; border:1px solid var(--border); position:relative; overflow:hidden; }
    .sc-label { font-size:.7rem; font-weight:600; text-transform:uppercase; letter-spacing:.06em; color:var(--text-3); margin-bottom:8px; }
    .sc-value { font-size:1.9rem; font-weight:800; line-height:1; }
    .sc-sub { font-size:.72rem; color:var(--text-3); margin-top:5px; }
    .sc-blob { position:absolute; top:-20px; right:-20px; width:80px; height:80px; border-radius:50%; opacity:.08; }
    .sc-green  .sc-blob { background:var(--primary); } .sc-green  .sc-value { color:var(--primary-d); }
    .sc-blue   .sc-blob { background:#3b82f6; }         .sc-blue   .sc-value { color:#2563eb; }
    .sc-amber  .sc-blob { background:var(--gold); }     .sc-amber  .sc-value { color:var(--amber); }
    .sc-red    .sc-blob { background:var(--coral); }    .sc-red    .sc-value { color:var(--coral); }
    .sc-purple .sc-blob { background:var(--purple); }   .sc-purple .sc-value { color:var(--purple); }

    /* Cards */
    .a-card { background:#fff; border-radius:14px; border:1px solid var(--border); margin-bottom:20px; overflow:hidden; }
    .a-card-header { display:flex; align-items:center; justify-content:space-between; padding:16px 20px; border-bottom:1px solid var(--border); gap:12px; flex-wrap:wrap; }
    .a-card-title { font-size:.95rem; font-weight:700; color:var(--text); }
    .a-card-sub { font-size:.78rem; color:var(--text-3); margin-top:2px; }

    /* Filters */
    .a-filter-row { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
    .a-filter-pill { padding:5px 14px; border-radius:99px; font-size:.8rem; font-weight:600; cursor:pointer; border:1.5px solid var(--border); background:#fff; color:var(--text-2); transition:all .15s; font-family:inherit; }
    .a-filter-pill.active { background:var(--text); color:#fff; border-color:var(--text); }
    .a-search { display:flex; align-items:center; gap:8px; background:var(--bg); border:1.5px solid var(--border); border-radius:8px; padding:7px 12px; min-width:200px; }
    .a-search input { border:none; background:none; outline:none; font-size:.875rem; width:100%; font-family:inherit; color:var(--text); }

    /* Table */
    .a-table-wrap { overflow-x:auto; }
    .a-table { width:100%; border-collapse:collapse; font-size:.875rem; }
    .a-table th { padding:10px 14px; text-align:left; font-size:.7rem; font-weight:700; text-transform:uppercase; letter-spacing:.06em; color:var(--text-3); background:var(--bg); border-bottom:1px solid var(--border); white-space:nowrap; }
    .a-table th.cb { width:38px; padding-left:16px; }
    .a-table td { padding:12px 14px; border-bottom:1px solid var(--border); vertical-align:middle; }
    .a-table tbody tr:hover { background:#fafafa; }
    .a-table tbody tr:last-child td { border-bottom:none; }

    /* Listing preview */
    .a-listing-preview { display:flex; align-items:center; gap:10px; }
    .a-listing-thumb { width:42px; height:42px; border-radius:8px; object-fit:cover; flex-shrink:0; background:var(--bg); border:1px solid var(--border); display:block; }
    .a-listing-thumb-ph { width:42px; height:42px; border-radius:8px; flex-shrink:0; background:var(--bg); border:1px solid var(--border); display:flex; align-items:center; justify-content:center; font-size:1.1rem; }
    .a-listing-title { font-weight:600; color:var(--text); max-width:180px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .a-listing-meta { font-size:.72rem; color:var(--text-3); margin-top:1px; }

    /* User preview */
    .a-user-preview { display:flex; align-items:center; gap:10px; }
    .a-user-av { width:36px; height:36px; border-radius:50%; background:var(--primary-bg); display:flex; align-items:center; justify-content:center; font-size:.72rem; font-weight:700; color:var(--primary-d); flex-shrink:0; overflow:hidden; }
    .a-user-av img { width:100%; height:100%; object-fit:cover; }
    .a-user-name { font-weight:600; font-size:.875rem; }
    .a-user-email { font-size:.72rem; color:var(--text-3); }

    /* Status badges */
    .s-badge { display:inline-flex; align-items:center; font-size:.68rem; font-weight:700; padding:3px 9px; border-radius:99px; white-space:nowrap; }
    .s-badge.pending   { background:var(--amber-bg);   color:var(--amber); }
    .s-badge.approved  { background:var(--primary-bg); color:var(--primary-d); }
    .s-badge.rejected  { background:var(--coral-bg);   color:var(--coral); }
    .s-badge.featured  { background:var(--purple-bg);  color:var(--purple); }
    .s-badge.active    { background:var(--primary-bg); color:var(--primary-d); }
    .s-badge.inactive,
    .s-badge.resolved  { background:var(--bg); color:var(--text-3); border:1px solid var(--border); }
    .s-badge.suspended { background:var(--coral-bg);   color:var(--coral); }
    .s-badge.open      { background:var(--amber-bg);   color:var(--amber); }

    /* Buttons */
    .a-btn { display:inline-flex; align-items:center; gap:5px; font-size:.8rem; font-weight:600; padding:7px 14px; border-radius:8px; cursor:pointer; border:1.5px solid transparent; font-family:inherit; transition:all .15s; white-space:nowrap; text-decoration:none; }
    .a-btn:disabled { opacity:.5; cursor:not-allowed; }
    .a-btn-primary { background:var(--primary); color:#fff; border-color:var(--primary); }
    .a-btn-primary:hover:not(:disabled) { background:var(--primary-d); }
    .a-btn-danger  { background:var(--coral-bg); color:var(--coral); border-color:#fca5a5; }
    .a-btn-danger:hover:not(:disabled)  { background:#fee2e2; }
    .a-btn-success { background:var(--primary-bg); color:var(--primary-d); border-color:#6ee7b7; }
    .a-btn-success:hover:not(:disabled) { background:#d1fae5; }
    .a-btn-feature { background:var(--purple-bg); color:var(--purple); border-color:#c4b5fd; }
    .a-btn-feature:hover:not(:disabled) { background:#ede9fe; }
    .a-btn-ghost { background:#fff; color:var(--text-2); border-color:var(--border); }
    .a-btn-ghost:hover:not(:disabled)  { background:var(--bg); }
    .a-btn-sm { padding:4px 10px; font-size:.75rem; border-radius:6px; }
    .a-action-group { display:flex; align-items:center; gap:6px; flex-wrap:wrap; }

    /* Bulk bar */
    .a-bulk-bar { display:none; align-items:center; gap:12px; padding:10px 20px; background:#1e293b; color:#fff; font-size:.875rem; }
    .a-bulk-bar.visible { display:flex; }
    .a-bulk-count { font-weight:700; }
    .a-bulk-actions { display:flex; gap:8px; margin-left:auto; }

    /* Report cards */
    .a-report-card { background:#fff; border:1px solid var(--border); border-radius:12px; padding:18px 20px; margin-bottom:12px; }
    .a-report-header { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; margin-bottom:8px; }
    .a-report-type { font-size:.68rem; font-weight:700; text-transform:uppercase; letter-spacing:.06em; color:var(--amber); margin-bottom:3px; }
    .a-report-listing { font-weight:700; font-size:.9rem; color:var(--text); }
    .a-report-reason { font-size:.875rem; color:var(--text-2); margin:8px 0; padding:10px 12px; background:var(--bg); border-radius:8px; border-left:3px solid var(--border); }
    .a-report-footer { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px; margin-top:12px; }
    .a-report-meta { font-size:.75rem; color:var(--text-3); }

    /* Category items */
    .a-cat-item { display:flex; align-items:center; gap:14px; padding:14px 20px; border-bottom:1px solid var(--border); }
    .a-cat-item:last-child { border-bottom:none; }
    .a-cat-icon { font-size:1.4rem; width:32px; text-align:center; flex-shrink:0; }
    .a-cat-info { flex:1; min-width:0; }
    .a-cat-name { font-weight:600; color:var(--text); }
    .a-cat-desc { font-size:.75rem; color:var(--text-3); }
    .a-reorder-btns { display:flex; flex-direction:column; gap:1px; flex-shrink:0; }
    .a-reorder-btn { border:none; background:none; cursor:pointer; color:var(--text-3); font-size:.7rem; padding:2px 5px; border-radius:4px; line-height:1; font-family:inherit; }
    .a-reorder-btn:hover { background:var(--bg); color:var(--text); }

    /* Announcement items */
    .a-ann-item { display:flex; align-items:flex-start; gap:14px; padding:16px 20px; border-bottom:1px solid var(--border); }
    .a-ann-item:last-child { border-bottom:none; }
    .a-ann-dot { width:9px; height:9px; border-radius:50%; flex-shrink:0; margin-top:6px; }
    .a-ann-dot.on { background:var(--primary); }
    .a-ann-dot.off { background:var(--text-3); }
    .a-ann-body { flex:1; min-width:0; }
    .a-ann-title { font-weight:700; color:var(--text); margin-bottom:3px; }
    .a-ann-content { font-size:.8rem; color:var(--text-2); margin-bottom:6px; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
    .a-ann-meta { font-size:.72rem; color:var(--text-3); }

    /* Overview grid */
    .a-overview-grid { display:grid; grid-template-columns:1fr 340px; gap:18px; }
    @media(max-width:880px) { .a-overview-grid { grid-template-columns:1fr; } }
    .a-activity-item { display:flex; align-items:flex-start; gap:10px; padding:10px 0; border-bottom:1px solid var(--border); }
    .a-activity-item:last-child { border-bottom:none; }
    .a-activity-dot { width:7px; height:7px; border-radius:50%; background:var(--primary); flex-shrink:0; margin-top:5px; }
    .a-activity-text { font-size:.8rem; color:var(--text-2); flex:1; }
    .a-activity-time { font-size:.72rem; color:var(--text-3); flex-shrink:0; }

    /* Modal */
    .a-modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,.45); display:none; align-items:center; justify-content:center; z-index:9999; padding:20px; }
    .a-modal-overlay.open { display:flex; }
    .a-modal { background:#fff; border-radius:16px; width:100%; max-width:480px; box-shadow:0 20px 60px rgba(0,0,0,.2); animation:modalIn .2s ease; }
    @keyframes modalIn { from { opacity:0; transform:scale(.95) translateY(8px); } }
    .a-modal-header { display:flex; align-items:center; justify-content:space-between; padding:18px 20px 14px; border-bottom:1px solid var(--border); }
    .a-modal-header h3 { font-size:1rem; font-weight:700; }
    .a-modal-close { border:none; background:none; cursor:pointer; font-size:1.2rem; color:var(--text-3); padding:4px 8px; border-radius:6px; line-height:1; font-family:inherit; }
    .a-modal-close:hover { background:var(--bg); }
    .a-modal-body { padding:20px; }
    .a-modal-footer { display:flex; justify-content:flex-end; gap:10px; padding:14px 20px; border-top:1px solid var(--border); }

    /* Form */
    .a-form-group { margin-bottom:14px; }
    .a-form-label { display:block; font-size:.8rem; font-weight:600; color:var(--text); margin-bottom:5px; }
    .a-form-input { width:100%; padding:9px 12px; border:1.5px solid var(--border); border-radius:8px; font-size:.875rem; font-family:inherit; color:var(--text); background:#fff; outline:none; transition:border-color .15s; }
    .a-form-input:focus { border-color:var(--primary); }
    textarea.a-form-input { resize:vertical; min-height:80px; }
    .a-form-select { width:100%; padding:9px 12px; border:1.5px solid var(--border); border-radius:8px; font-size:.875rem; font-family:inherit; color:var(--text); background:#fff; outline:none; cursor:pointer; }

    /* Empty state */
    .a-empty { padding:40px 24px; text-align:center; color:var(--text-3); }
    .a-empty-icon { font-size:2rem; margin-bottom:8px; }
    .a-empty h3 { font-size:.9rem; font-weight:600; color:var(--text-2); margin-bottom:4px; }
    .a-empty p { font-size:.8rem; }

    /* Avatars */
    .avatar { border-radius:50%; object-fit:cover; display:block; }
    .avatar-sm, .avatar-placeholder.avatar-sm { width:40px; height:40px; }
    .avatar-xs, .avatar-placeholder.avatar-xs { width:28px; height:28px; font-size:10px; }
    .avatar-placeholder { display:inline-flex; align-items:center; justify-content:center; border-radius:50%; background:var(--primary-bg); color:var(--primary-d); font-weight:700; flex-shrink:0; }

    /* Toast */
    #toast-container { position:fixed; bottom:24px; right:24px; z-index:99999; display:flex; flex-direction:column; gap:8px; }
  </style>
</head>
<body>
<div class="a-shell">

  <!-- SIDEBAR -->
  <aside class="a-sidebar">
    <div class="a-sidebar-logo">
      <img src="/assets/logo_2.svg" alt="CampusConnect">
      <span>CampusConnect</span>
    </div>
    <div class="a-admin-chip">Admin Panel</div>

    <div class="a-sidebar-label">Manage</div>
    <nav class="a-sidebar-nav">
      <button class="a-nav-item active" data-tab="overview">
        <span class="a-nav-icon"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg></span>
        <span>Overview</span>
      </button>
      <button class="a-nav-item" data-tab="listings">
        <span class="a-nav-icon"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg></span>
        <span>Listings</span>
        <span class="a-nav-badge" id="pendingBadge" style="display:none">0</span>
      </button>
      <button class="a-nav-item" data-tab="users">
        <span class="a-nav-icon"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></span>
        <span>Users</span>
      </button>
      <button class="a-nav-item" data-tab="reports">
        <span class="a-nav-icon"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></span>
        <span>Reports</span>
        <span class="a-nav-badge" id="reportsBadge" style="display:none">0</span>
      </button>
      <button class="a-nav-item" data-tab="categories">
        <span class="a-nav-icon"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg></span>
        <span>Categories</span>
      </button>
      <button class="a-nav-item" data-tab="announcements">
        <span class="a-nav-icon"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 17H2a3 3 0 0 0 3-3V9a7 7 0 0 1 14 0v5a3 3 0 0 0 3 3zm-8.27 4a2 2 0 0 1-3.46 0"/></svg></span>
        <span>Announcements</span>
      </button>

      <div class="a-sidebar-divider"></div>

      <button class="a-nav-item" data-tab="log">
        <span class="a-nav-icon"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg></span>
        <span>Activity Log</span>
      </button>
      <a class="a-nav-item" href="/pages/dashboard.html">
        <span class="a-nav-icon"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg></span>
        <span>My Dashboard</span>
      </a>
      <button class="a-nav-item danger" id="logoutBtn">
        <span class="a-nav-icon"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg></span>
        <span>Log out</span>
      </button>
    </nav>

    <div class="a-sidebar-footer" id="sidebarProfile">
      <div id="sidebarAvatarWrap"></div>
      <div style="min-width:0">
        <div class="a-sf-name" id="sidebarName"></div>
        <div class="a-sf-role">Administrator</div>
      </div>
    </div>
  </aside>

  <!-- MAIN -->
  <main class="a-main">

    <!-- OVERVIEW -->
    <section id="tab-overview" class="a-section active">
      <div class="a-page-header">
        <div>
          <div class="a-page-eyebrow">Admin</div>
          <h1>Platform Overview</h1>
        </div>
        <button class="a-btn a-btn-ghost" onclick="loadOverview()">
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
          Refresh
        </button>
      </div>

      <div class="a-stat-grid">
        <div class="a-stat-card sc-blue"><div class="sc-blob"></div><div class="sc-label">Total Users</div><div class="sc-value" id="stat-users">0</div><div class="sc-sub">Registered students</div></div>
        <div class="a-stat-card sc-green"><div class="sc-blob"></div><div class="sc-label">Total Listings</div><div class="sc-value" id="stat-listings">0</div><div class="sc-sub">All service listings</div></div>
        <div class="a-stat-card sc-amber"><div class="sc-blob"></div><div class="sc-label">Pending Review</div><div class="sc-value" id="stat-pending">0</div><div class="sc-sub">Awaiting moderation</div></div>
        <div class="a-stat-card sc-red"><div class="sc-blob"></div><div class="sc-label">Open Reports</div><div class="sc-value" id="stat-reports">0</div><div class="sc-sub">Flagged content</div></div>
        <div class="a-stat-card sc-purple"><div class="sc-blob"></div><div class="sc-label">Total Orders</div><div class="sc-value" id="stat-orders">0</div><div class="sc-sub">Across all time</div></div>
        <div class="a-stat-card sc-green"><div class="sc-blob"></div><div class="sc-label">New Signups (7d)</div><div class="sc-value" id="stat-signups">0</div><div class="sc-sub">Last 7 days</div></div>
      </div>

      <div class="a-overview-grid">
        <div class="a-card">
          <div class="a-card-header">
            <div><div class="a-card-title">Recent Signups</div><div class="a-card-sub">Newest students on the platform</div></div>
          </div>
          <div class="a-table-wrap">
            <table class="a-table">
              <thead><tr><th>Student</th><th>University</th><th>Verified</th><th>Joined</th></tr></thead>
              <tbody id="recentSignupsBody"><tr><td colspan="4"><div class="a-empty"><p>Loading...</p></div></td></tr></tbody>
            </table>
          </div>
        </div>
        <div class="a-card">
          <div class="a-card-header">
            <div><div class="a-card-title">Recent Activity</div><div class="a-card-sub">Admin actions</div></div>
          </div>
          <div style="padding:4px 16px 12px" id="activityFeed">
            <div class="a-empty"><p>No activity yet</p></div>
          </div>
        </div>
      </div>
    </section>

    <!-- LISTINGS -->
    <section id="tab-listings" class="a-section">
      <div class="a-page-header">
        <div><div class="a-page-eyebrow">Moderation</div><h1>Listings</h1></div>
      </div>
      <div class="a-card">
        <div class="a-card-header">
          <div class="a-filter-row" id="listingsFilterRow">
            <button class="a-filter-pill active" data-status="pending">Pending</button>
            <button class="a-filter-pill" data-status="approved">Approved</button>
            <button class="a-filter-pill" data-status="featured">Featured</button>
            <button class="a-filter-pill" data-status="rejected">Rejected</button>
            <button class="a-filter-pill" data-status="all">All</button>
          </div>
          <div class="a-search">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--text-3);flex-shrink:0"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" id="listingsSearch" placeholder="Search listings...">
          </div>
        </div>
        <div class="a-bulk-bar" id="bulkBar">
          <span><span class="a-bulk-count" id="bulkCount">0</span> selected</span>
          <div class="a-bulk-actions">
            <button class="a-btn a-btn-success a-btn-sm" onclick="bulkAction('approve')">Approve All</button>
            <button class="a-btn a-btn-danger a-btn-sm" onclick="bulkReject()">Reject All</button>
            <button class="a-btn a-btn-ghost a-btn-sm" onclick="clearSelection()">Clear</button>
          </div>
        </div>
        <div class="a-table-wrap">
          <table class="a-table">
            <thead><tr>
              <th class="cb"><input type="checkbox" id="selectAll"></th>
              <th>Listing</th><th>Seller</th><th>Category</th><th>Price</th><th>Status</th><th>Date</th><th>Actions</th>
            </tr></thead>
            <tbody id="listingsBody"><tr><td colspan="8"><div class="a-empty"><p>Loading...</p></div></td></tr></tbody>
          </table>
        </div>
      </div>
    </section>

    <!-- USERS -->
    <section id="tab-users" class="a-section">
      <div class="a-page-header">
        <div><div class="a-page-eyebrow">Management</div><h1>Users</h1></div>
      </div>
      <div class="a-card">
        <div class="a-card-header">
          <div class="a-filter-row" id="usersFilterRow">
            <button class="a-filter-pill active" data-status="all">All</button>
            <button class="a-filter-pill" data-status="active">Active</button>
            <button class="a-filter-pill" data-status="suspended">Suspended</button>
          </div>
          <div class="a-search">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--text-3);flex-shrink:0"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" id="usersSearch" placeholder="Search by name or email...">
          </div>
        </div>
        <div class="a-table-wrap">
          <table class="a-table">
            <thead><tr><th>Student</th><th>University</th><th>Joined</th><th>Listings</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody id="usersBody"><tr><td colspan="6"><div class="a-empty"><p>Loading...</p></div></td></tr></tbody>
          </table>
        </div>
      </div>
    </section>

    <!-- REPORTS -->
    <section id="tab-reports" class="a-section">
      <div class="a-page-header">
        <div><div class="a-page-eyebrow">Disputes</div><h1>Reports</h1></div>
      </div>
      <div class="a-filter-row" id="reportsFilterRow" style="margin-bottom:16px">
        <button class="a-filter-pill active" data-status="open">Open</button>
        <button class="a-filter-pill" data-status="resolved">Resolved</button>
        <button class="a-filter-pill" data-status="all">All</button>
      </div>
      <div id="reportsContainer"><div class="a-empty"><p>Loading...</p></div></div>
    </section>

    <!-- CATEGORIES -->
    <section id="tab-categories" class="a-section">
      <div class="a-page-header">
        <div><div class="a-page-eyebrow">Platform</div><h1>Categories</h1></div>
        <button class="a-btn a-btn-primary" onclick="openAddCategory()">
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Category
        </button>
      </div>
      <div class="a-card" id="categoriesCard"><div class="a-empty"><p>Loading...</p></div></div>
    </section>

    <!-- ANNOUNCEMENTS -->
    <section id="tab-announcements" class="a-section">
      <div class="a-page-header">
        <div><div class="a-page-eyebrow">Broadcast</div><h1>Announcements</h1></div>
        <button class="a-btn a-btn-primary" onclick="openAddAnnouncement()">
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New Announcement
        </button>
      </div>
      <div class="a-card" id="announcementsCard"><div class="a-empty"><p>Loading...</p></div></div>
    </section>

    <!-- ACTIVITY LOG -->
    <section id="tab-log" class="a-section">
      <div class="a-page-header">
        <div><div class="a-page-eyebrow">Audit</div><h1>Activity Log</h1></div>
        <button class="a-btn a-btn-ghost" onclick="loadLog()">
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
          Refresh
        </button>
      </div>
      <div class="a-card">
        <div class="a-table-wrap">
          <table class="a-table">
            <thead><tr><th>Admin</th><th>Action</th><th>Target</th><th>Details</th><th>Time</th></tr></thead>
            <tbody id="logBody"><tr><td colspan="5"><div class="a-empty"><p>Loading...</p></div></td></tr></tbody>
          </table>
        </div>
      </div>
    </section>

  </main>
</div>

<!-- MODAL -->
<div class="a-modal-overlay" id="modalOverlay">
  <div class="a-modal">
    <div class="a-modal-header">
      <h3 id="modalTitle">Confirm</h3>
      <button class="a-modal-close" onclick="closeModal()">&times;</button>
    </div>
    <div class="a-modal-body" id="modalBody"></div>
    <div class="a-modal-footer">
      <button class="a-btn a-btn-ghost" onclick="closeModal()">Cancel</button>
      <button class="a-btn a-btn-primary" id="modalConfirmBtn">Confirm</button>
    </div>
  </div>
</div>

<div id="toast-container"></div>

<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>
<script src="/js/config.js"></script>
<script>window.sbClient = supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON);</script>
<script src="/js/api.js"></script>
<script src="/js/auth.js"></script>
<script src="/js/common.js"></script>
<script src="/js/admin.js"></script>
</body>
</html>`;

fs.writeFileSync(
  path.join(__dirname, '..', 'public', 'pages', 'admin.html'),
  html,
  'utf8'
);
console.log('admin.html written successfully (' + html.length + ' bytes)');
