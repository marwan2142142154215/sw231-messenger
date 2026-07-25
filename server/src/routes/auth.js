const express = require('express');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');
const { getSupabase } = require('../db');
const { hashPassword, verifyPassword } = require('../utils/crypto');
const { sanitize, validateUsername, validatePassword } = require('../utils/validators');
const { authGuard } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

function generateTokens(userId) {
  const token = jwt.sign({ userId }, config.jwt.secret, { expiresIn: config.jwt.expiry });
  const refreshToken = jwt.sign({ userId }, config.jwt.refreshSecret, { expiresIn: config.jwt.refreshExpiry });
  return { token, refreshToken };
}

router.post('/register', authLimiter, async (req, res) => {
  try {
    const { username, email, password, displayName } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
    if (!validateUsername(username)) return res.status(400).json({ error: 'Username: 3-30 chars, letters/numbers/underscore only' });
    if (!validatePassword(password)) return res.status(400).json({ error: 'Password must be at least 6 characters' });
    
    const sb = getSupabase();
    const { data: existing } = await sb.from('users').select('id').eq('username', username).single();
    if (existing) return res.status(409).json({ error: 'Username already taken' });
    
    const userId = uuidv4();
    const passwordHash = await hashPassword(password);
    
    await sb.from('users').insert([{
      id: userId, username, email: email || '', password_hash: passwordHash,
      display_name: sanitize(displayName || username), is_approved: 1
    }]);
    
    const { token, refreshToken } = generateTokens(userId);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    
    await sb.from('sessions').insert([{
      id: uuidv4(), user_id: userId, token, refresh_token: refreshToken,
      ip_address: req.ip, user_agent: req.get('User-Agent'), expires_at: expiresAt
    }]);
    
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true, secure: config.nodeEnv === 'production',
      sameSite: 'strict', maxAge: 7 * 24 * 60 * 60 * 1000
    });
    
    res.status(201).json({
      message: 'Registration successful',
      token,
      user: { id: userId, username, displayName: sanitize(displayName), avatarUrl: '' }
    });
  } catch (err) {
    console.error('[AUTH] Register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/login', authLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
    
    const sb = getSupabase();
    const { data: user } = await sb.from('users')
      .select('id, username, email, password_hash, display_name, avatar_url, role, is_approved')
      .or(`username.eq.${username},email.eq.${username}`).single();
    
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
    if (!user.is_approved) return res.status(403).json({ error: 'Account pending approval' });
    
    const { token, refreshToken } = generateTokens(user.id);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    
    await sb.from('sessions').insert([{
      id: uuidv4(), user_id: user.id, token, refresh_token: refreshToken,
      ip_address: req.ip, user_agent: req.get('User-Agent'), expires_at: expiresAt
    }]);
    
    await sb.from('users').update({ status: 'online', last_seen: new Date().toISOString() }).eq('id', user.id);
    
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true, secure: config.nodeEnv === 'production',
      sameSite: 'strict', maxAge: 7 * 24 * 60 * 60 * 1000
    });
    
    res.json({
      message: 'Login successful',
      token,
      user: { id: user.id, username: user.username, displayName: user.display_name, avatarUrl: user.avatar_url, role: user.role }
    });
  } catch (err) {
    console.error('[AUTH] Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

router.post('/refresh', async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
    if (!refreshToken) return res.status(401).json({ error: 'No refresh token' });
    
    const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret);
    const sb = getSupabase();
    const { data: session } = await sb.from('sessions')
      .select('*').eq('refresh_token', refreshToken).single();
    if (!session) return res.status(401).json({ error: 'Invalid session' });
    
    const tokens = generateTokens(decoded.userId);
    await sb.from('sessions').update({ token: tokens.token, refresh_token: tokens.refreshToken })
      .eq('id', session.id);
    
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true, secure: config.nodeEnv === 'production',
      sameSite: 'strict', maxAge: 7 * 24 * 60 * 60 * 1000
    });
    
    res.json({ token: tokens.token });
  } catch {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

router.post('/logout', authGuard, async (req, res) => {
  try {
    const sb = getSupabase();
    await sb.from('sessions').delete().eq('token', req.token || '');
    await sb.from('users').update({ status: 'offline', last_seen: new Date().toISOString() }).eq('id', req.user.id);
    res.clearCookie('refreshToken');
    res.json({ message: 'Logged out' });
  } catch (err) {
    res.status(500).json({ error: 'Logout failed' });
  }
});

router.get('/me', authGuard, async (req, res) => {
  try {
    const sb = getSupabase();
    const { data: user } = await sb.from('users')
      .select('id, username, display_name, avatar_url, cover_url, bio, role, status, created_at')
      .eq('id', req.user.id).single();
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({
      user: { id: user.id, username: user.username, displayName: user.display_name, avatarUrl: user.avatar_url,
        coverUrl: user.cover_url, bio: user.bio, role: user.role, status: user.status, createdAt: user.created_at }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

router.post('/setup', async (req, res) => {
  try {
    const sb = getSupabase();
    const { data: existing } = await sb.from('admins').select('id').limit(1);
    if (existing && existing.length > 0) return res.status(400).json({ error: 'Admin already exists' });

    const adminId = uuidv4();
    const passwordHash = await hashPassword('P@ipet2026');

    await sb.from('admins').insert([{
      id: adminId, username: 'oktagram', password_hash: passwordHash,
      display_name: 'Oktagram Admin', totp_enabled: false
    }]);

    res.json({ message: 'Admin created', username: 'oktagram', password: 'P@ipet2026' });
  } catch (err) {
    console.error('[AUTH] Setup error:', err);
    res.status(500).json({ error: 'Setup failed' });
  }
});

module.exports = router;
