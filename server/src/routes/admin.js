const express = require('express');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');
const { getSupabase } = require('../db');
const { hashPassword, verifyPassword } = require('../utils/crypto');
const { adminGuard } = require('../middleware/auth');
const { logAdminAction } = require('../middleware/firewall');

const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Credentials required' });
    
    const sb = getSupabase();

    const { data: admins } = await sb.from('admins').select('id').limit(1);
    if (!admins || admins.length === 0) {
      const adminId = uuidv4();
      const hash = await hashPassword('P@ipet2026');
      const { error: insertErr } = await sb.from('admins').insert([{
        id: adminId, username: 'oktagram', password_hash: hash,
        display_name: 'Oktagram Admin', totp_enabled: 0
      }]);
      if (insertErr) {
        console.error('[ADMIN] Auto-create failed:', insertErr.message);
      } else {
        console.log('[ADMIN] Auto-created admin: oktagram / P@ipet2026');
      }
    }

    const { data: admin } = await sb.from('admins')
      .select('*').eq('username', username).single();
    
    if (!admin) return res.status(401).json({ error: 'Invalid credentials' });
    const valid = await verifyPassword(password, admin.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
    
    if (admin.totp_enabled) {
      const tempToken = jwt.sign({ adminId: admin.id, step: 'totp' }, config.jwt.secret + '-admin', { expiresIn: '5m' });
      return res.json({ requiresTotp: true, tempToken });
    }
    
    const token = jwt.sign({ adminId: admin.id }, config.jwt.secret + '-admin', { expiresIn: '1h' });
    await sb.from('admins').update({ last_login: new Date().toISOString() }).eq('id', admin.id);
    try { await logAdminAction(admin.id, 'login', 'admin', admin.id, 'Admin login'); } catch {}
    
    res.json({ token, admin: { id: admin.id, username: admin.username, displayName: admin.display_name } });
  } catch (err) {
    console.error('[ADMIN] Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

router.get('/dashboard', adminGuard, async (req, res) => {
  try {
    const sb = getSupabase();
    const [usersResult, messagesResult, postsResult, listingsResult, activeUsersResult, pendingResult] = await Promise.all([
      sb.from('users').select('id', { count: 'exact', head: true }),
      sb.from('messages').select('id', { count: 'exact', head: true }),
      sb.from('posts').select('id', { count: 'exact', head: true }),
      sb.from('listings').select('id', { count: 'exact', head: true }),
      sb.from('users').select('id', { count: 'exact', head: true }).eq('status', 'online'),
      sb.from('users').select('id', { count: 'exact', head: true }).eq('is_approved', 0)
    ]);
    
    const today = new Date().toISOString().split('T')[0];
    const { count: todayMessages } = await sb.from('messages').select('id', { count: 'exact', head: true }).gte('created_at', today);
    const { count: todayUsers } = await sb.from('users').select('id', { count: 'exact', head: true }).gte('created_at', today);
    
    const { data: flags } = await sb.from('feature_flags').select('*');
    
    res.json({
      stats: {
        totalUsers: usersResult.count || 0,
        totalMessages: messagesResult.count || 0,
        totalPosts: postsResult.count || 0,
        totalListings: listingsResult.count || 0,
        activeUsers: activeUsersResult.count || 0,
        pendingApproval: pendingResult.count || 0,
        todayMessages: todayMessages || 0,
        todayUsers: todayUsers || 0
      },
      featureFlags: flags || []
    });
  } catch (err) {
    console.error('[ADMIN] Dashboard error:', err);
    res.status(500).json({ error: 'Failed to load dashboard' });
  }
});

router.get('/users', adminGuard, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const offset = parseInt(req.query.offset) || 0;
    const filter = req.query.filter || '';
    const sb = getSupabase();
    
    let query = sb.from('users')
      .select('id, username, display_name, avatar_url, email, role, status, is_approved, ip_address, device_info, location, last_ip, last_device, created_at, last_seen');
    
    if (filter === 'pending') {
      query = query.eq('is_approved', 0);
    } else if (filter === 'active') {
      query = query.eq('status', 'online');
    }
    
    const { data: users } = await query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);
    const { count } = await sb.from('users').select('id', { count: 'exact', head: true });
    res.json({ users: users || [], total: count || 0 });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.post('/users', adminGuard, async (req, res) => {
  try {
    const { username, password, displayName, email } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
    
    const sb = getSupabase();
    const { data: existing } = await sb.from('users').select('id').eq('username', username).single();
    if (existing) return res.status(409).json({ error: 'Username already taken' });
    
    const userId = uuidv4();
    const hash = await hashPassword(password);
    
    await sb.from('users').insert([{
      id: userId, username, email: email || null, password_hash: hash,
      display_name: displayName || username, is_approved: 1, role: 'user'
    }]);
    
    try { await logAdminAction(req.admin.id, 'create_user', 'user', userId, `Created ${username}`); } catch {}
    res.status(201).json({ message: 'User created', user: { id: userId, username } });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create user' });
  }
});

router.put('/users/:id', adminGuard, async (req, res) => {
  try {
    const { displayName, role, isApproved, status } = req.body;
    const update = {};
    if (displayName) update.display_name = displayName;
    if (role) update.role = role;
    if (isApproved !== undefined) update.is_approved = isApproved ? 1 : 0;
    if (status) update.status = status;
    update.updated_at = new Date().toISOString();
    
    await getSupabase().from('users').update(update).eq('id', req.params.id);
    try { await logAdminAction(req.admin.id, 'update_user', 'user', req.params.id, JSON.stringify(update)); } catch {}
    res.json({ message: 'User updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update user' });
  }
});

router.post('/users/:id/approve', adminGuard, async (req, res) => {
  try {
    await getSupabase().from('users').update({ is_approved: 1 }).eq('id', req.params.id);
    try { await logAdminAction(req.admin.id, 'approve_user', 'user', req.params.id, 'Approved'); } catch {}
    res.json({ message: 'User approved' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to approve user' });
  }
});

router.post('/users/:id/reject', adminGuard, async (req, res) => {
  try {
    await getSupabase().from('users').update({ is_approved: -1 }).eq('id', req.params.id);
    try { await logAdminAction(req.admin.id, 'reject_user', 'user', req.params.id, 'Rejected'); } catch {}
    res.json({ message: 'User rejected' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reject user' });
  }
});

router.post('/users/:id/reset-password', adminGuard, async (req, res) => {
  try {
    const newPassword = 'Nyxora' + Math.random().toString(36).substring(2, 10) + '!';
    const hash = await hashPassword(newPassword);
    await getSupabase().from('users').update({ password_hash: hash }).eq('id', req.params.id);
    try { await logAdminAction(req.admin.id, 'reset_password', 'user', req.params.id, 'Password reset'); } catch {}
    res.json({ message: 'Password reset', newPassword });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

router.delete('/users/:id', adminGuard, async (req, res) => {
  try {
    await getSupabase().from('users').delete().eq('id', req.params.id);
    try { await logAdminAction(req.admin.id, 'delete_user', 'user', req.params.id, 'User deleted'); } catch {}
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

router.get('/logs', adminGuard, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const sb = getSupabase();
    const { data: logs } = await sb.from('admin_logs')
      .select('*').order('created_at', { ascending: false }).limit(limit);
    res.json({ logs: logs || [] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

router.put('/flags/:key', adminGuard, async (req, res) => {
  try {
    const { enabled } = req.body;
    await getSupabase().from('feature_flags').update({ enabled: enabled ? 1 : 0, updated_at: new Date().toISOString() }).eq('key', req.params.key);
    try { await logAdminAction(req.admin.id, 'toggle_feature', 'feature_flag', req.params.key, `enabled: ${enabled}`); } catch {}
    res.json({ message: 'Flag updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update flag' });
  }
});

router.post('/broadcast', adminGuard, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: 'Content required' });
    try { await logAdminAction(req.admin.id, 'broadcast', 'system', null, content.substring(0, 100)); } catch {}
    res.json({ message: 'Broadcast queued' });
  } catch (err) {
    res.status(500).json({ error: 'Broadcast failed' });
  }
});

module.exports = router;
