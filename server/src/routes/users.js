const express = require('express');
const { getSupabase } = require('../db');
const { authGuard } = require('../middleware/auth');
const { sanitize } = require('../utils/validators');

const router = express.Router();

router.get('/', authGuard, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const sb = getSupabase();
    const { data: users } = await sb.from('users')
      .select('id, username, display_name, avatar_url, status, last_seen')
      .eq('is_approved', 1).order('username').limit(limit);
    res.json({ users: users || [] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.get('/search', authGuard, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 1) return res.json({ users: [] });
    const sanitized = sanitize(q).substring(0, 30);
    const sb = getSupabase();
    const { data: users } = await sb.from('users')
      .select('id, username, display_name, avatar_url, status')
      .or(`username.ilike.%${sanitized}%,display_name.ilike.%${sanitized}%`)
      .eq('is_approved', 1).neq('id', req.user.id).limit(20);
    res.json({ users: users || [] });
  } catch (err) {
    res.status(500).json({ error: 'Search failed' });
  }
});

router.get('/:id', authGuard, async (req, res) => {
  try {
    const sb = getSupabase();
    const { data: user } = await sb.from('users')
      .select('id, username, display_name, avatar_url, cover_url, bio, status, last_seen, created_at')
      .eq('id', req.params.id).single();
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    const { count: followers } = await sb.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', req.params.id);
    const { count: following } = await sb.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', req.params.id);
    const { count: posts } = await sb.from('posts').select('*', { count: 'exact', head: true }).eq('user_id', req.params.id);
    
    const { data: followRow } = await sb.from('follows').select('*')
      .eq('follower_id', req.user.id).eq('following_id', req.params.id).single();
    
    res.json({ user, stats: { followers: followers || 0, following: following || 0, posts: posts || 0 }, isFollowing: !!followRow });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

router.put('/profile', authGuard, async (req, res) => {
  try {
    const { displayName, avatarUrl, coverUrl, bio } = req.body;
    const update = {};
    if (displayName && displayName.trim().length > 0 && displayName.length <= 50) update.display_name = sanitize(displayName);
    if (avatarUrl !== undefined && avatarUrl.length <= 500) update.avatar_url = avatarUrl;
    if (coverUrl !== undefined && coverUrl.length <= 500) update.cover_url = coverUrl;
    if (bio !== undefined && bio.length <= 300) update.bio = sanitize(bio);
    if (Object.keys(update).length === 0) return res.status(400).json({ error: 'Nothing to update' });
    update.updated_at = new Date().toISOString();
    
    await getSupabase().from('users').update(update).eq('id', req.user.id);
    res.json({ message: 'Profile updated', ...update });
  } catch (err) {
    res.status(500).json({ error: 'Profile update failed' });
  }
});

router.post('/follow/:id', authGuard, async (req, res) => {
  try {
    if (req.params.id === req.user.id) return res.status(400).json({ error: 'Cannot follow yourself' });
    const sb = getSupabase();
    const { data: existing } = await sb.from('follows')
      .select('*').eq('follower_id', req.user.id).eq('following_id', req.params.id).single();
    
    if (existing) {
      await sb.from('follows').delete().eq('follower_id', req.user.id).eq('following_id', req.params.id);
      res.json({ action: 'unfollowed' });
    } else {
      await sb.from('follows').insert([{ follower_id: req.user.id, following_id: req.params.id }]);
      res.json({ action: 'followed' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Follow action failed' });
  }
});

module.exports = router;
