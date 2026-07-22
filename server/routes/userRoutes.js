const express = require('express');
const router = express.Router();
const { db } = require('../database');
const { authGuard } = require('../middleware/guard');

router.get('/', authGuard, (req, res) => {
  try {
    const users = db.prepare(`
      SELECT id, username, display_name, avatar_url, role, status, last_seen, created_at, is_approved
      FROM users
      ORDER BY username ASC
    `).all();

    res.json({ users });
  } catch (err) {
    console.error('[USER] Get users error:', err);
    res.status(500).json({ error: 'Gagal mengambil data user.' });
  }
});

router.get('/search', authGuard, (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json({ users: [] });

    const users = db.prepare(`
      SELECT id, username, display_name, avatar_url, status
      FROM users
      WHERE (username LIKE ? OR display_name LIKE ?) AND is_approved = 1 AND id != ?
      LIMIT 20
    `).all(`%${q}%`, `%${q}%`, req.user.id);

    res.json({ users });
  } catch (err) {
    console.error('[USER] Search users error:', err);
    res.status(500).json({ error: 'Gagal mencari user.' });
  }
});

router.put('/profile', authGuard, (req, res) => {
  try {
    const { displayName, avatarUrl } = req.body;

    if (displayName) {
      db.prepare('UPDATE users SET display_name = ? WHERE id = ?')
        .run(displayName, req.user.id);
    }

    if (avatarUrl) {
      db.prepare('UPDATE users SET avatar_url = ? WHERE id = ?')
        .run(avatarUrl, req.user.id);
    }

    res.json({ message: 'Profil berhasil diperbarui.' });
  } catch (err) {
    console.error('[USER] Update profile error:', err);
    res.status(500).json({ error: 'Gagal memperbarui profil.' });
  }
});

module.exports = router;
