// Chat Widget — AI chatbot + live chat with Mark
(function () {
  let sessionId = sessionStorage.getItem('ccw_chat_session');
  let chatStatus = 'ai';
  let pollInterval = null;
  let lastPollTime = '1970-01-01T00:00:00Z';
  let isOpen = false;
  let showingEscalateForm = false;

  const CALENDLY_URL = 'https://calendly.com'; // Updated once Mark's Calendly is set up

  // ── Build DOM ──────────────────────────────────
  function createWidget() {
    // Chat bubble
    const bubble = document.createElement('button');
    bubble.className = 'ccw-chat-bubble';
    bubble.id = 'ccw-bubble';
    bubble.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
    bubble.addEventListener('click', toggleChat);
    document.body.appendChild(bubble);

    // Chat window
    const win = document.createElement('div');
    win.className = 'ccw-chat-window';
    win.id = 'ccw-window';
    win.innerHTML = `
      <div class="ccw-chat-header">
        <div>
          <div class="ccw-chat-header-title">Chattanooga Clean Water</div>
          <div class="ccw-chat-status" id="ccw-status-text">Water Quality Assistant</div>
        </div>
        <button class="ccw-chat-close" id="ccw-close">&times;</button>
      </div>
      <div class="ccw-chat-messages" id="ccw-messages"></div>
      <div id="ccw-input-container">
        <div class="ccw-chat-input-area" id="ccw-input-area">
          <button class="ccw-chat-escalate-link" id="ccw-escalate-link">Talk to a real person</button>
          <div class="ccw-chat-input-row">
            <input type="text" class="ccw-chat-input" id="ccw-input" placeholder="Ask about Chattanooga water..." maxlength="2000" />
            <button class="ccw-chat-send" id="ccw-send">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
            </button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(win);

    // Event listeners
    document.getElementById('ccw-close').addEventListener('click', toggleChat);
    document.getElementById('ccw-send').addEventListener('click', sendMessage);
    document.getElementById('ccw-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
    document.getElementById('ccw-escalate-link').addEventListener('click', showEscalateForm);
  }

  // ── Toggle ─────────────────────────────────────
  function toggleChat() {
    isOpen = !isOpen;
    document.getElementById('ccw-window').classList.toggle('open', isOpen);
    document.getElementById('ccw-bubble').style.display = isOpen ? 'none' : 'flex';

    if (isOpen && !document.getElementById('ccw-messages').children.length) {
      // First open — show greeting or restore session
      if (sessionId) {
        restoreSession();
      } else {
        addMessage('ai', "Hi! I'm here to help with questions about water quality in the Chattanooga area. What would you like to know?");
      }
    }
  }

  // ── Messages ───────────────────────────────────
  function addMessage(role, content) {
    const container = document.getElementById('ccw-messages');
    const div = document.createElement('div');
    const roleClass = role === 'user' ? 'ccw-msg-user' : role === 'mark' ? 'ccw-msg-mark' : 'ccw-msg-ai';
    div.className = `ccw-msg ${roleClass}`;

    let labelText = '';
    if (role === 'mark') labelText = 'Mark';
    else if (role === 'ai') labelText = '';

    // Check for calendly trigger
    let extra = '';
    if (content.includes("Schedule a Callback")) {
      extra = `<br><a href="${CALENDLY_URL}" target="_blank" class="ccw-calendly-btn">Schedule a Callback</a>`;
    }

    div.innerHTML = (labelText ? `<div class="ccw-msg-label">${labelText}</div>` : '') + escHtml(content) + extra;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  }

  function showTyping() {
    const container = document.getElementById('ccw-messages');
    const div = document.createElement('div');
    div.className = 'ccw-typing';
    div.id = 'ccw-typing';
    div.textContent = 'Thinking';
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  }

  function hideTyping() {
    const el = document.getElementById('ccw-typing');
    if (el) el.remove();
  }

  // ── Send Message ───────────────────────────────
  async function sendMessage() {
    const input = document.getElementById('ccw-input');
    const text = input.value.trim();
    if (!text) return;

    input.value = '';
    addMessage('user', text);

    if (chatStatus === 'ai') {
      // Send to AI
      showTyping();
      try {
        const res = await fetch('/.netlify/functions/chat-ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: sessionId, message: text }),
        });
        const data = await res.json();
        hideTyping();

        if (data.session_id) {
          sessionId = data.session_id;
          sessionStorage.setItem('ccw_chat_session', sessionId);
        }

        if (data.reply) {
          addMessage('ai', data.reply);
        }

        if (data.status && data.status !== chatStatus) {
          updateStatus(data.status);
        }
      } catch (err) {
        hideTyping();
        addMessage('ai', "Sorry, I'm having trouble connecting. Please try again in a moment.");
      }
    } else if (chatStatus === 'waiting' || chatStatus === 'active') {
      // Send via chat-send
      try {
        await fetch('/.netlify/functions/chat-send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: sessionId, role: 'user', content: text }),
        });
      } catch (_) {}
    }
  }

  // ── Status Updates ─────────────────────────────
  function updateStatus(newStatus) {
    chatStatus = newStatus;
    const statusEl = document.getElementById('ccw-status-text');
    const escalateLink = document.getElementById('ccw-escalate-link');

    switch (newStatus) {
      case 'ai':
        statusEl.textContent = 'Water Quality Assistant';
        statusEl.classList.remove('live');
        if (escalateLink) escalateLink.style.display = 'block';
        break;
      case 'waiting':
        statusEl.textContent = 'Connecting you with Mark...';
        statusEl.classList.remove('live');
        if (escalateLink) escalateLink.style.display = 'none';
        startPolling();
        break;
      case 'active':
        statusEl.textContent = 'Chatting with Mark';
        statusEl.classList.add('live');
        if (escalateLink) escalateLink.style.display = 'none';
        break;
      case 'closed':
        statusEl.textContent = 'Chat ended';
        statusEl.classList.remove('live');
        stopPolling();
        showClosedState();
        break;
    }
  }

  // ── Escalation ─────────────────────────────────
  function showEscalateForm() {
    if (showingEscalateForm) return;
    showingEscalateForm = true;

    const container = document.getElementById('ccw-input-container');
    container.innerHTML = `
      <div class="ccw-escalate-form" id="ccw-escalate-form">
        <p>Enter your info and we'll connect you with Mark, our local water specialist.</p>
        <input type="text" id="ccw-esc-name" placeholder="First name" required />
        <input type="tel" id="ccw-esc-phone" placeholder="Phone number" required />
        <button class="ccw-escalate-btn" id="ccw-esc-submit">Connect Me</button>
        <button class="ccw-escalate-cancel" id="ccw-esc-cancel">Never mind</button>
      </div>
    `;

    document.getElementById('ccw-esc-submit').addEventListener('click', submitEscalation);
    document.getElementById('ccw-esc-cancel').addEventListener('click', cancelEscalation);
  }

  function cancelEscalation() {
    showingEscalateForm = false;
    restoreInputArea();
  }

  function restoreInputArea() {
    const container = document.getElementById('ccw-input-container');
    container.innerHTML = `
      <div class="ccw-chat-input-area" id="ccw-input-area">
        ${chatStatus === 'ai' ? '<button class="ccw-chat-escalate-link" id="ccw-escalate-link">Talk to a real person</button>' : ''}
        <div class="ccw-chat-input-row">
          <input type="text" class="ccw-chat-input" id="ccw-input" placeholder="${chatStatus === 'active' ? 'Message Mark...' : 'Ask about Chattanooga water...'}" maxlength="2000" />
          <button class="ccw-chat-send" id="ccw-send">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
          </button>
        </div>
      </div>
    `;

    document.getElementById('ccw-send').addEventListener('click', sendMessage);
    document.getElementById('ccw-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });

    const escLink = document.getElementById('ccw-escalate-link');
    if (escLink) escLink.addEventListener('click', showEscalateForm);
  }

  async function submitEscalation() {
    const name = document.getElementById('ccw-esc-name').value.trim();
    const phone = document.getElementById('ccw-esc-phone').value.trim();

    if (!name || !phone) return;

    const btn = document.getElementById('ccw-esc-submit');
    btn.textContent = 'Connecting...';
    btn.disabled = true;

    try {
      const res = await fetch('/.netlify/functions/chat-escalate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, first_name: name, phone }),
      });

      const data = await res.json();

      if (data.success) {
        showingEscalateForm = false;
        updateStatus('waiting');
        restoreInputArea();
        // The escalation function inserts a system message — poll will pick it up
        pollNow();
      }
    } catch (err) {
      btn.textContent = 'Connect Me';
      btn.disabled = false;
      addMessage('ai', "Sorry, there was a problem connecting you. Please try again.");
    }
  }

  // ── Polling ────────────────────────────────────
  function startPolling() {
    if (pollInterval) return;
    pollInterval = setInterval(pollNow, 3000);
  }

  function stopPolling() {
    if (pollInterval) {
      clearInterval(pollInterval);
      pollInterval = null;
    }
  }

  async function pollNow() {
    if (!sessionId) return;

    try {
      const res = await fetch(`/.netlify/functions/chat-poll?session_id=${sessionId}&since=${encodeURIComponent(lastPollTime)}`);
      const data = await res.json();

      if (data.messages && data.messages.length) {
        data.messages.forEach(m => {
          // Don't re-render user messages we already showed
          if (m.role !== 'user') {
            addMessage(m.role, m.content);
          }
          lastPollTime = m.created_at;
        });
      }

      if (data.status !== chatStatus) {
        updateStatus(data.status);
        if (data.status === 'active') {
          restoreInputArea();
        }
      }
    } catch (_) {}
  }

  // ── Closed State ───────────────────────────────
  function showClosedState() {
    const container = document.getElementById('ccw-input-container');
    container.innerHTML = `<button class="ccw-new-chat-btn" id="ccw-new-chat">Start New Chat</button>`;
    document.getElementById('ccw-new-chat').addEventListener('click', () => {
      sessionId = null;
      sessionStorage.removeItem('ccw_chat_session');
      chatStatus = 'ai';
      lastPollTime = '1970-01-01T00:00:00Z';
      showingEscalateForm = false;
      document.getElementById('ccw-messages').innerHTML = '';
      restoreInputArea();
      updateStatus('ai');
      addMessage('ai', "Hi! I'm here to help with questions about water quality in the Chattanooga area. What would you like to know?");
    });
  }

  // ── Restore Session ────────────────────────────
  async function restoreSession() {
    try {
      const res = await fetch(`/.netlify/functions/chat-poll?session_id=${sessionId}&since=1970-01-01T00:00:00Z`);
      const data = await res.json();

      if (data.messages) {
        data.messages.forEach(m => {
          addMessage(m.role, m.content);
          lastPollTime = m.created_at;
        });
      }

      if (data.status) {
        updateStatus(data.status);
        if (data.status === 'waiting' || data.status === 'active') {
          restoreInputArea();
          startPolling();
        }
      }
    } catch (_) {
      // Session might be gone — start fresh
      sessionId = null;
      sessionStorage.removeItem('ccw_chat_session');
      addMessage('ai', "Hi! I'm here to help with questions about water quality in the Chattanooga area. What would you like to know?");
    }
  }

  // ── Util ───────────────────────────────────────
  function escHtml(str) {
    const el = document.createElement('span');
    el.textContent = str;
    return el.innerHTML;
  }

  // ── Init ───────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createWidget);
  } else {
    createWidget();
  }
})();
