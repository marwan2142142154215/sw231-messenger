const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { db } = require('../database');
const { hashPassword, verifyPassword } = require('../encryption');
const { authGuard, createSession, destroySession } = require('../middleware/guard');
const { authLimiter } = require('../middleware/firewall');

router.post('/register', authLimiter, async (req, res) => {
  try {
    const { username, password, displayName } = req.body;

    if (!username || !password || !displayName) {
      return res.status(400).json({ error: 'Username, password, dan display name harus diisi.' });
    }

    if (username.length < 3 || username.length > 30) {
      return res.status(400).json({ error: 'Username harus 3-30 karakter.' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password minimal 8 karakter.' });
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return res.status(400).json({ error: 'Username hanya boleh huruf, angka, dan underscore.' });
    }

    const existing = await db.prepare('SELECT id FROM users WHERE username = $1').get(username);
    if (existing) {
      return res.status(409).json({ error: 'Username sudah digunakan.' });
    }

    const userId = uuidv4();
    const passwordHash = hashPassword(password);

    await db.prepare(`
      INSERT INTO users (id, username, password_hash, display_name, is_approved)
      VALUES ($1, $2, $3, $4, 0)
    `).run(userId, username, passwordHash, displayName);

    res.status(201).json({
      message: 'Registrasi berhasil. Menunggu persetujuan admin.',
      userId
    });
  } catch (err) {
    console.error('[AUTH] Register error:', err);
    res.status(500).json({ error: 'Gagal melakukan registrasi.' });
  }
});

router.post('/login', authLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username dan password harus diisi.' });
    }

    const user = await db.prepare('SELECT * FROM users WHERE username = $1').get(username);

    if (!user) {
      return res.status(401).json({ error: 'Username atau password salah.' });
    }

    if (!verifyPassword(password, user.password_hash)) {
      return res.status(401).json({ error: 'Username atau password salah.' });
    }

    if (!user.is_approved) {
      return res.status(403).json({ error: 'Akun belum disetujui oleh admin.' });
    }

    const session = await createSession(user.id, req.ip, req.get('User-Agent'));

    await db.prepare("UPDATE users SET status = $1, last_seen = NOW() WHERE id = $2")
      .run('online', user.id);

    res.json({
      message: 'Login berhasil.',
      token: session.token,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        role: user.role,
        avatarUrl: user.avatar_url
      }
    });
  } catch (err) {
    console.error('[AUTH] Login error:', err);
    res.status(500).json({ error: 'Gagal melakukan login.' });
  }
});

router.post('/logout', authGuard, async (req, res) => {
  try {
    await destroySession(req.token);
    await db.prepare('UPDATE users SET status = $1 WHERE id = $2').run('offline', req.user.id);
    res.json({ message: 'Logout berhasil.' });
  } catch (err) {
    console.error('[AUTH] Logout error:', err);
    res.status(500).json({ error: 'Gagal melakukan logout.' });
  }
});

router.get('/me', authGuard, async (req, res) => {
  const user = await db.prepare(`
    SELECT id, username, display_name, avatar_url, role, status, created_at
    FROM users WHERE id = $1
  `).get(req.user.id);

  res.json({
    user: {
      id: user.id,
      username: user.username,
      displayName: user.display_name,
      avatarUrl: user.avatar_url,
      role: user.role,
      status: user.status,
      createdAt: user.created_at
    }
  });
});

module.exports = router;
