// Admin Dashboard — Auth, CRUD, Filtering, Sorting

let leads = [];
let sortField = 'created_at';
let sortDir = 'desc';

// ── Auth ──────────────────────────────────────────
function getPassword() {
  return sessionStorage.getItem('ccw_admin_pw');
}

function apiHeaders() {
  return {
    'Content-Type': 'application/json',
    'X-Admin-Password': getPassword(),
  };
}

// Login
document.getElementById('login-btn').addEventListener('click', attemptLogin);
document.getElementById('password-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') attemptLogin();
});

async function attemptLogin() {
  const pw = document.getElementById('password-input').value;
  if (!pw) return;

  try {
    const res = await fetch('/.netlify/functions/get-leads', {
      headers: { 'X-Admin-Password': pw },
    });

    if (res.status === 401) {
      document.getElementById('login-error').classList.add('show');
      return;
    }

    if (!res.ok) throw new Error('Server error');

    sessionStorage.setItem('ccw_admin_pw', pw);
    leads = await res.json();

    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('dashboard').classList.add('show');
    renderAll();

  } catch (err) {
    document.getElementById('login-error').textContent = 'Connection error. Try again.';
    document.getElementById('login-error').classList.add('show');
  }
}

// Auto-login if password in session
(async () => {
  const pw = getPassword();
  if (!pw) return;

  try {
    const res = await fetch('/.netlify/functions/get-leads', {
      headers: { 'X-Admin-Password': pw },
    });

    if (!res.ok) {
      sessionStorage.removeItem('ccw_admin_pw');
      return;
    }

    leads = await res.json();
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('dashboard').classList.add('show');
    renderAll();
  } catch (_) {
    sessionStorage.removeItem('ccw_admin_pw');
  }
})();

// Logout
document.getElementById('logout-btn').addEventListener('click', () => {
  sessionStorage.removeItem('ccw_admin_pw');
  location.reload();
});

// ── Rendering ─────────────────────────────────────
function renderAll() {
  renderStats();
  renderTable();
  fetchAnalytics(currentRange);
  startSessionPolling();
}

function renderStats() {
  document.getElementById('stat-total').textContent = leads.length;
  document.getElementById('stat-a').textContent = leads.filter(l => l.variant === 'A').length;
  document.getElementById('stat-b').textContent = leads.filter(l => l.variant === 'B').length;
  document.getElementById('stat-c').textContent = leads.filter(l => l.variant === 'C').length;
}

function getFilteredLeads() {
  const search = document.getElementById('search-input').value.toLowerCase();
  const variant = document.getElementById('variant-filter').value;
  const status = document.getElementById('status-filter').value;

  return leads.filter(l => {
    if (variant && l.variant !== variant) return false;
    if (status && l.status !== status) return false;
    if (search) {
      const hay = `${l.first_name} ${l.last_name} ${l.email || ''} ${l.phone || ''}`.toLowerCase();
      if (!hay.includes(search)) return false;
    }
    return true;
  });
}

function sortLeads(list) {
  return [...list].sort((a, b) => {
    let valA, valB;

    switch (sortField) {
      case 'name':
        valA = `${a.first_name} ${a.last_name}`.toLowerCase();
        valB = `${b.first_name} ${b.last_name}`.toLowerCase();
        break;
      case 'created_at':
        valA = a.created_at || '';
        valB = b.created_at || '';
        break;
      default:
        valA = (a[sortField] || '').toLowerCase();
        valB = (b[sortField] || '').toLowerCase();
    }

    if (valA < valB) return sortDir === 'asc' ? -1 : 1;
    if (valA > valB) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });
}

function renderTable() {
  const filtered = sortLeads(getFilteredLeads());
  const tbody = document.getElementById('leads-body');
  const empty = document.getElementById('empty-state');

  if (filtered.length === 0) {
    tbody.innerHTML = '';
    empty.style.display = 'block';
    return;
  }

  empty.style.display = 'none';

  tbody.innerHTML = filtered.map(l => `
    <tr>
      <td>${esc(l.first_name)} ${esc(l.last_name)}</td>
      <td>${l.email ? esc(l.email) : '<span style="color:#AAA">—</span>'}</td>
      <td>${l.phone ? esc(l.phone) : '<span style="color:#AAA">—</span>'}</td>
      <td><span class="variant-tag">${esc(l.variant)}</span></td>
      <td>${statusBadge(l.status)}</td>
      <td>${formatDate(l.created_at)}</td>
      <td><button class="btn btn-sm btn-primary" onclick="openEdit('${l.id}')">Edit</button></td>
    </tr>
  `).join('');

  // Update sort arrows
  document.querySelectorAll('th[data-sort]').forEach(th => {
    const arrow = th.querySelector('.sort-arrow');
    if (th.dataset.sort === sortField) {
      arrow.textContent = sortDir === 'asc' ? ' ▲' : ' ▼';
    } else {
      arrow.textContent = '';
    }
  });
}

function statusBadge(status) {
  const cls = {
    'New': 'badge-new',
    'Contacted': 'badge-contacted',
    'Qualified': 'badge-qualified',
    'Closed-Won': 'badge-won',
    'Closed-Lost': 'badge-lost',
  }[status] || 'badge-new';
  return `<span class="badge ${cls}">${esc(status)}</span>`;
}

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function esc(str) {
  if (!str) return '';
  const el = document.createElement('span');
  el.textContent = str;
  return el.innerHTML;
}

// ── Sorting ───────────────────────────────────────
document.querySelectorAll('th[data-sort]').forEach(th => {
  th.addEventListener('click', () => {
    const field = th.dataset.sort;
    if (sortField === field) {
      sortDir = sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      sortField = field;
      sortDir = 'asc';
    }
    renderTable();
  });
});

// ── Filtering ─────────────────────────────────────
document.getElementById('search-input').addEventListener('input', renderTable);
document.getElementById('variant-filter').addEventListener('change', renderTable);
document.getElementById('status-filter').addEventListener('change', renderTable);

// ── Edit Modal ────────────────────────────────────
window.openEdit = function(id) {
  const lead = leads.find(l => l.id === id);
  if (!lead) return;

  document.getElementById('edit-id').value = id;
  document.getElementById('edit-status').value = lead.status;
  document.getElementById('edit-notes').value = lead.notes || '';
  document.getElementById('modal-overlay').classList.add('show');
};

document.getElementById('modal-cancel').addEventListener('click', closeModal);
document.getElementById('modal-overlay').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) closeModal();
});

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('show');
}

document.getElementById('modal-save').addEventListener('click', async () => {
  const id = document.getElementById('edit-id').value;
  const status = document.getElementById('edit-status').value;
  const notes = document.getElementById('edit-notes').value;

  const saveBtn = document.getElementById('modal-save');
  saveBtn.textContent = 'Saving...';
  saveBtn.disabled = true;

  try {
    const res = await fetch('/.netlify/functions/update-lead', {
      method: 'POST',
      headers: apiHeaders(),
      body: JSON.stringify({ id, status, notes }),
    });

    if (!res.ok) throw new Error('Update failed');

    const updated = await res.json();

    // Update local data
    const idx = leads.findIndex(l => l.id === id);
    if (idx !== -1 && updated[0]) {
      leads[idx] = updated[0];
    }

    closeModal();
    renderAll();

  } catch (err) {
    alert('Failed to update lead. Please try again.');
  } finally {
    saveBtn.textContent = 'Save';
    saveBtn.disabled = false;
  }
});

// ── Keyboard shortcuts ────────────────────────────
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeModal();
    closeChatModal();
  }
});

// ── Live Chats ────────────────────────────────────
let chatSessions = [];
let activeChatId = null;
let chatPollInterval = null;
let sessionPollInterval = null;
let chatLastPoll = '1970-01-01T00:00:00Z';

// Start polling for sessions when dashboard loads
function startSessionPolling() {
  fetchChatSessions();
  fetchAvailability();
  sessionPollInterval = setInterval(fetchChatSessions, 10000);
}

// Availability toggle
async function fetchAvailability() {
  try {
    const res = await fetch('/.netlify/functions/chat-status', {
      method: 'POST',
      headers: apiHeaders(),
      body: JSON.stringify({ action: 'get_availability' }),
    });
    if (!res.ok) return;
    const data = await res.json();
    const checkbox = document.getElementById('avail-checkbox');
    const label = document.getElementById('avail-label');
    checkbox.checked = data.available;
    label.textContent = data.available ? 'Available' : 'Away';
  } catch (_) {}
}

document.getElementById('avail-checkbox').addEventListener('change', async (e) => {
  const available = e.target.checked;
  const label = document.getElementById('avail-label');
  label.textContent = available ? 'Available' : 'Away';

  try {
    await fetch('/.netlify/functions/chat-status', {
      method: 'POST',
      headers: apiHeaders(),
      body: JSON.stringify({ action: 'set_availability', available }),
    });
  } catch (_) {}
});

async function fetchChatSessions() {
  try {
    const res = await fetch('/.netlify/functions/chat-sessions', {
      headers: { 'X-Admin-Password': getPassword() },
    });
    if (!res.ok) return;
    chatSessions = await res.json();
    renderChatSessions();
  } catch (_) {}
}

function renderChatSessions() {
  const list = document.getElementById('chat-sessions-list');
  const badge = document.getElementById('chat-count-badge');

  const waiting = chatSessions.filter(s => s.status === 'waiting');

  if (waiting.length > 0) {
    badge.textContent = waiting.length;
    badge.style.display = 'inline';
  } else {
    badge.style.display = 'none';
  }

  if (!chatSessions.length) {
    list.innerHTML = '<div class="analytics-empty">No active chats.</div>';
    return;
  }

  list.innerHTML = chatSessions.map(s => {
    const name = s.user_name || 'Anonymous';
    const statusCls = s.status === 'waiting' ? 'badge-waiting' : s.status === 'active' ? 'badge-active-chat' : 'badge-ai';
    const statusLabel = s.status === 'waiting' ? 'Waiting' : s.status === 'active' ? 'Live' : 'AI';
    const preview = s.last_message ? (s.last_message.length > 60 ? s.last_message.slice(0, 60) + '...' : s.last_message) : '';
    const time = timeAgo(s.updated_at);

    return `
      <div class="chat-card" onclick="openChatPanel('${s.id}')">
        <div class="chat-card-info">
          <div class="chat-card-name">${esc(name)} ${s.user_phone ? '(' + esc(s.user_phone) + ')' : ''} <span class="badge ${statusCls}">${statusLabel}</span></div>
          <div class="chat-card-preview">${esc(preview)}</div>
        </div>
        <div class="chat-card-time">${time}</div>
      </div>
    `;
  }).join('');
}

function timeAgo(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return mins + 'm ago';
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + 'h ago';
  return Math.floor(hrs / 24) + 'd ago';
}

// Chat modal
window.openChatPanel = async function(sessionId) {
  activeChatId = sessionId;
  chatLastPoll = '1970-01-01T00:00:00Z';

  const session = chatSessions.find(s => s.id === sessionId);
  document.getElementById('chat-modal-name').textContent = session?.user_name || 'Chat';
  document.getElementById('chat-modal-phone').textContent = session?.user_phone || '';

  const isActive = session?.status === 'active';
  const isWaiting = session?.status === 'waiting';

  document.getElementById('chat-join-btn').style.display = isWaiting ? 'inline-block' : 'none';
  document.getElementById('chat-unavail-btn').style.display = isWaiting ? 'inline-block' : 'none';
  document.getElementById('chat-close-btn').style.display = (isActive || isWaiting) ? 'inline-block' : 'none';
  document.getElementById('chat-mark-input').disabled = !isActive;
  document.getElementById('chat-mark-send').disabled = !isActive;

  document.getElementById('chat-modal-messages').innerHTML = '';
  document.getElementById('chat-modal-overlay').classList.add('show');

  // Load all messages
  await pollChatMessages(true);

  // Start polling
  if (chatPollInterval) clearInterval(chatPollInterval);
  chatPollInterval = setInterval(() => pollChatMessages(false), 3000);
};

async function pollChatMessages(loadAll) {
  if (!activeChatId) return;
  const since = loadAll ? '1970-01-01T00:00:00Z' : chatLastPoll;

  try {
    const res = await fetch(`/.netlify/functions/chat-poll?session_id=${activeChatId}&since=${encodeURIComponent(since)}`);
    const data = await res.json();

    if (data.messages && data.messages.length) {
      const container = document.getElementById('chat-modal-messages');
      if (loadAll) container.innerHTML = '';

      data.messages.forEach(m => {
        const div = document.createElement('div');
        const cls = m.role === 'user' ? 'chat-modal-msg-user' : m.role === 'mark' ? 'chat-modal-msg-mark' : 'chat-modal-msg-ai';
        const label = m.role === 'user' ? 'Customer' : m.role === 'mark' ? 'Mark' : 'AI';
        div.className = `chat-modal-msg ${cls}`;
        div.innerHTML = `<div class="chat-modal-msg-label">${label}</div>${esc(m.content)}`;
        container.appendChild(div);
        chatLastPoll = m.created_at;
      });

      container.scrollTop = container.scrollHeight;
    }

    // Update button states if status changed
    if (data.status) {
      const session = chatSessions.find(s => s.id === activeChatId);
      if (session) session.status = data.status;

      const isActive = data.status === 'active';
      const isWaiting = data.status === 'waiting';
      document.getElementById('chat-join-btn').style.display = isWaiting ? 'inline-block' : 'none';
      document.getElementById('chat-unavail-btn').style.display = isWaiting ? 'inline-block' : 'none';
      document.getElementById('chat-close-btn').style.display = (isActive || isWaiting) ? 'inline-block' : 'none';
      document.getElementById('chat-mark-input').disabled = !isActive;
      document.getElementById('chat-mark-send').disabled = !isActive;

      if (data.status === 'closed') {
        document.getElementById('chat-mark-input').disabled = true;
        document.getElementById('chat-mark-send').disabled = true;
      }
    }
  } catch (_) {}
}

function closeChatModal() {
  document.getElementById('chat-modal-overlay').classList.remove('show');
  activeChatId = null;
  if (chatPollInterval) {
    clearInterval(chatPollInterval);
    chatPollInterval = null;
  }
}

document.getElementById('chat-modal-overlay').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) closeChatModal();
});
document.getElementById('chat-modal-close').addEventListener('click', closeChatModal);

// Join chat
document.getElementById('chat-join-btn').addEventListener('click', async () => {
  if (!activeChatId) return;
  await fetch('/.netlify/functions/chat-status', {
    method: 'POST',
    headers: apiHeaders(),
    body: JSON.stringify({ session_id: activeChatId, status: 'active' }),
  });
  document.getElementById('chat-join-btn').style.display = 'none';
  document.getElementById('chat-unavail-btn').style.display = 'none';
  document.getElementById('chat-mark-input').disabled = false;
  document.getElementById('chat-mark-send').disabled = false;
  document.getElementById('chat-mark-input').focus();
  pollChatMessages(false);
  fetchChatSessions();
});

// Mark unavailable
document.getElementById('chat-unavail-btn').addEventListener('click', async () => {
  if (!activeChatId) return;
  await fetch('/.netlify/functions/chat-status', {
    method: 'POST',
    headers: apiHeaders(),
    body: JSON.stringify({ session_id: activeChatId, status: 'unavailable' }),
  });
  closeChatModal();
  fetchChatSessions();
});

// Close chat
document.getElementById('chat-close-btn').addEventListener('click', async () => {
  if (!activeChatId) return;
  await fetch('/.netlify/functions/chat-status', {
    method: 'POST',
    headers: apiHeaders(),
    body: JSON.stringify({ session_id: activeChatId, status: 'closed' }),
  });
  closeChatModal();
  fetchChatSessions();
});

// Send Mark's message
document.getElementById('chat-mark-send').addEventListener('click', sendMarkMessage);
document.getElementById('chat-mark-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMarkMessage();
  }
});

async function sendMarkMessage() {
  const input = document.getElementById('chat-mark-input');
  const text = input.value.trim();
  if (!text || !activeChatId) return;

  input.value = '';

  // Optimistic render
  const container = document.getElementById('chat-modal-messages');
  const div = document.createElement('div');
  div.className = 'chat-modal-msg chat-modal-msg-mark';
  div.innerHTML = `<div class="chat-modal-msg-label">Mark</div>${esc(text)}`;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;

  await fetch('/.netlify/functions/chat-send', {
    method: 'POST',
    headers: apiHeaders(),
    body: JSON.stringify({ session_id: activeChatId, role: 'mark', content: text }),
  });
}

// Refresh button
document.getElementById('refresh-chats').addEventListener('click', fetchChatSessions);

// ── Analytics ─────────────────────────────────────
let currentRange = 7;

// Range toggle buttons
document.querySelectorAll('.range-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.range-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentRange = parseInt(btn.dataset.days, 10);
    fetchAnalytics(currentRange);
  });
});

async function fetchAnalytics(days) {
  try {
    const res = await fetch(`/.netlify/functions/get-analytics?days=${days}`, {
      headers: { 'X-Admin-Password': getPassword() },
    });

    if (!res.ok) return;

    const data = await res.json();
    renderAnalytics(data, days);
  } catch (_) {
    // Silently fail — analytics shouldn't block the dashboard
  }
}

function renderAnalytics(data, days) {
  // Overview stats
  document.getElementById('stat-views').textContent = data.totalViews.toLocaleString();
  document.getElementById('stat-leads-period').textContent = data.totalLeads.toLocaleString();

  const convRate = data.totalViews > 0
    ? ((data.totalLeads / data.totalViews) * 100).toFixed(1) + '%'
    : '0%';
  document.getElementById('stat-conversion').textContent = convRate;

  // Build chart
  renderChart(data.viewsByDay, data.leadsByDay, days);

  // Top pages
  renderTopPages(data.topPages);

  // A/B performance
  renderABPerformance(data.viewsByVariant, data.leadsByVariant);
}

function renderChart(viewsByDay, leadsByDay, days) {
  const container = document.getElementById('chart-container');

  // Generate all dates in range
  const dates = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    dates.push(d.toISOString().slice(0, 10));
  }

  const maxViews = Math.max(1, ...dates.map(d => viewsByDay[d] || 0));
  const maxLeads = Math.max(1, ...dates.map(d => leadsByDay[d] || 0));
  const maxVal = Math.max(maxViews, maxLeads);

  container.innerHTML = dates.map(d => {
    const views = viewsByDay[d] || 0;
    const leads = leadsByDay[d] || 0;
    const viewH = Math.max(2, (views / maxVal) * 100);
    const leadH = Math.max(leads > 0 ? 4 : 0, (leads / maxVal) * 100);
    const label = new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    return `
      <div class="chart-bar-group" title="${label}: ${views} views, ${leads} leads">
        <div class="chart-bars">
          <div class="chart-bar views" style="height:${viewH}%"></div>
          ${leads > 0 ? `<div class="chart-bar leads" style="height:${leadH}%"></div>` : ''}
        </div>
        ${days <= 14 ? `<div class="chart-label">${label.split(' ')[1]}</div>` : ''}
      </div>
    `;
  }).join('') + `
    <div class="chart-legend" style="position:absolute;bottom:-28px;left:0;">
      <span><span class="chart-legend-dot views"></span> Views</span>
      <span><span class="chart-legend-dot leads"></span> Leads</span>
    </div>
  `;

  container.style.position = 'relative';
  container.style.marginBottom = '36px';
}

function renderTopPages(topPages) {
  const el = document.getElementById('top-pages');

  if (!topPages.length) {
    el.innerHTML = '<div class="analytics-empty">No page views yet.</div>';
    return;
  }

  el.innerHTML = topPages.map(p => `
    <div class="top-page-row">
      <span class="top-page-path" title="${esc(p.page)}">${esc(p.page)}</span>
      <span class="top-page-count">${p.count} views</span>
    </div>
  `).join('');
}

function renderABPerformance(viewsByVariant, leadsByVariant) {
  const el = document.getElementById('ab-performance');

  const variants = ['A', 'B', 'C'];
  const labels = { A: 'Email', B: 'Phone', C: 'Both' };

  const rows = variants.map(v => {
    const views = viewsByVariant[v] || 0;
    const leads = leadsByVariant[v] || 0;
    const rate = views > 0 ? ((leads / views) * 100).toFixed(1) : '0.0';
    const rateNum = parseFloat(rate);

    let rateClass = 'conversion-low';
    if (rateNum >= 5) rateClass = 'conversion-good';
    else if (rateNum >= 2) rateClass = 'conversion-mid';

    return `
      <tr>
        <td><span class="variant-tag">${v}</span> ${labels[v]}</td>
        <td>${views}</td>
        <td>${leads}</td>
        <td class="${rateClass}">${rate}%</td>
      </tr>
    `;
  });

  el.innerHTML = `
    <table class="ab-table">
      <thead>
        <tr>
          <th>Variant</th>
          <th>Views</th>
          <th>Leads</th>
          <th>Conv. Rate</th>
        </tr>
      </thead>
      <tbody>${rows.join('')}</tbody>
    </table>
  `;
}
