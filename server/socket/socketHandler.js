const jwt = require('jsonwebtoken');
const { db } = require('../database');
const { JWT_SECRET } = require('../middleware/guard');
const { generateConversationKey, encryptMessage, decryptMessage } = require('../encryption');

const onlineUsers = new Map();

function initSocket(io) {
  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication required'));

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await db.prepare('SELECT id, username, display_name, avatar_url, role FROM users WHERE id = $1 AND is_approved = 1').get(decoded.userId);
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

    (async () => {
      try {
        await db.prepare('UPDATE users SET status = $1 WHERE id = $2').run('online', socket.user.id);
        io.emit('user:status', { userId: socket.user.id, status: 'online' });

        const userConversations = await db.prepare(`
          SELECT conversation_id FROM conversation_members WHERE user_id = $1
        `).all(socket.user.id);

        userConversations.forEach(conv => {
          socket.join(`conv:${conv.conversation_id}`);
        });
      } catch (err) {
        console.error('[SOCKET] Init error:', err);
      }
    })();

    socket.on('conversation:join', async (conversationId) => {
      try {
        const isMember = await db.prepare(`
          SELECT 1 FROM conversation_members WHERE conversation_id = $1 AND user_id = $2
        `).get(conversationId, socket.user.id);

        if (isMember) {
          socket.join(`conv:${conversationId}`);
        }
      } catch (err) {
        console.error('[SOCKET] Join conversation error:', err);
      }
    });

    socket.on('message:send', async (data) => {
      try {
        const { conversationId, content, type, replyTo, mediaUrl, mediaType, mimeType, fileName, fileSize, duration } = data;

        if (!content && !mediaUrl) return;
        if (content && content.trim().length === 0 && !mediaUrl) return;

        const isMember = await db.prepare(`
          SELECT 1 FROM conversation_members WHERE conversation_id = $1 AND user_id = $2
        `).get(conversationId, socket.user.id);

        if (!isMember) return socket.emit('error', { message: 'Anda bukan anggota percakapan ini.' });

        const key = generateConversationKey(conversationId);
        const msgContent = content ? content.trim() : (mediaType === 'voice' ? '\uD83C\uDFA4 Pesan Suara' : mediaType === 'video' ? '\uD83C\uDFA5 Video' : mediaType === 'audio' ? '\uD83C\uDFB5 Audio' : mediaType === 'sticker' ? content || '\uD83D\uDE00' : '\uD83D\uDCCE File');
        const encryptedContent = encryptMessage(msgContent, key);

        const { v4: uuidv4 } = require('uuid');
        const msgId = uuidv4();

        if (replyTo) {
          const replyMsg = await db.prepare('SELECT id FROM messages WHERE id = $1 AND conversation_id = $2')
            .get(replyTo, conversationId);
          if (!replyMsg) return socket.emit('error', { message: 'Pesan reply tidak ditemukan.' });
        }

        let finalType = type || 'text';
        if (mediaUrl) finalType = mediaType || 'image';

        await db.prepare(`
          INSERT INTO messages (id, conversation_id, sender_id, content, type, reply_to)
          VALUES ($1, $2, $3, $4, $5, $6)
        `).run(msgId, conversationId, socket.user.id, encryptedContent, finalType, replyTo || null);

        let replyToData = null;
        if (replyTo) {
          const rMsg = await db.prepare(`
            SELECT m.id, m.content, m.sender_id, u.username
            FROM messages m JOIN users u ON m.sender_id = u.id WHERE m.id = $1
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

        const members = await db.prepare(`
          SELECT user_id FROM conversation_members WHERE conversation_id = $1 AND user_id != $2
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

    socket.on('message:edit', async (data) => {
      try {
        const { messageId, content, conversationId } = data;

        const msg = await db.prepare('SELECT * FROM messages WHERE id = $1 AND sender_id = $2')
          .get(messageId, socket.user.id);

        if (!msg) return socket.emit('error', { message: 'Pesan tidak ditemukan.' });

        const key = generateConversationKey(conversationId);
        const encryptedContent = encryptMessage(content.trim(), key);

        await db.prepare(`
          UPDATE messages SET content = $1, is_edited = 1, updated_at = NOW() WHERE id = $2
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

    socket.on('message:delete', async (data) => {
      try {
        const { messageId, conversationId } = data;

        const msg = await db.prepare('SELECT * FROM messages WHERE id = $1 AND sender_id = $2')
          .get(messageId, socket.user.id);

        if (!msg) return socket.emit('error', { message: 'Pesan tidak ditemukan.' });

        await db.prepare("UPDATE messages SET is_deleted = 1, content = '[Pesan Dihapus]' WHERE id = $1")
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

    socket.on('message:react', async (data) => {
      try {
        const { messageId, emoji, conversationId } = data;

        const existing = await db.prepare(`
          SELECT id FROM reactions WHERE message_id = $1 AND user_id = $2 AND emoji = $3
        `).get(messageId, socket.user.id, emoji);

        if (existing) {
          await db.prepare('DELETE FROM reactions WHERE id = $1').run(existing.id);
          io.to(`conv:${conversationId}`).emit('message:reaction', {
            messageId,
            emoji,
            action: 'removed',
            userId: socket.user.id,
            username: socket.user.username
          });
        } else {
          const { v4: uuidv4 } = require('uuid');
          await db.prepare(`
            INSERT INTO reactions (id, message_id, user_id, emoji) VALUES ($1, $2, $3, $4)
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

    socket.on('typing:start', async (conversationId) => {
      try {
        await db.prepare(`
          INSERT INTO typing_indicators (conversation_id, user_id, is_typing, updated_at)
          VALUES ($1, $2, 1, NOW())
          ON CONFLICT (conversation_id, user_id) DO UPDATE SET is_typing = 1, updated_at = NOW()
        `).run(conversationId, socket.user.id);

        socket.to(`conv:${conversationId}`).emit('typing:start', {
          userId: socket.user.id,
          username: socket.user.username,
          conversationId
        });
      } catch (err) {
        console.error('[SOCKET] Typing start error:', err);
      }
    });

    socket.on('typing:stop', async (conversationId) => {
      try {
        await db.prepare(`
          UPDATE typing_indicators SET is_typing = 0 WHERE conversation_id = $1 AND user_id = $2
        `).run(conversationId, socket.user.id);

        socket.to(`conv:${conversationId}`).emit('typing:stop', {
          userId: socket.user.id,
          conversationId
        });
      } catch (err) {
        console.error('[SOCKET] Typing stop error:', err);
      }
    });

    socket.on('message:read', async (data) => {
      try {
        const { messageId, conversationId } = data;
        await db.prepare(`
          INSERT INTO read_receipts (message_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING
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

    socket.on('user:search', async (query) => {
      try {
        const users = await db.prepare(`
          SELECT id, username, display_name, avatar_url, status
          FROM users
          WHERE (username LIKE $1 OR display_name LIKE $2) AND is_approved = 1 AND id != $3
          LIMIT 20
        `).all(`%${query}%`, `%${query}%`, socket.user.id);

        socket.emit('user:results', users);
      } catch (err) {
        console.error('[SOCKET] Search error:', err);
      }
    });

    socket.on('disconnect', async () => {
      console.log(`[SOCKET] ${socket.user.username} disconnected`);
      onlineUsers.delete(socket.user.id);

      try {
        await db.prepare("UPDATE users SET status = $1, last_seen = NOW() WHERE id = $2")
          .run('offline', socket.user.id);

        io.emit('user:status', { userId: socket.user.id, status: 'offline' });

        await db.prepare('UPDATE typing_indicators SET is_typing = 0 WHERE user_id = $1')
          .run(socket.user.id);
      } catch (err) {
        console.error('[SOCKET] Disconnect error:', err);
      }
    });
  });

  console.log('[SOCKET] Socket.IO initialized');
}

module.exports = { initSocket };
