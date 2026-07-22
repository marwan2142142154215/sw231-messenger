const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { db } = require('../database');
const { authGuard } = require('../middleware/guard');
const { encryptMessage, decryptMessage, generateConversationKey } = require('../encryption');

router.get('/:conversationId', authGuard, (req, res) => {
  try {
    const isMember = db.prepare(`
      SELECT 1 FROM conversation_members WHERE conversation_id = ? AND user_id = ?
    `).get(req.params.conversationId, req.user.id);

    if (!isMember) {
      return res.status(403).json({ error: 'Anda bukan anggota percakapan ini.' });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    const messages = db.prepare(`
      SELECT m.*, u.username, u.display_name, u.avatar_url,
        (SELECT json_group_array(DISTINCT json_object('emoji', r.emoji, 'userId', r.user_id, 'username', ru.username))
         FROM reactions r JOIN users ru ON r.user_id = ru.id WHERE r.message_id = m.id) as reactions_json,
        (SELECT json_object('id', rm.id, 'content', rm.content, 'sender_id', rm.sender_id, 'username', rmu.username)
         FROM messages rm JOIN users rmu ON rm.sender_id = rmu.id WHERE m.reply_to = rm.id) as reply_to_data
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.conversation_id = ? AND m.is_deleted = 0
      ORDER BY m.created_at DESC
      LIMIT ? OFFSET ?
    `).all(req.params.conversationId, limit, offset);

    const parsed = messages.map(msg => {
      let reactions = [];
      try { reactions = JSON.parse(msg.reactions_json); } catch(e) {}
      let replyTo = null;
      try { replyTo = JSON.parse(msg.reply_to_data); } catch(e) {}

      const key = generateConversationKey(msg.conversation_id);
      let content = msg.content;
      try { content = decryptMessage(msg.content, key); } catch(e) {}

      return {
        ...msg,
        content,
        reactions: reactions.filter(r => r && r.emoji),
        replyTo,
        reactions_json: undefined,
        reply_to_data: undefined
      };
    }).reverse();

    const total = db.prepare(`
      SELECT COUNT(*) as count FROM messages WHERE conversation_id = ? AND is_deleted = 0
    `).get(req.params.conversationId);

    res.json({
      messages: parsed,
      pagination: {
        page,
        limit,
        total: total.count,
        totalPages: Math.ceil(total.count / limit)
      }
    });
  } catch (err) {
    console.error('[MSG] Get messages error:', err);
    res.status(500).json({ error: 'Gagal mengambil pesan.' });
  }
});

router.post('/:conversationId', authGuard, (req, res) => {
  try {
    const isMember = db.prepare(`
      SELECT 1 FROM conversation_members WHERE conversation_id = ? AND user_id = ?
    `).get(req.params.conversationId, req.user.id);

    if (!isMember) {
      return res.status(403).json({ error: 'Anda bukan anggota percakapan ini.' });
    }

    const { content, type, replyTo } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Pesan tidak boleh kosong.' });
    }

    const key = generateConversationKey(req.params.conversationId);
    const encryptedContent = encryptMessage(content.trim(), key);

    const msgId = uuidv4();

    if (replyTo) {
      const replyMsg = db.prepare('SELECT id FROM messages WHERE id = ? AND conversation_id = ?')
        .get(replyTo, req.params.conversationId);
      if (!replyMsg) {
        return res.status(400).json({ error: 'Pesan yang direply tidak ditemukan.' });
      }
    }

    db.prepare(`
      INSERT INTO messages (id, conversation_id, sender_id, content, type, reply_to)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(msgId, req.params.conversationId, req.user.id, encryptedContent, type || 'text', replyTo || null);

    const message = db.prepare(`
      SELECT m.*, u.username, u.display_name, u.avatar_url
      FROM messages m JOIN users u ON m.sender_id = u.id WHERE m.id = ?
    `).get(msgId);

    res.status(201).json({
      message: {
        ...message,
        content: content.trim(),
        reactions: []
      }
    });
  } catch (err) {
    console.error('[MSG] Send message error:', err);
    res.status(500).json({ error: 'Gagal mengirim pesan.' });
  }
});

router.put('/:messageId', authGuard, (req, res) => {
  try {
    const msg = db.prepare('SELECT * FROM messages WHERE id = ? AND sender_id = ?')
      .get(req.params.messageId, req.user.id);

    if (!msg) {
      return res.status(404).json({ error: 'Pesan tidak ditemukan atau bukan milik Anda.' });
    }

    const { content } = req.body;
    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Pesan tidak boleh kosong.' });
    }

    const key = generateConversationKey(msg.conversation_id);
    const encryptedContent = encryptMessage(content.trim(), key);

    db.prepare(`
      UPDATE messages SET content = ?, is_edited = 1, updated_at = datetime('now') WHERE id = ?
    `).run(encryptedContent, req.params.messageId);

    res.json({ message: { ...msg, content: content.trim(), is_edited: 1 } });
  } catch (err) {
    console.error('[MSG] Edit message error:', err);
    res.status(500).json({ error: 'Gagal mengedit pesan.' });
  }
});

router.delete('/:messageId', authGuard, (req, res) => {
  try {
    const msg = db.prepare('SELECT * FROM messages WHERE id = ? AND sender_id = ?')
      .get(req.params.messageId, req.user.id);

    if (!msg) {
      return res.status(404).json({ error: 'Pesan tidak ditemukan atau bukan milik Anda.' });
    }

    db.prepare('UPDATE messages SET is_deleted = 1, content = \'[Pesan Dihapus]\' WHERE id = ?')
      .run(req.params.messageId);

    res.json({ message: 'Pesan berhasil dihapus.' });
  } catch (err) {
    console.error('[MSG] Delete message error:', err);
    res.status(500).json({ error: 'Gagal menghapus pesan.' });
  }
});

router.post('/:messageId/reaction', authGuard, (req, res) => {
  try {
    const { emoji } = req.body;
    const msg = db.prepare('SELECT * FROM messages WHERE id = ?').get(req.params.messageId);

    if (!msg) {
      return res.status(404).json({ error: 'Pesan tidak ditemukan.' });
    }

    const existing = db.prepare(`
      SELECT id FROM reactions WHERE message_id = ? AND user_id = ? AND emoji = ?
    `).get(req.params.messageId, req.user.id, emoji);

    if (existing) {
      db.prepare('DELETE FROM reactions WHERE id = ?').run(existing.id);
      return res.json({ action: 'removed', emoji });
    }

    db.prepare(`
      INSERT INTO reactions (id, message_id, user_id, emoji) VALUES (?, ?, ?, ?)
    `).run(uuidv4(), req.params.messageId, req.user.id, emoji);

    res.json({ action: 'added', emoji });
  } catch (err) {
    console.error('[MSG] Reaction error:', err);
    res.status(500).json({ error: 'Gagal memberikan reaction.' });
  }
});

router.post('/:messageId/read', authGuard, (req, res) => {
  try {
    db.prepare(`
      INSERT OR IGNORE INTO read_receipts (message_id, user_id) VALUES (?, ?)
    `).run(req.params.messageId, req.user.id);
    res.json({ message: 'Marked as read.' });
  } catch (err) {
    console.error('[MSG] Read receipt error:', err);
    res.status(500).json({ error: 'Gagal menandai pesan.' });
  }
});

module.exports = router;
