const express = require('express');
const router = express.Router();
const { db } = require('../database');
const { authGuard } = require('../middleware/guard');

router.get('/', authGuard, async (req, res) => {
  try {
    const users = await db.prepare(`
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

router.get('/search', authGuard, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json({ users: [] });

    const users = await db.prepare(`
      SELECT id, username, display_name, avatar_url, status
      FROM users
      WHERE (username LIKE $1 OR display_name LIKE $2) AND is_approved = 1 AND id != $3
      LIMIT 20
    `).all(`%${q}%`, `%${q}%`, req.user.id);

    res.json({ users });
  } catch (err) {
    console.error('[USER] Search users error:', err);
    res.status(500).json({ error: 'Gagal mencari user.' });
  }
});

router.put('/profile', authGuard, async (req, res) => {
  try {
    const { displayName, avatarUrl } = req.body;

    if (displayName) {
      await db.prepare('UPDATE users SET display_name = $1 WHERE id = $2')
        .run(displayName, req.user.id);
    }

    if (avatarUrl) {
      await db.prepare('UPDATE users SET avatar_url = $1 WHERE id = $2')
        .run(avatarUrl, req.user.id);
    }

    res.json({ message: 'Profil berhasil diperbarui.' });
  } catch (err) {
    console.error('[USER] Update profile error:', err);
    res.status(500).json({ error: 'Gagal memperbarui profil.' });
  }
});

module.exports = router;
