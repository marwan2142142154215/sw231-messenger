const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getSupabase } = require('../db');
const { authGuard } = require('../middleware/auth');
const { generateQRToken } = require('../utils/crypto');

const router = express.Router();

router.get('/qr', authGuard, async (req, res) => {
  try {
    const sb = getSupabase();
    await sb.from('qr_tokens').update({ used: 1 }).eq('user_id', req.user.id).eq('used', 0);
    
    const { token, expiresAt } = generateQRToken(req.user.id);
    await sb.from('qr_tokens').insert([{
      id: uuidv4(), user_id: req.user.id, token, expires_at: expiresAt
    }]);
    
    res.json({ token, expiresAt, userId: req.user.id, username: req.user.username });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate QR' });
  }
});

router.post('/scan', authGuard, async (req, res) => {
  try {
    const { qrToken } = req.body;
    if (!qrToken) return res.status(400).json({ error: 'QR token required' });
    
    const sb = getSupabase();
    const { data: qr } = await sb.from('qr_tokens')
      .select('*').eq('token', qrToken).eq('used', 0).gt('expires_at', new Date().toISOString()).single();
    
    if (!qr) return res.status(400).json({ error: 'QR expired or invalid' });
    if (qr.user_id === req.user.id) return res.status(400).json({ error: 'Cannot add yourself' });
    
    await sb.from('qr_tokens').update({ used: 1 }).eq('id', qr.id);
    
    const { data: existingFriend } = await sb.from('friends')
      .select('status').or(`and(user_id.eq.${req.user.id},friend_id.eq.${qr.user_id}),and(user_id.eq.${qr.user_id},friend_id.eq.${req.user.id})`).single();
    
    if (existingFriend) return res.json({ message: 'Already friends', userId: qr.user_id, status: existingFriend.status });
    
    await sb.from('friends').insert([
      { user_id: req.user.id, friend_id: qr.user_id, status: 'accepted' },
      { user_id: qr.user_id, friend_id: req.user.id, status: 'accepted' }
    ]);
    
    const { data: convConv } = await sb.from('conversations').select('id').eq('type', 'private').in('id',
      (await sb.from('conversation_members').select('conversation_id').eq('user_id', req.user.id)).data?.map(c => c.conversation_id) || []
    );
    
    let convId = null;
    for (const c of (convConv || [])) {
      const { data: members } = await sb.from('conversation_members').select('user_id').eq('conversation_id', c.id);
      if (members && members.length === 2 && members.some(m => m.user_id === qr.user_id)) { convId = c.id; break; }
    }
    
    if (!convId) {
      convId = uuidv4();
      await Promise.all([
        sb.from('conversations').insert([{ id: convId, type: 'private', created_by: req.user.id }]),
        sb.from('conversation_members').insert([
          { conversation_id: convId, user_id: req.user.id, role: 'member' },
          { conversation_id: convId, user_id: qr.user_id, role: 'member' }
        ])
      ]);
    }
    
    const { data: friendUser } = await sb.from('users').select('id, username, display_name, avatar_url, status').eq('id', qr.user_id).single();
    
    res.json({ message: 'Friend added', userId: qr.user_id, conversationId: convId, user: friendUser });
  } catch (err) {
    console.error('[FRIENDS] Scan error:', err);
    res.status(500).json({ error: 'Failed to process QR scan' });
  }
});

router.get('/', authGuard, async (req, res) => {
  try {
    const sb = getSupabase();
    const { data: friendships } = await sb.from('friends')
      .select('friend_id, status, created_at').eq('user_id', req.user.id);
    
    const friendIds = (friendships || []).map(f => f.friend_id);
    if (friendIds.length === 0) return res.json({ friends: [] });
    
    const { data: users } = await sb.from('users')
      .select('id, username, display_name, avatar_url, status, last_seen').in('id', friendIds);
    
    const friends = (friendships || []).map(f => {
      const user = (users || []).find(u => u.id === f.friend_id);
      return { ...user, friendshipStatus: f.status, since: f.created_at };
    });
    
    res.json({ friends });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch friends' });
  }
});

router.post('/request/:id', authGuard, async (req, res) => {
  try {
    if (req.params.id === req.user.id) return res.status(400).json({ error: 'Cannot friend yourself' });
    const sb = getSupabase();
    const { data: existing } = await sb.from('friends')
      .select('*').or(`and(user_id.eq.${req.user.id},friend_id.eq.${req.params.id}),and(user_id.eq.${req.params.id},friend_id.eq.${req.user.id})`).single();
    
    if (existing) return res.json({ message: 'Request already exists', status: existing.status });
    
    await sb.from('friends').insert([
      { user_id: req.user.id, friend_id: req.params.id, status: 'pending' }
    ]);
    
    res.json({ message: 'Friend request sent' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to send friend request' });
  }
});

router.post('/accept/:id', authGuard, async (req, res) => {
  try {
    const sb = getSupabase();
    await sb.from('friends').update({ status: 'accepted', updated_at: new Date().toISOString() })
      .eq('user_id', req.params.id).eq('friend_id', req.user.id).eq('status', 'pending');
    await sb.from('friends').upsert([
      { user_id: req.user.id, friend_id: req.params.id, status: 'accepted' }
    ]);
    res.json({ message: 'Friend request accepted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to accept request' });
  }
});

module.exports = router;
