const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { db } = require('../database');
const { authGuard } = require('../middleware/guard');

router.get('/', authGuard, async (req, res) => {
  try {
    const memberOf = await db.prepare(`
      SELECT conversation_id FROM conversation_members WHERE user_id = $1
    `).all(req.user.id);

    const conversations = [];
    for (const m of memberOf) {
      const conv = await db.prepare('SELECT * FROM conversations WHERE id = $1').get(m.conversation_id);
      if (!conv) continue;

      const members = await db.prepare(`
        SELECT u.id, u.username, u.display_name, u.avatar_url, u.status, cm.role
        FROM conversation_members cm
        JOIN users u ON cm.user_id = u.id
        WHERE cm.conversation_id = $1
      `).all(conv.id);

      const lastMsg = await db.prepare(`
        SELECT m.*, u.username, u.display_name
        FROM messages m JOIN users u ON m.sender_id = u.id
        WHERE m.conversation_id = $1 AND m.is_deleted = 0
        ORDER BY m.created_at DESC LIMIT 1
      `).get(conv.id);

      let lastMessage = null;
      let lastMessageTime = null;
      if (lastMsg) {
        try {
          const { generateConversationKey, decryptMessage } = require('../encryption');
          const key = generateConversationKey(conv.id);
          lastMessage = decryptMessage(lastMsg.content, key);
        } catch(e) {
          lastMessage = lastMsg.content;
        }
        lastMessageTime = lastMsg.created_at;
      }

      conversations.push({
        ...conv,
        members,
        lastMessage,
        lastMessageTime,
        unreadCount: 0
      });
    }

    res.json({ conversations });
  } catch (err) {
    console.error('[CONV] Get conversations error:', err);
    res.status(500).json({ error: 'Gagal mengambil percakapan.' });
  }
});

router.post('/private', authGuard, async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId wajib diisi.' });

    const targetUser = await db.prepare('SELECT id FROM users WHERE id = $1 AND is_approved = 1').get(userId);
    if (!targetUser) return res.status(404).json({ error: 'User tidak ditemukan.' });

    const existing = await db.prepare(`
      SELECT cm.conversation_id
      FROM conversation_members cm
      JOIN conversations c ON cm.conversation_id = c.id
      WHERE c.type = 'private'
        AND cm.conversation_id IN (SELECT conversation_id FROM conversation_members WHERE user_id = $1)
        AND cm.conversation_id IN (SELECT conversation_id FROM conversation_members WHERE user_id = $2)
      LIMIT 1
    `).get(req.user.id, userId);

    if (existing) {
      return res.json({ conversationId: existing.conversation_id });
    }

    const convId = uuidv4();
    await db.prepare(`INSERT INTO conversations (id, type, created_by) VALUES ($1, 'private', $2)`).run(convId, req.user.id);
    await db.prepare(`INSERT INTO conversation_members (conversation_id, user_id, role) VALUES ($1, $2, 'member')`).run(convId, req.user.id);
    await db.prepare(`INSERT INTO conversation_members (conversation_id, user_id, role) VALUES ($1, $2, 'member')`).run(convId, userId);

    res.status(201).json({ conversationId: convId });
  } catch (err) {
    console.error('[CONV] Create private error:', err);
    res.status(500).json({ error: 'Gagal membuat percakapan.' });
  }
});

router.post('/group', authGuard, async (req, res) => {
  try {
    const { name, memberIds } = req.body;
    if (!name || !memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
      return res.status(400).json({ error: 'Nama grup dan minimal 1 anggota wajib diisi.' });
    }

    const convId = uuidv4();
    await db.prepare(`INSERT INTO conversations (id, type, name, created_by) VALUES ($1, 'group', $2, $3)`).run(convId, name, req.user.id);
    await db.prepare(`INSERT INTO conversation_members (conversation_id, user_id, role) VALUES ($1, $2, 'admin')`).run(convId, req.user.id);

    for (const memberId of memberIds) {
      if (memberId !== req.user.id) {
        await db.prepare(`INSERT INTO conversation_members (conversation_id, user_id, role) VALUES ($1, $2, 'member') ON CONFLICT DO NOTHING`).run(convId, memberId);
      }
    }

    res.status(201).json({ conversationId: convId });
  } catch (err) {
    console.error('[CONV] Create group error:', err);
    res.status(500).json({ error: 'Gagal membuat grup.' });
  }
});

router.get('/:conversationId/members', authGuard, async (req, res) => {
  try {
    const isMember = await db.prepare(`
      SELECT 1 FROM conversation_members WHERE conversation_id = $1 AND user_id = $2
    `).get(req.params.conversationId, req.user.id);

    if (!isMember) return res.status(403).json({ error: 'Anda bukan anggota percakapan ini.' });

    const members = await db.prepare(`
      SELECT u.id, u.username, u.display_name, u.avatar_url, u.status, cm.role
      FROM conversation_members cm
      JOIN users u ON cm.user_id = u.id
      WHERE cm.conversation_id = $1
    `).all(req.params.conversationId);

    res.json({ members });
  } catch (err) {
    console.error('[CONV] Get members error:', err);
    res.status(500).json({ error: 'Gagal mengambil anggota.' });
  }
});

module.exports = router;
