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

function parseDevice(ua) {
  if (!ua) return 'Unknown Device';
  if (/android/i.test(ua)) return 'Android';
  if (/iphone|ipad|ipod/i.test(ua)) return /ipad/i.test(ua) ? 'iPad' : 'iPhone';
  if (/windows/i.test(ua)) return 'Windows PC';
  if (/macintosh|mac os/i.test(ua)) return 'Mac';
  if (/linux/i.test(ua)) return 'Linux';
  if (/chrome/i.test(ua)) return 'Chrome Browser';
  if (/firefox/i.test(ua)) return 'Firefox Browser';
  return 'Unknown Device';
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
    const ip = req.ip || req.connection?.remoteAddress || '';
    const device = parseDevice(req.get('User-Agent'));

    await sb.from('users').insert([{
      id: userId, username, email: email || null, password_hash: passwordHash,
      display_name: sanitize(displayName || username), is_approved: 0,
      ip_address: ip, device_info: device, last_ip: ip, last_device: device
    }]);
    
    res.status(201).json({
      message: 'Registration successful. Please wait for admin approval.',
      pending: true
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
    if (!user.is_approved) return res.status(403).json({ error: 'Account pending admin approval. Please wait.' });
    
    const ip = req.ip || req.connection?.remoteAddress || '';
    const device = parseDevice(req.get('User-Agent'));

    const { token, refreshToken } = generateTokens(user.id);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    
    await sb.from('sessions').insert([{
      id: uuidv4(), user_id: user.id, token, refresh_token: refreshToken,
      ip_address: ip, user_agent: req.get('User-Agent'), expires_at: expiresAt
    }]);
    
    await sb.from('users').update({
      status: 'online', last_seen: new Date().toISOString(),
      last_ip: ip, last_device: device
    }).eq('id', user.id);
    
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
    const token = req.headers.authorization?.split(' ')[1] || '';
    const sb = getSupabase();
    await sb.from('sessions').delete().eq('token', token);
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
    const { data: user, error } = await sb.from('users')
      .select('id, username, display_name, avatar_url, role, status, created_at')
      .eq('id', req.user.id).single();
    if (error || !user) return res.status(404).json({ error: 'User not found' });
    res.json({
      user: { id: user.id, username: user.username, displayName: user.display_name, avatarUrl: user.avatar_url,
        coverUrl: user.cover_url, bio: user.bio, role: user.role, status: user.status, createdAt: user.created_at }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

module.exports = router;
