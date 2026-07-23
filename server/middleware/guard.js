const jwt = require('jsonwebtoken');
const { db } = require('../database');

const JWT_SECRET = 'SW231-JWT-SECRET-2026-K7M2-X9L4-P8R1';
const JWT_EXPIRY = '24h';

async function authGuard(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Akses ditolak. Token tidak ditemukan.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    const session = await db.prepare(`
      SELECT * FROM sessions WHERE user_id = $1 AND token = $2 AND expires_at > NOW()
    `).get(decoded.userId, token);

    if (!session) {
      return res.status(401).json({ error: 'Sesi telah berakhir. Silakan login kembali.' });
    }

    const user = await db.prepare('SELECT id, username, display_name, role, status, is_approved FROM users WHERE id = $1').get(decoded.userId);

    if (!user) {
      return res.status(401).json({ error: 'User tidak ditemukan.' });
    }

    if (!user.is_approved) {
      return res.status(403).json({ error: 'Akun belum disetujui oleh admin.' });
    }

    req.user = user;
    req.token = token;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token telah kedaluwarsa.' });
    }
    return res.status(401).json({ error: 'Token tidak valid.' });
  }
}

function adminGuard(req, res, next) {
  authGuard(req, res, () => {
    if (req.user.role !== 'master' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Akses ditolak. Hanya admin yang diizinkan.' });
    }
    next();
  });
}

function masterGuard(req, res, next) {
  authGuard(req, res, () => {
    if (req.user.role !== 'master') {
      return res.status(403).json({ error: 'Akses ditolak. Hanya Master Admin yang diizinkan.' });
    }
    next();
  });
}

function generateToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

async function createSession(userId, ipAddress, userAgent) {
  const token = generateToken(userId);
  const { v4: uuidv4 } = require('uuid');
  const sessionId = uuidv4();

  await db.prepare(`
    INSERT INTO sessions (id, user_id, token, ip_address, user_agent, expires_at)
    VALUES ($1, $2, $3, $4, $5, NOW() + INTERVAL '24 hours')
  `).run(sessionId, userId, token, ipAddress, userAgent);

  return { token, sessionId };
}

async function destroySession(token) {
  await db.prepare('DELETE FROM sessions WHERE token = $1').run(token);
}

async function destroyAllUserSessions(userId) {
  await db.prepare('DELETE FROM sessions WHERE user_id = $1').run(userId);
}

module.exports = {
  authGuard,
  adminGuard,
  masterGuard,
  generateToken,
  createSession,
  destroySession,
  destroyAllUserSessions,
  JWT_SECRET
};
