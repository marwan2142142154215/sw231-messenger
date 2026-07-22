const API = '';
let token = localStorage.getItem('admin_token');

async function api(method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  if (token) opts.headers['Authorization'] = `Bearer ${token}`;
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${API}${path}`, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  const errEl = document.getElementById('login-error');
  errEl.textContent = '';

  try {
    const data = await api('POST', '/api/auth/login', { username, password });
    if (data.user.role !== 'master') {
      errEl.textContent = 'Hanya Master Admin yang diizinkan.';
      return;
    }
    token = data.token;
    localStorage.setItem('admin_token', token);
    showAdminPanel();
  } catch (err) {
    errEl.textContent = err.message;
  }
});

function showAdminPanel() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('admin-panel').style.display = 'flex';
  loadDashboard();
}

document.getElementById('logout-btn').addEventListener('click', async () => {
  try { await api('POST', '/api/auth/logout'); } catch(e) {}
  token = null;
  localStorage.removeItem('admin_token');
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('admin-panel').style.display = 'none';
});

document.querySelectorAll('.nav-links li').forEach(li => {
  li.addEventListener('click', () => {
    document.querySelectorAll('.nav-links li').forEach(l => l.classList.remove('active'));
    li.classList.add('active');
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.getElementById(`tab-${li.dataset.tab}`).classList.add('active');
    loadTabData(li.dataset.tab);
  });
});

async function loadTabData(tab) {
  const loaders = {
    dashboard: loadDashboard,
    users: loadUsers,
    pending: loadPending,
    security: loadSecurity,
    firewall: loadFirewall,
    logs: loadLogs,
    passwords: () => {}
  };
  if (loaders[tab]) await loaders[tab]();
}

async function loadDashboard() {
  try {
    const data = await api('GET', '/api/admin/stats');
    const s = data.stats;
    document.getElementById('stats-grid').innerHTML = `
      <div class="stat-card"><div class="stat-value">${s.totalUsers}</div><div class="stat-label">Total Users</div></div>
      <div class="stat-card"><div class="stat-value">${s.approvedUsers}</div><div class="stat-label">Approved</div></div>
      <div class="stat-card"><div class="stat-value">${s.pendingUsers}</div><div class="stat-label">Pending</div></div>
      <div class="stat-card"><div class="stat-value">${s.onlineUsers}</div><div class="stat-label">Online Now</div></div>
      <div class="stat-card"><div class="stat-value">${s.totalMessages}</div><div class="stat-label">Total Messages</div></div>
      <div class="stat-card"><div class="stat-value">${s.totalConversations}</div><div class="stat-label">Conversations</div></div>
      <div class="stat-card"><div class="stat-value">${s.encryptionKeys}</div><div class="stat-label">Encryption Keys</div></div>
      <div class="stat-card"><div class="stat-value">${Math.floor(s.uptime)}s</div><div class="stat-label">Uptime</div></div>
    `;

    document.getElementById('system-info').innerHTML = `
<b>Server Status:</b> Running
<b>Uptime:</b> ${Math.floor(s.uptime)} seconds
<b>Encryption Keys Active:</b> ${s.encryptionKeys}
<b>Security Cycles:</b> Active (1s rehash, 60s parcels)
<b>Firewall Status:</b> ${data.firewall.totalBlocked > 0 ? 'BLOCKING ' + data.firewall.totalBlocked + ' IPs' : 'Active - No blocks'}
<b>Active Connections:</b> ${data.firewall.activeIPs}
<b>Total Admin Actions:</b> ${data.recentLogs.length}
    `.trim();
  } catch (err) {
    document.getElementById('stats-grid').innerHTML = `<div class="error-msg">${err.message}</div>`;
  }
}

async function loadUsers() {
  try {
    const data = await api('GET', '/api/admin/users');
    let html = `<table>
      <thead><tr><th>Username</th><th>Display Name</th><th>Role</th><th>Status</th><th>Messages</th><th>Sessions</th><th>Joined</th><th>Actions</th></tr></thead>
      <tbody>`;

    data.users.forEach(u => {
      html += `<tr>
        <td><b>${u.username}</b></td>
        <td>${u.display_name}</td>
        <td><span class="badge badge-${u.role}">${u.role}</span></td>
        <td><span class="badge badge-${u.status}">${u.status}</span></td>
        <td>${u.messageCount}</td>
        <td>${u.sessionCount}</td>
        <td>${new Date(u.created_at).toLocaleDateString()}</td>
        <td>
          ${u.role !== 'master' ? `
            <button class="btn-action btn-sm btn-warning" onclick="banUser('${u.id}')">Ban</button>
            <button class="btn-action btn-sm btn-success" onclick="viewPassword('${u.id}')">Password</button>
          ` : '<span style="color:var(--text-secondary)">Protected</span>'}
        </td>
      </tr>`;
    });

    html += '</tbody></table>';
    document.getElementById('users-table').innerHTML = html;
  } catch (err) {
    document.getElementById('users-table').innerHTML = `<div class="error-msg">${err.message}</div>`;
  }
}

async function loadPending() {
  try {
    const data = await api('GET', '/api/admin/users');
    const pending = data.users.filter(u => !u.is_approved);

    if (pending.length === 0) {
      document.getElementById('pending-table').innerHTML = '<p style="padding:20px;color:var(--text-secondary)">No pending approvals.</p>';
      return;
    }

    let html = `<table>
      <thead><tr><th>Username</th><th>Display Name</th><th>Joined</th><th>Actions</th></tr></thead>
      <tbody>`;

    pending.forEach(u => {
      html += `<tr>
        <td><b>${u.username}</b></td>
        <td>${u.display_name}</td>
        <td>${new Date(u.created_at).toLocaleDateString()}</td>
        <td>
          <button class="btn-action btn-sm btn-success" onclick="approveUser('${u.id}')">Approve</button>
          <button class="btn-action btn-sm btn-danger" onclick="rejectUser('${u.id}')">Reject</button>
        </td>
      </tr>`;
    });

    html += '</tbody></table>';
    document.getElementById('pending-table').innerHTML = html;
  } catch (err) {
    document.getElementById('pending-table').innerHTML = `<div class="error-msg">${err.message}</div>`;
  }
}

async function loadSecurity() {
  try {
    const data = await api('GET', '/api/admin/stats');
    const fw = data.firewall;
    document.getElementById('security-info').innerHTML = `
<b>Encryption System:</b> Active
<b>Parcel Rotation:</b> Every 60 seconds
<b>Password Rehash:</b> Every 1 second
<b>Active Encryption Keys:</b> ${data.stats.encryptionKeys}
<b>Blocked IPs:</b> ${fw.totalBlocked}
<b>Active Connections:</b> ${fw.activeIPs}
<b>Blocked IP List:</b>
${fw.blockedIPs.length > 0 ? fw.blockedIPs.map(b => `  ${b.ip} - expires in ${b.remainingSeconds}s`).join('\n') : '  None'}
    `.trim();
  } catch (err) {
    document.getElementById('security-info').textContent = err.message;
  }
}

async function loadFirewall() {
  try {
    const data = await api('GET', '/api/admin/firewall');
    const fw = data.firewall;
    document.getElementById('firewall-info').innerHTML = `
<b>Firewall Status:</b> ACTIVE
<b>Total IPs Blocked:</b> ${fw.totalBlocked}
<b>Active IP Connections:</b> ${fw.activeIPs}
<b>Blocked IPs:</b>
${fw.blockedIPs.length > 0 ? fw.blockedIPs.map(b =>
  `  IP: ${b.ip}\n  Expires: ${b.expiresAt}\n  Remaining: ${b.remainingSeconds}s`
).join('\n\n') : '  No IPs currently blocked'}
<b>Protection Layers:</b>
  1. XSS Pattern Detection
  2. SQL Injection Detection
  3. Command Injection Detection
  4. Rate Limiting (100 req/min per IP)
  5. Auth Rate Limiting (10 req/15min)
  6. Security Headers (CSP, HSTS, X-Frame-Options)
  7. Auto-block on suspicious activity (300s)
    `.trim();
  } catch (err) {
    document.getElementById('firewall-info').textContent = err.message;
  }
}

async function loadLogs() {
  try {
    const data = await api('GET', '/api/admin/logs');
    let html = `<table>
      <thead><tr><th>Time</th><th>Action</th><th>Admin</th><th>Target</th><th>Details</th></tr></thead>
      <tbody>`;

    data.logs.forEach(l => {
      html += `<tr>
        <td>${new Date(l.created_at).toLocaleString()}</td>
        <td><span class="badge badge-admin">${l.action}</span></td>
        <td>${l.admin_username}</td>
        <td>${l.target_user || '-'}</td>
        <td>${l.details || '-'}</td>
      </tr>`;
    });

    html += '</tbody></table>';
    document.getElementById('logs-table').innerHTML = html;
  } catch (err) {
    document.getElementById('logs-table').innerHTML = `<div class="error-msg">${err.message}</div>`;
  }
}

document.getElementById('force-parcels').addEventListener('click', async () => {
  try {
    await api('POST', '/api/admin/security/force-parcels');
    loadSecurity();
  } catch (err) { alert(err.message); }
});

document.getElementById('force-rehash').addEventListener('click', async () => {
  try {
    await api('POST', '/api/admin/security/force-rehash');
    loadSecurity();
  } catch (err) { alert(err.message); }
});

document.getElementById('search-password').addEventListener('click', async () => {
  const userId = document.getElementById('password-search').value.trim();
  if (!userId) return;
  try {
    const data = await api('GET', `/api/admin/users/${userId}/password`);
    document.getElementById('password-info').innerHTML = `
<b>Username:</b> ${data.username}
<b>Current Password Hash:</b>
${data.currentHash}

<b>Encryption Parcels (${data.encryptionParcels.length}):</b>
${data.encryptionParcels.map(p => `
  Parcel ID: ${p.parcel_id}
  Key Data: ${p.key_data.substring(0, 60)}...
  Created: ${p.created_at}
  Expires: ${p.expires_at}
`).join('\n')}
    `.trim();
  } catch (err) {
    document.getElementById('password-info').textContent = err.message;
  }
});

async function approveUser(userId) {
  try {
    await api('POST', `/api/admin/users/${userId}/approve`);
    loadPending();
    loadUsers();
  } catch (err) { alert(err.message); }
}

async function rejectUser(userId) {
  if (!confirm('Reject this user?')) return;
  try {
    await api('POST', `/api/admin/users/${userId}/reject`);
    loadPending();
    loadUsers();
  } catch (err) { alert(err.message); }
}

async function banUser(userId) {
  if (!confirm('Ban this user?')) return;
  try {
    await api('POST', `/api/admin/users/${userId}/ban`);
    loadUsers();
  } catch (err) { alert(err.message); }
}

document.getElementById('create-user-btn').addEventListener('click', async () => {
  const username = document.getElementById('new-username').value.trim();
  const password = document.getElementById('new-password').value;
  const displayName = document.getElementById('new-displayname').value.trim();
  const msgEl = document.getElementById('create-user-msg');
  msgEl.textContent = '';
  msgEl.className = 'error-msg';

  if (!username || !password) {
    msgEl.textContent = 'Username dan password wajib diisi.';
    return;
  }
  if (username.length < 3) {
    msgEl.textContent = 'Username minimal 3 karakter.';
    return;
  }
  if (password.length < 4) {
    msgEl.textContent = 'Password minimal 4 karakter.';
    return;
  }

  try {
    const result = await api('POST', '/api/admin/users/create', { username, password, displayName: displayName || username });
    msgEl.textContent = result.message;
    msgEl.className = 'success-msg';
    document.getElementById('new-username').value = '';
    document.getElementById('new-password').value = '';
    document.getElementById('new-displayname').value = '';
    loadUsers();
    loadDashboard();
  } catch (err) {
    msgEl.textContent = err.message;
  }
});

document.getElementById('user-search').addEventListener('input', (e) => {
  const q = e.target.value.toLowerCase();
  const rows = document.querySelectorAll('#users-table tbody tr');
  rows.forEach(row => {
    row.style.display = row.textContent.toLowerCase().includes(q) ? '' : 'none';
  });
});

async function viewPassword(userId) {
  document.querySelectorAll('.nav-links li').forEach(l => l.classList.remove('active'));
  document.querySelector('[data-tab="passwords"]').classList.add('active');
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.getElementById('tab-passwords').classList.add('active');
  document.getElementById('password-search').value = userId;
  document.getElementById('search-password').click();
}

if (token) showAdminPanel();
