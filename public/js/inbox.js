(async () => {
  if (!Auth.requireAuth()) return;

  const chatList   = document.getElementById('chatList');
  const chatThread = document.getElementById('chatThread');
  const chatSearch = document.getElementById('chatSearch');

  let me                   = null;
  let activeConvId         = null;
  let rtChannel            = null;
  let allConversations     = [];

  // Get profile
  me = await Auth.getProfile();

  const esc = (str) => String(str).replace(/[<>&"']/g, c =>
    ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c]));

  // ── Supabase Realtime subscription helpers ──────────────────────────────────
  const subscribeToConversation = (convId) => {
    unsubscribeRT();
    rtChannel = window.sbClient
      .channel(`inbox-conv-${convId}`)
      .on('postgres_changes', {
        event:  'INSERT',
        schema: 'public',
        table:  'messages',
        filter: `conversation_id=eq.${convId}`,
      }, (payload) => {
        appendBubble(payload.new);
      })
      .subscribe();
  };

  const subscribeToAllConversations = () => {
    // Global channel to catch messages for conversations not currently open
    if (!me?.id) return;
    window._inboxGlobalChannel = window.sbClient
      .channel('inbox-global')
      .on('postgres_changes', {
        event:  'INSERT',
        schema: 'public',
        table:  'messages',
      }, (payload) => {
        const msg = payload.new;
        // Only mark as unread for messages from other users in different conversations
        if (msg.conversation_id !== activeConvId && msg.sender_id !== me?.id) {
          const item = chatList.querySelector(`[data-id="${msg.conversation_id}"]`);
          if (item) item.classList.add('unread');
        }
      })
      .subscribe();
  };

  const unsubscribeRT = () => {
    if (rtChannel) {
      window.sbClient.removeChannel(rtChannel);
      rtChannel = null;
    }
  };

  const cleanupAllChannels = () => {
    unsubscribeRT();
    if (window._inboxGlobalChannel) {
      window.sbClient.removeChannel(window._inboxGlobalChannel);
      window._inboxGlobalChannel = null;
    }
  };

  // Cleanup on page unload
  window.addEventListener('beforeunload', cleanupAllChannels);

  const appendBubble = (msg) => {
    const thread = chatThread.querySelector('.chat-messages');
    if (!thread) return;
    const isSelf = msg.sender_id === me?.id;
    const row = document.createElement('div');
    row.className = `bubble-row ${isSelf ? 'self' : 'other'}`;
    row.innerHTML = `<div class="bubble ${isSelf ? 'self' : 'other'}">${esc(msg.content)}</div>`;
    thread.appendChild(row);
    thread.scrollTop = thread.scrollHeight;
  };

  const renderConversations = (convs) => {
    chatList.innerHTML = convs.length
      ? convs.map(c => `
          <div class="chat-item ${c.id === activeConvId ? 'active' : ''}" data-id="${c.id}">
            ${avatarHtml(c.other_user || {}, 'xs')}
            <div class="chat-item-info">
              <div class="chat-item-name">${esc(c.other_user?.name || 'Student')}</div>
              <div class="chat-item-preview">${esc(c.last_message || 'No messages yet')}</div>
            </div>
          </div>`).join('')
      : '<div style="padding:2rem;text-align:center;color:var(--text-muted)">No conversations yet.</div>';

    chatList.querySelectorAll('.chat-item').forEach(item => {
      item.addEventListener('click', () => openConversation(item.dataset.id));
    });
  };

  const openConversation = async (id) => {
    activeConvId = id;

    // Subscribe to realtime updates for this conversation
    subscribeToConversation(id);

    chatList.querySelectorAll('.chat-item').forEach(el =>
      el.classList.toggle('active', el.dataset.id === id));

    const conv = allConversations.find(c => c.id === id);
    chatThread.innerHTML = `
      <div class="chat-thread-header">
        ${avatarHtml(conv?.other_user || {}, 'xs')}
        <div class="chat-thread-name">${esc(conv?.other_user?.name || 'Student')}</div>
      </div>
      <div class="chat-messages" style="flex:1;overflow-y:auto;padding:1rem;display:flex;flex-direction:column;gap:.4rem">
        <div style="text-align:center;padding:1rem;color:var(--text-muted);font-size:.82rem">Loading messages…</div>
      </div>
      <form class="chat-input-row" id="msgForm">
        <input type="text" id="msgInput" placeholder="Type a message…" autocomplete="off">
        <button type="submit" class="btn btn-primary btn-sm">Send</button>
      </form>`;

    try {
      const { messages } = await api.get(`/api/chat/conversations/${id}/messages`);
      const thread = chatThread.querySelector('.chat-messages');
      thread.innerHTML = messages.length
        ? messages.map(m => `
            <div class="bubble-row ${m.sender_id === me?.id ? 'self' : 'other'}">
              <div class="bubble ${m.sender_id === me?.id ? 'self' : 'other'}">${esc(m.content)}</div>
            </div>`).join('')
        : '<div style="text-align:center;color:var(--text-muted);padding:1rem">Say hello!</div>';
      thread.scrollTop = thread.scrollHeight;
    } catch (err) {
      const thread = chatThread.querySelector('.chat-messages');
      if (thread) thread.innerHTML = `<p style="color:var(--red);text-align:center">${esc(err.message)}</p>`;
    }

    document.getElementById('msgForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const input   = document.getElementById('msgInput');
      const content = input.value.trim();
      if (!content) return;
      input.value = '';
      try {
        await api.post(`/api/chat/conversations/${id}/messages`, { content });
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  };

  const ensureConvFromParams = async () => {
    const params   = new URLSearchParams(window.location.search);
    const sellerId = params.get('sellerId');
    if (!sellerId) return null;
    try {
      const res = await api.post('/api/chat/conversations', {
        sellerId,
        listingId: params.get('listingId'),
      });
      return res?.conversation?.id || res?.id;
    } catch { return null; }
  };

  const loadConversations = async () => {
    try {
      const { conversations } = await api.get('/api/chat/conversations');
      allConversations = conversations || [];
      renderConversations(allConversations);
      return allConversations;
    } catch (err) {
      chatList.innerHTML = `<p style="color:var(--red);padding:1rem">${esc(err.message)}</p>`;
      return [];
    }
  };

  chatSearch?.addEventListener('input', () => {
    const q = chatSearch.value.toLowerCase();
    renderConversations(allConversations.filter(c =>
      (c.other_user?.name || '').toLowerCase().includes(q)));
  });

  // Initialize: subscribe to global notifications and load conversations
  subscribeToAllConversations();
  const convId = await ensureConvFromParams();
  const convs  = await loadConversations();
  const openId = convId || convs[0]?.id;
  if (openId) await openConversation(openId);
})();
