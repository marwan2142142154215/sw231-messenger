const jwt = require('jsonwebtoken');
const { db } = require('../database');
const { JWT_SECRET } = require('../middleware/guard');
const { generateConversationKey, encryptMessage, decryptMessage } = require('../encryption');

const onlineUsers = new Map();

function initSocket(io) {
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication required'));

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = db.prepare('SELECT id, username, display_name, avatar_url, role FROM users WHERE id = ? AND is_approved = 1').get(decoded.userId);
      if (!user) return next(new Error('User not found'));
      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`[SOCKET] ${socket.user.username} connected (${socket.id})`);

    onlineUsers.set(socket.user.id, {
      socketId: socket.id,
      user: socket.user
    });

    db.prepare('UPDATE users SET status = ? WHERE id = ?').run('online', socket.user.id);
    io.emit('user:status', { userId: socket.user.id, status: 'online' });

    const userConversations = db.prepare(`
      SELECT conversation_id FROM conversation_members WHERE user_id = ?
    `).all(socket.user.id);

    userConversations.forEach(conv => {
      socket.join(`conv:${conv.conversation_id}`);
    });

    socket.on('conversation:join', (conversationId) => {
      const isMember = db.prepare(`
        SELECT 1 FROM conversation_members WHERE conversation_id = ? AND user_id = ?
      `).get(conversationId, socket.user.id);

      if (isMember) {
        socket.join(`conv:${conversationId}`);
      }
    });

    socket.on('message:send', (data) => {
      try {
        const { conversationId, content, type, replyTo, mediaUrl, mediaType, mimeType, fileName, fileSize, duration } = data;

        if (!content && !mediaUrl) return;
        if (content && content.trim().length === 0 && !mediaUrl) return;

        const isMember = db.prepare(`
          SELECT 1 FROM conversation_members WHERE conversation_id = ? AND user_id = ?
        `).get(conversationId, socket.user.id);

        if (!isMember) return socket.emit('error', { message: 'Anda bukan anggota percakapan ini.' });

        const key = generateConversationKey(conversationId);
        const msgContent = content ? content.trim() : (mediaType === 'voice' ? '🎤 Pesan Suara' : mediaType === 'video' ? '🎥 Video' : mediaType === 'audio' ? '🎵 Audio' : mediaType === 'sticker' ? content || '😀' : '📎 File');
        const encryptedContent = encryptMessage(msgContent, key);

        const { v4: uuidv4 } = require('uuid');
        const msgId = uuidv4();

        if (replyTo) {
          const replyMsg = db.prepare('SELECT id FROM messages WHERE id = ? AND conversation_id = ?')
            .get(replyTo, conversationId);
          if (!replyMsg) return socket.emit('error', { message: 'Pesan reply tidak ditemukan.' });
        }

        let finalType = type || 'text';
        if (mediaUrl) finalType = mediaType || 'image';

        db.prepare(`
          INSERT INTO messages (id, conversation_id, sender_id, content, type, reply_to)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(msgId, conversationId, socket.user.id, encryptedContent, finalType, replyTo || null);

        let replyToData = null;
        if (replyTo) {
          const rMsg = db.prepare(`
            SELECT m.id, m.content, m.sender_id, u.username
            FROM messages m JOIN users u ON m.sender_id = u.id WHERE m.id = ?
          `).get(replyTo);
          if (rMsg) {
            try { rMsg.content = decryptMessage(rMsg.content, key); } catch(e) {}
            replyToData = rMsg;
          }
        }

        const message = {
          id: msgId,
          conversation_id: conversationId,
          sender_id: socket.user.id,
          content: msgContent,
          type: finalType,
          mediaUrl: mediaUrl || null,
          mediaType: mediaType || null,
          mimeType: mimeType || null,
          fileName: fileName || null,
          fileSize: fileSize || null,
          duration: duration || null,
          reply_to: replyTo,
          replyTo: replyToData,
          username: socket.user.username,
          display_name: socket.user.display_name,
          avatar_url: socket.user.avatar_url,
          is_edited: 0,
          is_deleted: 0,
          created_at: new Date().toISOString(),
          reactions: []
        };

        io.to(`conv:${conversationId}`).emit('message:new', message);

        const members = db.prepare(`
          SELECT user_id FROM conversation_members WHERE conversation_id = ? AND user_id != ?
        `).all(conversationId, socket.user.id);

        members.forEach(m => {
          const memberOnline = onlineUsers.get(m.user_id);
          if (memberOnline) {
            io.to(memberOnline.socketId).emit('notification', {
              type: 'new_message',
              conversationId,
              from: socket.user.display_name || socket.user.username,
              preview: msgContent.substring(0, 50),
              mediaType: mediaType || null
            });
          }
        });
      } catch (err) {
        console.error('[SOCKET] Send message error:', err);
        socket.emit('error', { message: 'Gagal mengirim pesan.' });
      }
    });

    socket.on('message:edit', (data) => {
      try {
        const { messageId, content, conversationId } = data;

        const msg = db.prepare('SELECT * FROM messages WHERE id = ? AND sender_id = ?')
          .get(messageId, socket.user.id);

        if (!msg) return socket.emit('error', { message: 'Pesan tidak ditemukan.' });

        const key = generateConversationKey(conversationId);
        const encryptedContent = encryptMessage(content.trim(), key);

        db.prepare(`
          UPDATE messages SET content = ?, is_edited = 1, updated_at = datetime('now') WHERE id = ?
        `).run(encryptedContent, messageId);

        io.to(`conv:${conversationId}`).emit('message:edited', {
          messageId,
          content: content.trim(),
          conversationId,
          editedBy: socket.user.id
        });
      } catch (err) {
        console.error('[SOCKET] Edit message error:', err);
      }
    });

    socket.on('message:delete', (data) => {
      try {
        const { messageId, conversationId } = data;

        const msg = db.prepare('SELECT * FROM messages WHERE id = ? AND sender_id = ?')
          .get(messageId, socket.user.id);

        if (!msg) return socket.emit('error', { message: 'Pesan tidak ditemukan.' });

        db.prepare('UPDATE messages SET is_deleted = 1, content = \'[Pesan Dihapus]\' WHERE id = ?')
          .run(messageId);

        io.to(`conv:${conversationId}`).emit('message:deleted', {
          messageId,
          conversationId,
          deletedBy: socket.user.id
        });
      } catch (err) {
        console.error('[SOCKET] Delete message error:', err);
      }
    });

    socket.on('message:react', (data) => {
      try {
        const { messageId, emoji, conversationId } = data;

        const existing = db.prepare(`
          SELECT id FROM reactions WHERE message_id = ? AND user_id = ? AND emoji = ?
        `).get(messageId, socket.user.id, emoji);

        if (existing) {
          db.prepare('DELETE FROM reactions WHERE id = ?').run(existing.id);
          io.to(`conv:${conversationId}`).emit('message:reaction', {
            messageId,
            emoji,
            action: 'removed',
            userId: socket.user.id,
            username: socket.user.username
          });
        } else {
          const { v4: uuidv4 } = require('uuid');
          db.prepare(`
            INSERT INTO reactions (id, message_id, user_id, emoji) VALUES (?, ?, ?, ?)
          `).run(uuidv4(), messageId, socket.user.id, emoji);

          io.to(`conv:${conversationId}`).emit('message:reaction', {
            messageId,
            emoji,
            action: 'added',
            userId: socket.user.id,
            username: socket.user.username
          });
        }
      } catch (err) {
        console.error('[SOCKET] React error:', err);
      }
    });

    socket.on('typing:start', (conversationId) => {
      db.prepare(`
        INSERT OR REPLACE INTO typing_indicators (conversation_id, user_id, is_typing, updated_at)
        VALUES (?, ?, 1, datetime('now'))
      `).run(conversationId, socket.user.id);

      socket.to(`conv:${conversationId}`).emit('typing:start', {
        userId: socket.user.id,
        username: socket.user.username,
        conversationId
      });
    });

    socket.on('typing:stop', (conversationId) => {
      db.prepare(`
        UPDATE typing_indicators SET is_typing = 0 WHERE conversation_id = ? AND user_id = ?
      `).run(conversationId, socket.user.id);

      socket.to(`conv:${conversationId}`).emit('typing:stop', {
        userId: socket.user.id,
        conversationId
      });
    });

    socket.on('message:read', (data) => {
      try {
        const { messageId, conversationId } = data;
        db.prepare(`
          INSERT OR IGNORE INTO read_receipts (message_id, user_id) VALUES (?, ?)
        `).run(messageId, socket.user.id);

        io.to(`conv:${conversationId}`).emit('message:read', {
          messageId,
          userId: socket.user.id,
          username: socket.user.username
        });
      } catch (err) {
        console.error('[SOCKET] Read receipt error:', err);
      }
    });

    socket.on('user:search', (query) => {
      try {
        const users = db.prepare(`
          SELECT id, username, display_name, avatar_url, status
          FROM users
          WHERE (username LIKE ? OR display_name LIKE ?) AND is_approved = 1 AND id != ?
          LIMIT 20
        `).all(`%${query}%`, `%${query}%`, socket.user.id);

        socket.emit('user:results', users);
      } catch (err) {
        console.error('[SOCKET] Search error:', err);
      }
    });

    socket.on('disconnect', () => {
      console.log(`[SOCKET] ${socket.user.username} disconnected`);
      onlineUsers.delete(socket.user.id);

      db.prepare('UPDATE users SET status = ?, last_seen = datetime(\'now\') WHERE id = ?')
        .run('offline', socket.user.id);

      io.emit('user:status', { userId: socket.user.id, status: 'offline' });

      db.prepare('UPDATE typing_indicators SET is_typing = 0 WHERE user_id = ?')
        .run(socket.user.id);
    });
  });

  console.log('[SOCKET] Socket.IO initialized');
}

module.exports = { initSocket };
