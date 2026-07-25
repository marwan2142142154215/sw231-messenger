const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getSupabase } = require('../db');
const { authGuard } = require('../middleware/auth');
const { encryptMessage, decryptMessage, generateConversationKey } = require('../utils/crypto');

const router = express.Router();

router.get('/:conversationId', authGuard, async (req, res) => {
  try {
    const sb = getSupabase();
    const convId = req.params.conversationId;
    if (!convId || typeof convId !== 'string' || convId.length > 100) return res.status(400).json({ error: 'Invalid conversation ID' });

    const { data: isMember, error: memberErr } = await sb.from('conversation_members')
      .select('conversation_id').eq('conversation_id', convId).eq('user_id', req.user.id).single();
    if (memberErr) console.error('[MSG-API] Member check error:', memberErr.message);
    if (!isMember) return res.status(403).json({ error: 'Not a member' });

    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const cursor = req.query.cursor;

    let query = sb.from('messages')
      .select('id, conversation_id, sender_id, content, type, reply_to, is_edited, is_deleted, created_at, updated_at, media_url, media_type, mime_type, file_name, file_size, duration')
      .eq('conversation_id', convId).eq('is_deleted', 0)
      .order('created_at', { ascending: false }).limit(limit);

    if (cursor && typeof cursor === 'string') query = query.lt('created_at', cursor);
    const { data: messages, error: msgErr } = await query;
    if (msgErr) console.error('[MSG-API] Query error:', msgErr.message);

    const key = generateConversationKey(convId);
    const msgIds = (messages || []).map(m => m.id);

    const senderIds = [...new Set((messages || []).map(m => m.sender_id).filter(Boolean))];
    const replyMsgIds = [...new Set((messages || []).map(m => m.reply_to).filter(Boolean))];
    const allUserIds = [...new Set([...senderIds, ...replyMsgIds])];

    let userMap = {};
    if (allUserIds.length > 0) {
      const { data: users } = await sb.from('users')
        .select('id, username, display_name, avatar_url, status, last_seen').in('id', allUserIds);
      (users || []).forEach(u => { userMap[u.id] = u; });
    }

    const [reactionsResult, replyResult, readResult] = await Promise.all([
      msgIds.length > 0 ? sb.from('reactions').select('message_id, emoji, user_id').in('message_id', msgIds) : { data: [] },
      replyMsgIds.length > 0 ? sb.from('messages').select('id, content, sender_id, type').in('id', replyMsgIds) : { data: [] },
      msgIds.length > 0 ? sb.from('read_receipts').select('message_id, user_id').in('message_id', msgIds) : { data: [] }
    ]);

    const reactionUserIds = [...new Set((reactionsResult.data || []).map(r => r.user_id).filter(Boolean))];
    let reactionUserMap = {};
    if (reactionUserIds.length > 0) {
      const { data: rUsers } = await sb.from('users').select('id, username, display_name').in('id', reactionUserIds);
      (rUsers || []).forEach(u => { reactionUserMap[u.id] = u; });
    }

    const readReceiptsUserIds = [...new Set((readResult.data || []).map(r => r.user_id).filter(Boolean))];
    let readUserMap = {};
    if (readReceiptsUserIds.length > 0) {
      const { data: rUsers } = await sb.from('users').select('id, username, display_name').in('id', readReceiptsUserIds);
      (rUsers || []).forEach(u => { readUserMap[u.id] = u; });
    }

    const readByMap = {};
    (readResult.data || []).forEach(r => {
      if (!readByMap[r.message_id]) readByMap[r.message_id] = [];
      const rUser = readUserMap[r.user_id] || {};
      readByMap[r.message_id].push({ userId: r.user_id, username: rUser.username, display_name: rUser.display_name });
    });

    const reactionsMap = {};
    (reactionsResult.data || []).forEach(r => {
      if (!reactionsMap[r.message_id]) reactionsMap[r.message_id] = [];
      const rUser = reactionUserMap[r.user_id] || userMap[r.user_id] || {};
      reactionsMap[r.message_id].push({ emoji: r.emoji, userId: r.user_id, username: rUser.username, display_name: rUser.display_name });
    });

    const replyToMap = {};
    (replyResult.data || []).forEach(r => {
      let rc = r.content;
      try { rc = decryptMessage(r.content, key); } catch {}
      const rUser = userMap[r.sender_id] || {};
      replyToMap[r.id] = { id: r.id, content: rc?.substring(0, 100), sender_id: r.sender_id, username: rUser.username, display_name: rUser.display_name };
    });

    const parsed = (messages || []).reverse().map(msg => {
      const sender = userMap[msg.sender_id] || {};
      let content = msg.content;
      try { content = decryptMessage(msg.content, key); } catch {}
      return {
        id: msg.id, conversation_id: msg.conversation_id, sender_id: msg.sender_id,
        content, type: msg.type, reply_to: msg.reply_to, is_edited: msg.is_edited,
        is_deleted: msg.is_deleted, created_at: msg.created_at, updated_at: msg.updated_at,
        mediaUrl: msg.media_url, mediaType: msg.media_type, mimeType: msg.mime_type,
        fileName: msg.file_name, fileSize: msg.file_size, duration: msg.duration,
        username: sender.username, display_name: sender.display_name, avatar_url: sender.avatar_url,
        lastSeen: sender.last_seen,
        reactions: reactionsMap[msg.id] || [],
        readBy: readByMap[msg.id] || [],
        replyTo: msg.reply_to ? replyToMap[msg.reply_to] || null : null
      };
    });

    res.json({ messages: parsed, hasMore: (messages || []).length === limit, nextCursor: parsed.length > 0 ? parsed[0].created_at : null });
  } catch (err) {
    console.error('[MSG] Get error:', err);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

router.post('/:conversationId', authGuard, async (req, res) => {
  try {
    const { content, type, replyTo } = req.body;
    if (!content || typeof content !== 'string' || content.trim().length === 0) return res.status(400).json({ error: 'Message cannot be empty' });
    if (content.length > 10000) return res.status(400).json({ error: 'Message too long' });

    const sb = getSupabase();
    const key = generateConversationKey(req.params.conversationId);
    const encryptedContent = encryptMessage(content.trim(), key);
    const msgId = uuidv4();
    const now = new Date().toISOString();

    await sb.from('messages').insert([{
      id: msgId, conversation_id: req.params.conversationId, sender_id: req.user.id,
      content: encryptedContent, type: type || 'text', reply_to: replyTo || null, created_at: now
    }]);

    res.status(201).json({
      message: { id: msgId, conversation_id: req.params.conversationId, sender_id: req.user.id,
        content: content.trim(), type: type || 'text', reply_to: replyTo || null,
        reactions: [], username: req.user.username, display_name: req.user.display_name,
        avatar_url: req.user.avatar_url, is_edited: 0, is_deleted: 0, created_at: now }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to send message' });
  }
});

router.put('/:messageId', authGuard, async (req, res) => {
  try {
    const sb = getSupabase();
    const { data: msg } = await sb.from('messages').select('id, conversation_id').eq('id', req.params.messageId).eq('sender_id', req.user.id).single();
    if (!msg) return res.status(404).json({ error: 'Message not found' });
    const { content } = req.body;
    if (!content || typeof content !== 'string' || content.trim().length === 0) return res.status(400).json({ error: 'Message cannot be empty' });
    if (content.length > 10000) return res.status(400).json({ error: 'Message too long' });
    const key = generateConversationKey(msg.conversation_id);
    await sb.from('messages').update({ content: encryptMessage(content.trim(), key), is_edited: 1, updated_at: new Date().toISOString() }).eq('id', req.params.messageId);
    res.json({ message: { ...msg, content: content.trim(), is_edited: 1 } });
  } catch (err) {
    res.status(500).json({ error: 'Failed to edit message' });
  }
});

router.delete('/:messageId', authGuard, async (req, res) => {
  try {
    const sb = getSupabase();
    const { data: msg } = await sb.from('messages').select('id').eq('id', req.params.messageId).eq('sender_id', req.user.id).single();
    if (!msg) return res.status(404).json({ error: 'Message not found' });
    const forEveryone = req.query.forEveryone === 'true';
    if (forEveryone) {
      await sb.from('messages').update({ is_deleted: 1, content: '', deleted_for: 'everyone' }).eq('id', req.params.messageId);
    } else {
      await sb.from('messages').update({ is_deleted: 1, content: '' }).eq('id', req.params.messageId);
    }
    res.json({ message: 'Deleted', forEveryone });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

router.post('/:messageId/reaction', authGuard, async (req, res) => {
  try {
    const { emoji } = req.body;
    if (!emoji || typeof emoji !== 'string' || emoji.length > 10) return res.status(400).json({ error: 'Invalid emoji' });
    const sb = getSupabase();
    const { data: existing } = await sb.from('reactions')
      .select('id').eq('message_id', req.params.messageId).eq('user_id', req.user.id).eq('emoji', emoji).single();
    if (existing) {
      await sb.from('reactions').delete().eq('id', existing.id);
      return res.json({ action: 'removed', emoji });
    }
    await sb.from('reactions').insert([{ id: uuidv4(), message_id: req.params.messageId, user_id: req.user.id, emoji }]);
    res.json({ action: 'added', emoji });
  } catch (err) {
    res.status(500).json({ error: 'Reaction failed' });
  }
});

module.exports = router;
