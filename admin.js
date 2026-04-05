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
  if (e.key === 'Escape') closeModal();
});
