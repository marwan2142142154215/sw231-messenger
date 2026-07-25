const jwt = require('jsonwebtoken');
const config = require('../config');
const { getSupabase } = require('../db');

async function authGuard(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    const sb = getSupabase();
    const { data: user } = await sb.from('users')
      .select('id, username, display_name, avatar_url, cover_url, bio, role, status, is_approved, public_key')
      .eq('id', decoded.userId).single();
    if (!user) return res.status(401).json({ error: 'User not found' });
    if (!user.is_approved) return res.status(403).json({ error: 'Account not approved' });
    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') return res.status(401).json({ error: 'Token expired' });
    return res.status(401).json({ error: 'Invalid token' });
  }
}

async function adminGuard(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, config.jwt.secret + '-admin');
    const sb = getSupabase();
    const { data: admin } = await sb.from('admins')
      .select('id, username, display_name, totp_enabled').eq('id', decoded.adminId).single();
    if (!admin) return res.status(401).json({ error: 'Admin not found' });
    req.admin = admin;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid admin token' });
  }
}

module.exports = { authGuard, adminGuard };
