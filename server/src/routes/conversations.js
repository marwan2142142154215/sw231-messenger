const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getSupabase } = require('../db');
const { authGuard } = require('../middleware/auth');
const { generateConversationKey, decryptMessage } = require('../utils/crypto');

const router = express.Router();

router.get('/', authGuard, async (req, res) => {
  try {
    const sb = getSupabase();
    const { data: memberOf } = await sb.from('conversation_members')
      .select('conversation_id').eq('user_id', req.user.id);
    if (!memberOf || memberOf.length === 0) return res.json({ conversations: [] });
    
    const convIds = memberOf.map(m => m.conversation_id);

    const [convsResult, allMembersResult, lastMsgsResult] = await Promise.all([
      sb.from('conversations').select('id, type, name, created_by, created_at').in('id', convIds),
      sb.from('conversation_members').select('conversation_id, user_id, role').in('conversation_id', convIds),
      sb.from('messages').select('conversation_id, content, created_at, sender_id, is_deleted, type, media_url')
        .in('conversation_id', convIds).eq('is_deleted', 0).order('created_at', { ascending: false })
    ]);
    
    const userIdSet = new Set();
    (allMembersResult.data || []).forEach(m => userIdSet.add(m.user_id));
    
    const allUsersResult = userIdSet.size > 0
      ? await sb.from('users').select('id, username, display_name, avatar_url, status, last_seen').in('id', [...userIdSet])
      : { data: [] };
    
    const userMap = {};
    (allUsersResult.data || []).forEach(u => { userMap[u.id] = u; });
    
    const memberMap = {};
    (allMembersResult.data || []).forEach(m => {
      if (!memberMap[m.conversation_id]) memberMap[m.conversation_id] = [];
      memberMap[m.conversation_id].push({ ...userMap[m.user_id], role: m.role });
    });
    
    const lastMsgMap = {};
    (lastMsgsResult.data || []).forEach(m => {
      if (!lastMsgMap[m.conversation_id]) lastMsgMap[m.conversation_id] = m;
    });
    
    const conversations = (convsResult.data || []).map(conv => {
      const members = memberMap[conv.id] || [];
      const lastMsg = lastMsgMap[conv.id];
      let lastMessage = null;
      let lastMessageTime = null;
      if (lastMsg) {
        try { lastMessage = decryptMessage(lastMsg.content, generateConversationKey(conv.id)); } catch { lastMessage = '[encrypted]'; }
        lastMessageTime = lastMsg.created_at;
      }
      return { id: conv.id, type: conv.type, name: conv.name, members, lastMessage, lastMessageTime };
    });
    
    conversations.sort((a, b) => {
      if (!a.lastMessageTime) return 1;
      if (!b.lastMessageTime) return -1;
      return new Date(b.lastMessageTime) - new Date(a.lastMessageTime);
    });
    
    res.json({ conversations });
  } catch (err) {
    console.error('[CONV] Error:', err);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

router.post('/private', authGuard, async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    const sb = getSupabase();
    
    const { data: target } = await sb.from('users').select('id').eq('id', userId).eq('is_approved', 1).single();
    if (!target) return res.status(404).json({ error: 'User not found' });
    
    const { data: myConvs } = await sb.from('conversation_members').select('conversation_id').eq('user_id', req.user.id);
    const { data: theirConvs } = await sb.from('conversation_members').select('conversation_id').eq('user_id', userId);
    
    const myConvIds = (myConvs || []).map(c => c.conversation_id);
    const theirConvIds = (theirConvs || []).map(c => c.conversation_id);
    const shared = myConvIds.filter(id => theirConvIds.includes(id));
    
    if (shared.length > 0) {
      const { data: existing } = await sb.from('conversations').select('id, type').in('id', shared);
      const priv = existing?.find(c => c.type === 'private');
      if (priv) return res.json({ conversationId: priv.id });
    }
    
    const convId = uuidv4();
    const { error: convErr } = await sb.from('conversations').insert([{ id: convId, type: 'private', created_by: req.user.id }]);
    if (convErr) { console.error('[CONV] Insert conversation error:', convErr.message); return res.status(500).json({ error: 'Failed to create conversation: ' + convErr.message }); }
    
    const { error: memberErr } = await sb.from('conversation_members').insert([
      { conversation_id: convId, user_id: req.user.id, role: 'member' },
      { conversation_id: convId, user_id: userId, role: 'member' }
    ]);
    if (memberErr) { console.error('[CONV] Insert members error:', memberErr.message); return res.status(500).json({ error: 'Failed to add members: ' + memberErr.message }); }
    
    console.log(`[CONV] Created private conv ${convId} between ${req.user.username} and ${userId}`);
    res.status(201).json({ conversationId: convId });
  } catch (err) {
    console.error('[CONV] Create private error:', err);
    res.status(500).json({ error: 'Failed to create conversation' });
  }
});

router.post('/group', authGuard, async (req, res) => {
  try {
    const { name, memberIds } = req.body;
    if (!name || !memberIds || !Array.isArray(memberIds) || memberIds.length === 0)
      return res.status(400).json({ error: 'Name and at least 1 member required' });
    
    const sb = getSupabase();
    const convId = uuidv4();
    const members = [{ conversation_id: convId, user_id: req.user.id, role: 'admin' }];
    memberIds.forEach(id => { if (id !== req.user.id) members.push({ conversation_id: convId, user_id: id, role: 'member' }); });
    
    const { error: convErr } = await sb.from('conversations').insert([{ id: convId, type: 'group', name: sanitize(name), created_by: req.user.id }]);
    if (convErr) return res.status(500).json({ error: 'Failed to create group: ' + convErr.message });
    
    const { error: memberErr } = await sb.from('conversation_members').insert(members);
    if (memberErr) return res.status(500).json({ error: 'Failed to add members: ' + memberErr.message });
    
    console.log(`[CONV] Created group conv ${convId} "${name}" by ${req.user.username}`);
    res.status(201).json({ conversationId: convId });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create group' });
  }
});

router.get('/:conversationId/members', authGuard, async (req, res) => {
  try {
    const sb = getSupabase();
    const { data: rows } = await sb.from('conversation_members')
      .select('user_id, role').eq('conversation_id', req.params.conversationId);
    const userIds = (rows || []).map(r => r.user_id);
    const { data: users } = await sb.from('users')
      .select('id, username, display_name, avatar_url, status').in('id', userIds);
    const userMap = {};
    (users || []).forEach(u => { userMap[u.id] = u; });
    res.json({ members: (rows || []).map(r => ({ ...userMap[r.user_id], role: r.role })) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch members' });
  }
});

function sanitize(str) { return typeof str === 'string' ? str.replace(/[<>]/g, '').trim().substring(0, 100) : ''; }

module.exports = router;
