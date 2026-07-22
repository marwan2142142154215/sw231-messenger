const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { db } = require('../database');
const { exportDbBase64, importDbBase64 } = require('../database');
const { masterGuard, destroyAllUserSessions } = require('../middleware/guard');
const { hashPassword } = require('../encryption');
const { getFirewallStats } = require('../middleware/firewall');
const { createParcels, rehashPasswords } = require('../encryption');

router.get('/stats', masterGuard, (req, res) => {
  try {
    const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    const approvedUsers = db.prepare('SELECT COUNT(*) as count FROM users WHERE is_approved = 1').get().count;
    const pendingUsers = db.prepare('SELECT COUNT(*) as count FROM users WHERE is_approved = 0').get().count;
    const totalMessages = db.prepare('SELECT COUNT(*) as count FROM messages').get().count;
    const totalConversations = db.prepare('SELECT COUNT(*) as count FROM conversations').get().count;
    const onlineUsers = db.prepare('SELECT COUNT(*) as count FROM users WHERE status = \'online\'').get().count;

    const firewall = getFirewallStats();

    const recentLogs = db.prepare(`
      SELECT * FROM admin_logs ORDER BY created_at DESC LIMIT 50
    `).all();

    const encryptionKeys = db.prepare('SELECT COUNT(*) as count FROM encryption_keys').get().count;

    res.json({
      stats: {
        totalUsers,
        approvedUsers,
        pendingUsers,
        totalMessages,
        totalConversations,
        onlineUsers,
        encryptionKeys,
        uptime: process.uptime()
      },
      firewall,
      recentLogs
    });
  } catch (err) {
    console.error('[ADMIN] Stats error:', err);
    res.status(500).json({ error: 'Gagal mengambil statistik.' });
  }
});

router.get('/users', masterGuard, (req, res) => {
  try {
    const users = db.prepare(`
      SELECT id, username, display_name, avatar_url, role, status, last_seen, created_at, is_approved
      FROM users ORDER BY created_at DESC
    `).all();

    const enriched = users.map(u => {
      const sessions = db.prepare('SELECT COUNT(*) as count FROM sessions WHERE user_id = ?').get(u.id).count;
      const messages = db.prepare('SELECT COUNT(*) as count FROM messages WHERE sender_id = ?').get(u.id).count;
      return { ...u, sessionCount: sessions, messageCount: messages };
    });

    res.json({ users: enriched });
  } catch (err) {
    console.error('[ADMIN] Get users error:', err);
    res.status(500).json({ error: 'Gagal mengambil data user.' });
  }
});

router.get('/users/:id/password', masterGuard, (req, res) => {
  try {
    const user = db.prepare('SELECT id, username, password_hash FROM users WHERE id = ?').get(req.params.id);
    if (!user) return res.status(404).json({ error: 'User tidak ditemukan.' });

    const keys = db.prepare(`
      SELECT key_data, parcel_id, created_at, expires_at
      FROM encryption_keys WHERE user_id = ? ORDER BY created_at DESC LIMIT 10
    `).all(user.id);

    db.prepare(`
      INSERT INTO admin_logs (id, action, target_user, admin_id, details)
      VALUES (?, ?, ?, ?, ?)
    `).run(uuidv4(), 'VIEW_PASSWORD', user.id, req.user.id, `Viewed password for ${user.username}`);

    res.json({
      username: user.username,
      currentHash: user.password_hash,
      encryptionParcels: keys
    });
  } catch (err) {
    console.error('[ADMIN] Get password error:', err);
    res.status(500).json({ error: 'Gagal mengambil data password.' });
  }
});

router.post('/users/:id/approve', masterGuard, (req, res) => {
  try {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    if (!user) return res.status(404).json({ error: 'User tidak ditemukan.' });

    db.prepare('UPDATE users SET is_approved = 1 WHERE id = ?').run(req.params.id);

    db.prepare(`
      INSERT INTO admin_logs (id, action, target_user, admin_id, details)
      VALUES (?, ?, ?, ?, ?)
    `).run(uuidv4(), 'APPROVE_USER', user.id, req.user.id, `Approved user ${user.username}`);

    res.json({ message: `User ${user.username} berhasil disetujui.` });
  } catch (err) {
    console.error('[ADMIN] Approve user error:', err);
    res.status(500).json({ error: 'Gagal menyetujui user.' });
  }
});

router.post('/users/:id/reject', masterGuard, (req, res) => {
  try {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    if (!user) return res.status(404).json({ error: 'User tidak ditemukan.' });

    db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);

    db.prepare(`
      INSERT INTO admin_logs (id, action, target_user, admin_id, details)
      VALUES (?, ?, ?, ?, ?)
    `).run(uuidv4(), 'REJECT_USER', user.id, req.user.id, `Rejected user ${user.username}`);

    res.json({ message: `User ${user.username} berhasil ditolak.` });
  } catch (err) {
    console.error('[ADMIN] Reject user error:', err);
    res.status(500).json({ error: 'Gagal menolak user.' });
  }
});

router.post('/users/:id/ban', masterGuard, (req, res) => {
  try {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    if (!user) return res.status(404).json({ error: 'User tidak ditemukan.' });
    if (user.role === 'master') return res.status(400).json({ error: 'Tidak bisa ban master admin.' });

    destroyAllUserSessions(user.id);
    db.prepare('UPDATE users SET is_approved = 0, status = \'offline\' WHERE id = ?').run(req.params.id);

    db.prepare(`
      INSERT INTO admin_logs (id, action, target_user, admin_id, details)
      VALUES (?, ?, ?, ?, ?)
    `).run(uuidv4(), 'BAN_USER', user.id, req.user.id, `Banned user ${user.username}`);

    res.json({ message: `User ${user.username} berhasil dibanned.` });
  } catch (err) {
    console.error('[ADMIN] Ban user error:', err);
    res.status(500).json({ error: 'Gagal memban user.' });
  }
});

router.post('/security/force-parcels', masterGuard, (req, res) => {
  try {
    const result = createParcels();
    res.json({ message: 'Parcels diperbarui.', result });
  } catch (err) {
    console.error('[ADMIN] Force parcels error:', err);
    res.status(500).json({ error: 'Gagal memperbarui parcels.' });
  }
});

router.post('/security/force-rehash', masterGuard, (req, res) => {
  try {
    const result = rehashPasswords();
    res.json({ message: 'Password di-rehash.', result });
  } catch (err) {
    console.error('[ADMIN] Force rehash error:', err);
    res.status(500).json({ error: 'Gagal rehash password.' });
  }
});

router.get('/logs', masterGuard, (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100;
    const offset = (page - 1) * limit;

    const logs = db.prepare(`
      SELECT al.*, u.username as admin_username
      FROM admin_logs al
      JOIN users u ON al.admin_id = u.id
      ORDER BY al.created_at DESC
      LIMIT ? OFFSET ?
    `).all(limit, offset);

    const total = db.prepare('SELECT COUNT(*) as count FROM admin_logs').get().count;

    res.json({ logs, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    console.error('[ADMIN] Get logs error:', err);
    res.status(500).json({ error: 'Gagal mengambil log.' });
  }
});

router.get('/firewall', masterGuard, (req, res) => {
  try {
    const stats = getFirewallStats();
    res.json({ firewall: stats });
  } catch (err) {
    console.error('[ADMIN] Firewall stats error:', err);
    res.status(500).json({ error: 'Gagal mengambil statistik firewall.' });
  }
});

router.post('/users/create', masterGuard, async (req, res) => {
  try {
    const { username, password, displayName } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username dan password wajib diisi.' });
    }
    if (username.length < 3 || password.length < 4) {
      return res.status(400).json({ error: 'Username minimal 3 karakter, password minimal 4 karakter.' });
    }

    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (existing) {
      return res.status(400).json({ error: 'Username sudah digunakan.' });
    }

    const hash = hashPassword(password);
    const userId = uuidv4();

    db.prepare(`
      INSERT INTO users (id, username, display_name, password_hash, role, is_approved, created_at)
      VALUES (?, ?, ?, ?, 'user', 1, datetime('now'))
    `).run(userId, username, displayName || username, hash);

    db.prepare(`
      INSERT INTO admin_logs (id, action, target_user, admin_id, details)
      VALUES (?, ?, ?, ?, ?)
    `).run(uuidv4(), 'CREATE_USER', userId, req.user.id, `Created user ${username} (auto-approved)`);

    res.json({ message: `User ${username} berhasil dibuat dan langsung disetujui.`, userId });
  } catch (err) {
    console.error('[ADMIN] Create user error:', err);
    res.status(500).json({ error: 'Gagal membuat user.' });
  }
});

router.get('/db/export', masterGuard, (req, res) => {
  try {
    const b64 = exportDbBase64();
    if (!b64) return res.status(500).json({ error: 'Database not initialized.' });
    db.prepare(`INSERT INTO admin_logs (id, action, admin_id, details) VALUES (?, ?, ?, ?)`)
      .run(uuidv4(), 'DB_EXPORT', req.user.id, 'Database exported');
    res.json({ data: b64, size: b64.length });
  } catch (err) {
    console.error('[ADMIN] DB export error:', err);
    res.status(500).json({ error: 'Gagal export database.' });
  }
});

router.post('/db/import', masterGuard, (req, res) => {
  try {
    const { data } = req.body;
    if (!data) return res.status(400).json({ error: 'No data provided.' });
    const ok = importDbBase64(data);
    if (!ok) return res.status(400).json({ error: 'Invalid database data.' });
    db.prepare(`INSERT INTO admin_logs (id, action, admin_id, details) VALUES (?, ?, ?, ?)`)
      .run(uuidv4(), 'DB_IMPORT', req.user.id, 'Database imported');
    res.json({ message: 'Database berhasil di-import.' });
  } catch (err) {
    console.error('[ADMIN] DB import error:', err);
    res.status(500).json({ error: 'Gagal import database.' });
  }
});

module.exports = router;
