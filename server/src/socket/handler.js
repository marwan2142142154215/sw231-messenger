const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');
const { getSupabase } = require('../db');
const { generateConversationKey, encryptMessage, decryptMessage } = require('../utils/crypto');

const onlineUsers = new Map();
const typingUsers = new Map();
const readBatch = new Map();
const rateLimits = new Map();
const BATCH_INTERVAL = 3000;
const RATE_LIMIT_MAX = 30;

function checkRateLimit(socketId, event) {
  const key = socketId + ':' + event;
  const now = Date.now();
  const entry = rateLimits.get(key);
  if (!entry || now - entry.start > 1000) { rateLimits.set(key, { start: now, count: 1 }); return true; }
  entry.count++;
  return entry.count <= RATE_LIMIT_MAX;
}

setInterval(async () => {
  if (readBatch.size === 0) return;
  const entries = [...readBatch.entries()];
  readBatch.clear();
  try {
    const sb = getSupabase();
    const rows = entries.map(([key]) => {
      const [messageId, userId] = key.split('|');
      return { message_id: messageId, user_id: userId };
    });
    if (rows.length > 0) {
      await sb.from('read_receipts').upsert(rows, { onConflict: 'message_id,user_id', ignoreDuplicates: true });
    }
  } catch {}
}, BATCH_INTERVAL);

function initSocket(io) {
  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication required'));
    try {
      const decoded = jwt.verify(token, config.jwt.secret);
      const { data: user } = await getSupabase().from('users')
        .select('id, username, display_name, avatar_url, role, status').eq('id', decoded.userId).eq('is_approved', 1).single();
      if (!user) return next(new Error('User not found'));
      socket.user = user;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`[SOCKET] ${socket.user.username} connected`);
    const prev = onlineUsers.get(socket.user.id);
    const tabCount = prev ? (prev.tabCount || 1) + 1 : 1;
    onlineUsers.set(socket.user.id, { socketId: socket.id, user: socket.user, tabCount });

    (async () => {
      try {
        const sb = getSupabase();
        if (tabCount === 1) {
          await sb.from('users').update({ status: 'online' }).eq('id', socket.user.id);
          io.emit('user:status', { userId: socket.user.id, status: 'online' });
        }
        const { data: myConvs } = await sb.from('conversation_members').select('conversation_id').eq('user_id', socket.user.id);
        (myConvs || []).forEach(c => socket.join('conv:' + c.conversation_id));
        socket.emit('connected', { userId: socket.user.id });
      } catch (err) { console.error('[SOCKET] Init error:', err); }
    })();

    socket.on('conversation:join', (conversationId) => {
      if (typeof conversationId === 'string' && conversationId.length > 0) socket.join('conv:' + conversationId);
    });

    socket.on('message:send', async (data) => {
      if (!checkRateLimit(socket.id, 'message:send')) return;
      try {
        const { conversationId, content, type, replyTo, mediaUrl, mediaType, mimeType, fileName, fileSize, duration } = data;
        if (!conversationId || (!content && !mediaUrl)) return;
        if (content && content.trim().length === 0 && !mediaUrl) return;

        const sb = getSupabase();
        const { data: isMember } = await sb.from('conversation_members')
          .select('conversation_id').eq('conversation_id', conversationId).eq('user_id', socket.user.id).single();
        if (!isMember) return;

        const key = generateConversationKey(conversationId);
        let msgContent = content ? content.trim() : (mediaType === 'voice' ? '🎤 Voice' : mediaType === 'video' ? '🎥 Video' : mediaType === 'audio' ? '🎵 Audio' : mediaType === 'sticker' ? (content || '😀') : '📎 File');
        const encryptedContent = encryptMessage(msgContent, key);
        const msgId = uuidv4();
        const now = new Date().toISOString();
        let finalType = type || 'text';
        if (mediaUrl) finalType = mediaType || 'image';

        let replyToData = null;
        if (replyTo) {
          const { data: rMsg } = await sb.from('messages')
            .select('id, content, sender_id, users!messages_sender_id_fkey(username)').eq('id', replyTo).single();
          if (rMsg) {
            try { rMsg.content = decryptMessage(rMsg.content, key); } catch {}
            replyToData = { id: rMsg.id, content: rMsg.content, sender_id: rMsg.sender_id, username: rMsg.users?.username };
          }
        }

        const message = {
          id: msgId, conversation_id: conversationId, sender_id: socket.user.id,
          content: msgContent, type: finalType, mediaUrl: mediaUrl || null, mediaType: mediaType || null,
          mimeType: mimeType || null, fileName: fileName || null, fileSize: fileSize || null,
          duration: duration || null, reply_to: replyTo, replyTo: replyToData,
          username: socket.user.username, display_name: socket.user.display_name,
          avatar_url: socket.user.avatar_url, is_edited: 0, is_deleted: 0,
          created_at: now, reactions: []
        };

        const { error: insertError } = await sb.from('messages').insert([{
          id: msgId, conversation_id: conversationId, sender_id: socket.user.id,
          content: encryptedContent, type: finalType, reply_to: replyTo || null, created_at: now,
          media_url: mediaUrl || null, media_type: mediaType || null, mime_type: mimeType || null,
          file_name: fileName || null, file_size: fileSize || null, duration: duration || null
        }]);

        if (insertError) {
          console.error('[SOCKET] Message insert failed:', insertError.message);
          socket.emit('message:error', { error: 'Failed to save message' });
          return;
        }

        io.to('conv:' + conversationId).emit('message:new', message);

        sb.from('conversation_members').select('user_id').eq('conversation_id', conversationId).neq('user_id', socket.user.id)
          .then(({ data: members }) => {
            (members || []).forEach(m => {
              const memberOnline = onlineUsers.get(m.user_id);
              if (memberOnline) {
                io.to(memberOnline.socketId).emit('notification', {
                  type: 'new_message', conversationId,
                  from: socket.user.display_name || socket.user.username,
                  preview: msgContent.substring(0, 50)
                });
              }
            });
          }).catch(() => {});
      } catch (err) { console.error('[SOCKET] Send error:', err); }
    });

    socket.on('message:edit', async (data) => {
      if (!checkRateLimit(socket.id, 'message:edit')) return;
      try {
        const { messageId, content, conversationId } = data;
        if (!messageId || !content || !conversationId) return;
        const sb = getSupabase();
        const { data: msg } = await sb.from('messages').select('id').eq('id', messageId).eq('sender_id', socket.user.id).single();
        if (!msg) return;
        const key = generateConversationKey(conversationId);
        await sb.from('messages').update({ content: encryptMessage(content.trim(), key), is_edited: 1, updated_at: new Date().toISOString() }).eq('id', messageId);
        io.to('conv:' + conversationId).emit('message:edited', { messageId, content: content.trim(), conversationId });
      } catch (err) { console.error('[SOCKET] Edit error:', err); }
    });

    socket.on('message:delete', async (data) => {
      if (!checkRateLimit(socket.id, 'message:delete')) return;
      try {
        const { messageId, conversationId, forEveryone } = data;
        if (!messageId || !conversationId) return;
        const sb = getSupabase();
        const { data: msg } = await sb.from('messages').select('id').eq('id', messageId).eq('sender_id', socket.user.id).single();
        if (!msg) return;
        if (forEveryone) {
          await sb.from('messages').update({ is_deleted: 1, content: '', deleted_for: 'everyone' }).eq('id', messageId);
        } else {
          await sb.from('messages').update({ is_deleted: 1, content: '' }).eq('id', messageId);
        }
        io.to('conv:' + conversationId).emit('message:deleted', { messageId, conversationId, forEveryone });
      } catch (err) { console.error('[SOCKET] Delete error:', err); }
    });

    socket.on('message:react', async (data) => {
      if (!checkRateLimit(socket.id, 'message:react')) return;
      try {
        const { messageId, emoji, conversationId } = data;
        if (!messageId || !emoji || !conversationId) return;
        const sb = getSupabase();
        const { data: existing } = await sb.from('reactions')
          .select('id').eq('message_id', messageId).eq('user_id', socket.user.id).eq('emoji', emoji).single();
        if (existing) {
          await sb.from('reactions').delete().eq('id', existing.id);
          io.to('conv:' + conversationId).emit('message:reaction', { messageId, emoji, action: 'removed', userId: socket.user.id });
        } else {
          await sb.from('reactions').insert([{ id: uuidv4(), message_id: messageId, user_id: socket.user.id, emoji }]);
          io.to('conv:' + conversationId).emit('message:reaction', { messageId, emoji, action: 'added', userId: socket.user.id });
        }
      } catch (err) { console.error('[SOCKET] React error:', err); }
    });

    socket.on('typing:start', (conversationId) => {
      if (!conversationId) return;
      typingUsers.set(conversationId + ':' + socket.user.id, { userId: socket.user.id, username: socket.user.username, conversationId, ts: Date.now() });
      socket.to('conv:' + conversationId).emit('typing:start', { userId: socket.user.id, username: socket.user.username, conversationId });
    });

    socket.on('typing:stop', (conversationId) => {
      if (!conversationId) return;
      typingUsers.delete(conversationId + ':' + socket.user.id);
      socket.to('conv:' + conversationId).emit('typing:stop', { userId: socket.user.id, conversationId });
    });

    socket.on('message:read', (data) => {
      if (!checkRateLimit(socket.id, 'message:read')) return;
      const { messageId } = data;
      if (messageId) readBatch.set(messageId + '|' + socket.user.id, 1);
    });

    socket.on('user:search', async (query) => {
      if (!checkRateLimit(socket.id, 'user:search')) return;
      try {
        if (!query || query.length < 1) return socket.emit('user:results', []);
        const sanitized = String(query).replace(/[%_]/g, '').substring(0, 30);
        const { data: users } = await getSupabase().from('users')
          .select('id, username, display_name, avatar_url, status')
          .or(`username.ilike.%${sanitized}%,display_name.ilike.%${sanitized}%`)
          .eq('is_approved', 1).neq('id', socket.user.id).limit(15);
        socket.emit('user:results', users || []);
      } catch (err) { console.error('[SOCKET] Search error:', err); }
    });

    socket.on('disconnect', async () => {
      console.log(`[SOCKET] ${socket.user.username} disconnected`);
      const entry = onlineUsers.get(socket.user.id);
      if (entry && entry.socketId === socket.id) {
        if (entry.tabCount > 1) {
          onlineUsers.set(socket.user.id, { ...entry, tabCount: entry.tabCount - 1 });
        } else {
          onlineUsers.delete(socket.user.id);
          try {
            const sb = getSupabase();
            await sb.from('users').update({ status: 'offline', last_seen: new Date().toISOString() }).eq('id', socket.user.id);
            io.emit('user:status', { userId: socket.user.id, status: 'offline' });
          } catch {}
        }
      }
      const toDelete = [];
      typingUsers.forEach((val, key) => { if (val.userId === socket.user.id) toDelete.push(key); });
      toDelete.forEach(k => {
        const t = typingUsers.get(k); typingUsers.delete(k);
        if (t) socket.to('conv:' + t.conversationId).emit('typing:stop', { userId: socket.user.id, conversationId: t.conversationId });
      });
    });
  });

  setInterval(() => {
    const now = Date.now();
    typingUsers.forEach((val, key) => { if (now - val.ts > 12000) typingUsers.delete(key); });
  }, 15000);

  console.log('[SOCKET] Socket.IO initialized');
}

module.exports = { initSocket };
