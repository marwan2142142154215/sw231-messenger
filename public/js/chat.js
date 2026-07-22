const API = '';
let token = localStorage.getItem('chat_token');
let currentUser = null;
let socket = null;
let currentConversation = null;
let conversations = [];
let replyToMessage = null;
let editingMessage = null;
let typingTimeout = null;
let activeReactionMsgId = null;
let stickerData = null;
let mediaRecorder = null;
let audioChunks = [];
let voiceTimer = null;
let voiceSeconds = 0;

const EMOJIS = {
  smileys: ['😀','😃','😄','😁','😆','😅','🤣','😂','🙂','😊','😇','🥰','😍','🤩','😘','😗','😚','😙','🥲','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','😐','😑','😶','😏','😒','🙄','😬','😌','😔','😪','🤤','😴','😷','🤒','🤕','🤢','🤮','🥴','😵','🤯','🥳','🥸','😎','🤓'],
  people: ['👋','🤚','✋','🖖','👌','🤌','🤏','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','🖕','👇','👍','👎','✊','👊','🤛','🤜','👏','🙌','🤝','🙏','💪'],
  nature: ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🐔','🐧','🐦','🦋','🐝','🐙','🦑','🐢','🐍','🌸','🌺','🌻','🌹','🌈','☀️','🌙','⭐','🌊','🔥','❄️'],
  food: ['🍎','🍊','🍋','🍌','🍉','🍇','🍓','🍒','🍑','🥭','🍍','🥝','🍅','🥑','🍔','🍟','🍕','🌮','🌯','🥗','🍰','🍩','🍪','🍫','☕','🍺','🍷'],
  travel: ['✈️','🚗','🚕','🚌','🏎️','🚓','🚑','🚒','🚐','🏍️','🚲','🚁','⛵','🚤','🚂','🚄','🚇','🏠','🏰','🗼','🗽','⛪','🕌'],
  objects: ['⌚','📱','💻','🖥️','📷','📹','🎥','📞','📺','🎵','🎶','🎸','🎹','🎺','💡','🔑','💰','📦','🎁','🎮','🎲','🧩','🎨','✏️','📝'],
  symbols: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','💕','💞','💓','💗','💖','💘','💝','☮️','✝️','☪️','🕉️','☯️','✡️','⚡','💫','✨']
};

async function api(method, path, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (token) opts.headers['Authorization'] = `Bearer ${token}`;
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${API}${path}`, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

async function uploadFile(file) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API}/api/media/upload`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: formData
  });
  if (!res.ok) throw new Error('Upload failed');
  return res.json();
}

// Auth
document.querySelectorAll('.auth-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    const isRegister = tab.dataset.tab === 'register';
    document.getElementById('register-fields').style.display = isRegister ? 'block' : 'none';
    document.getElementById('auth-submit').textContent = isRegister ? 'Register' : 'Login';
  });
});

document.getElementById('auth-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const isRegister = document.querySelector('.auth-tab.active').dataset.tab === 'register';
  const username = document.getElementById('auth-username').value;
  const password = document.getElementById('auth-password').value;
  const msgEl = document.getElementById('auth-msg');
  msgEl.textContent = ''; msgEl.style.color = '';
  try {
    if (isRegister) {
      const displayName = document.getElementById('reg-displayname').value;
      if (!displayName) { msgEl.textContent = 'Display name required.'; return; }
      await api('POST', '/api/auth/register', { username, password, displayName });
      msgEl.style.color = 'var(--success)';
      msgEl.textContent = 'Registration successful! Waiting for admin approval.';
    } else {
      const data = await api('POST', '/api/auth/login', { username, password });
      token = data.token;
      localStorage.setItem('chat_token', token);
      currentUser = data.user;
      showApp();
    }
  } catch (err) { msgEl.textContent = err.message; }
});

function showApp() {
  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('app').style.display = 'flex';
  document.getElementById('my-name').textContent = currentUser.displayName;
  document.getElementById('my-avatar').textContent = currentUser.displayName.charAt(0).toUpperCase();
  requestNotificationPermission();
  initSocket();
  loadConversations();
  loadStickers();
}

// Notifications
function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

function showNotification(title, body, conversationId) {
  if ('Notification' in window && Notification.permission === 'granted') {
    const n = new Notification(title, { body, icon: '/img/default-avatar.png', tag: conversationId });
    n.onclick = () => { window.focus(); if (conversationId) openConversation(conversationId); };
  }
}

// Conversations
async function loadConversations() {
  try {
    const data = await api('GET', '/api/conversations');
    conversations = data.conversations;
    renderConversations();
  } catch (err) { console.error('Load conversations error:', err); }
}

function renderConversations() {
  const list = document.getElementById('conversations-list');
  const search = document.getElementById('search-input').value.toLowerCase();
  const filtered = conversations.filter(c => {
    if (!search) return true;
    return c.name?.toLowerCase().includes(search) || c.members?.some(m => m.display_name.toLowerCase().includes(search));
  });
  list.innerHTML = filtered.map(c => {
    const other = c.type === 'private' ? c.members?.find(m => m.id !== currentUser.id) : null;
    const name = c.type === 'group' ? c.name : (other?.display_name || 'Unknown');
    const initial = name.charAt(0).toUpperCase();
    const preview = c.last_message || 'No messages yet';
    const time = c.last_message_time ? formatTime(c.last_message_time) : '';
    const isActive = currentConversation?.id === c.id;
    return `<div class="conv-item ${isActive ? 'active' : ''}" data-id="${c.id}">
      <div class="conv-avatar">${initial}</div>
      <div class="conv-info">
        <div class="conv-name">${escapeHtml(name)}</div>
        <div class="conv-preview">${escapeHtml(preview)}</div>
      </div>
      <div class="conv-meta">
        <div class="conv-time">${time}</div>
        ${c.unreadCount > 0 ? `<div class="conv-unread">${c.unreadCount}</div>` : ''}
      </div>
    </div>`;
  }).join('');
  list.querySelectorAll('.conv-item').forEach(item => {
    item.addEventListener('click', () => openConversation(item.dataset.id));
  });
}

document.getElementById('search-input').addEventListener('input', renderConversations);

async function openConversation(convId) {
  const conv = conversations.find(c => c.id === convId);
  if (!conv) return;
  currentConversation = conv;
  const other = conv.type === 'private' ? conv.members?.find(m => m.id !== currentUser.id) : null;
  const name = conv.type === 'group' ? conv.name : (other?.display_name || 'Unknown');
  document.getElementById('chat-placeholder').style.display = 'none';
  document.getElementById('chat-active').style.display = 'flex';
  document.getElementById('chat-name').textContent = name;
  document.getElementById('chat-status').textContent = conv.type === 'group' ? `${conv.members?.length || 0} members` : (other?.status || 'offline');
  socket.emit('conversation:join', convId);
  await loadMessages(convId);
  renderConversations();
  if (window.innerWidth <= 768) document.getElementById('chat-area').classList.add('active-mobile');
}

document.getElementById('back-btn').addEventListener('click', () => {
  document.getElementById('chat-area').classList.remove('active-mobile');
});

// Messages
async function loadMessages(convId) {
  try {
    const data = await api('GET', `/api/messages/${convId}`);
    const container = document.getElementById('messages-container');
    container.innerHTML = '';
    data.messages.forEach(msg => appendMessage(msg));
    scrollToBottom();
  } catch (err) { console.error('Load messages error:', err); }
}

function appendMessage(msg) {
  const container = document.getElementById('messages-container');
  const isOwn = msg.sender_id === currentUser.id;
  const div = document.createElement('div');
  div.className = `message ${isOwn ? 'own' : ''}`;
  div.dataset.id = msg.id;
  div.dataset.type = msg.type || 'text';

  const initial = (msg.display_name || msg.username || '?').charAt(0).toUpperCase();
  const time = formatTime(msg.created_at);

  let replyHtml = '';
  if (msg.replyTo) {
    replyHtml = `<div class="msg-reply-ref">
      <span class="msg-reply-name">@${escapeHtml(msg.replyTo.username || 'Unknown')}</span>
      <span class="msg-reply-content">${escapeHtml(msg.replyTo.content || '')}</span>
    </div>`;
  }

  let mediaHtml = '';
  const url = msg.mediaUrl;
  if (msg.type === 'image' && url) {
    mediaHtml = `<div class="msg-media"><img src="${url}" alt="Photo" loading="lazy" onclick="openLightbox('${url}', 'image')"></div>`;
  } else if (msg.type === 'video' && url) {
    mediaHtml = `<div class="msg-media"><video src="${url}" controls autoplay muted playsinline loop preload="auto" onclick="this.paused?this.play():this.pause()"></video></div>`;
  } else if (msg.type === 'audio' && url) {
    mediaHtml = `<div class="msg-media">${createAudioPlayerHTML(url, msg.content)}</div>`;
  } else if (msg.type === 'voice' && url) {
    mediaHtml = `<div class="msg-media"><div class="voice-message">${createAudioPlayerHTML(url, '🎤 Voice Message')}</div></div>`;
  } else if (msg.type === 'sticker') {
    mediaHtml = `<div class="msg-media"><div class="sticker-media">${escapeHtml(msg.content)}</div></div>`;
  } else if (msg.type === 'file' && url) {
    const fname = msg.fileName || 'file';
    const fsize = msg.fileSize ? formatFileSize(msg.fileSize) : '';
    mediaHtml = `<div class="msg-media"><div class="file-badge">
      <span class="file-icon">📄</span>
      <div class="file-info"><div class="file-name">${escapeHtml(fname)}</div><div class="file-size">${fsize}</div></div>
      <a href="${url}" download class="file-download">Download</a>
    </div></div>`;
  }

  const reactions = (msg.reactions || []).reduce((acc, r) => {
    if (!r || !r.emoji) return acc;
    if (!acc[r.emoji]) acc[r.emoji] = { emoji: r.emoji, count: 0, users: [] };
    acc[r.emoji].count++; acc[r.emoji].users.push(r.username);
    return acc;
  }, {});
  let reactionsHtml = '';
  for (const key in reactions) {
    const r = reactions[key];
    reactionsHtml += `<span class="reaction-chip" title="${r.users.join(', ')}">${r.emoji} <span class="reaction-count">${r.count}</span></span>`;
  }

  const textClass = msg.is_deleted ? 'msg-deleted' : '';
  const content = msg.content || '';
  const showText = msg.type !== 'sticker' && content && !content.startsWith('🎤') && !content.startsWith('🎥') && !content.startsWith('🎵') && !content.startsWith('📎');

  div.innerHTML = `
    <div class="msg-avatar">${initial}</div>
    <div class="msg-content">
      ${isOwn ? '' : `<div class="msg-sender">${escapeHtml(msg.display_name || msg.username)}</div>}
      ${replyHtml}
      ${mediaHtml}
      ${showText ? `<div class="msg-text ${textClass}">${escapeHtml(content)}</div>` : (!mediaHtml && content ? `<div class="msg-text ${textClass}">${escapeHtml(content)}</div>` : '')}
      ${reactionsHtml ? `<div class="msg-reactions">${reactionsHtml}</div>` : ''}
      <div class="msg-meta">
        ${msg.is_edited ? '<span class="msg-edited">(edited)</span>' : ''}
        <span class="msg-time">${time}</span>
      </div>
      ${!msg.is_deleted ? `<div class="msg-actions">
        <button class="msg-action-btn" onclick="showReactionPicker(event, '${msg.id}')" title="React">&#128077;</button>
        <button class="msg-action-btn" onclick="startReply('${msg.id}', '${escapeHtml(msg.display_name||msg.username)}', '${escapeHtml(content).replace(/'/g,"\\'")}' )" title="Reply">&#8617;</button>
        ${isOwn ? `<button class="msg-action-btn" onclick="startEdit('${msg.id}', '${escapeHtml(content).replace(/'/g,"\\'").replace(/\n/g,'\\n')}')" title="Edit">&#9998;</button>
        <button class="msg-action-btn" onclick="deleteMessage('${msg.id}')" title="Delete">&#128465;</button>` : ''}
      </div>` : ''}
    </div>
  `;
  container.appendChild(div);
  if (msg.id) socket.emit('message:read', { messageId: msg.id, conversationId: currentConversation?.id });
}

function createAudioPlayerHTML(url, label) {
  const id = 'audio-' + Math.random().toString(36).substr(2,9);
  return `<div class="audio-player">
    <button class="audio-play-btn" id="${id}-btn" onclick="toggleAudio('${url}','${id}')">&#9654;</button>
    <div class="audio-progress-bar" id="${id}-bar" onclick="seekAudio(event,'${url}','${id}')">
      <div class="audio-progress-fill" id="${id}-fill"></div>
    </div>
    <span class="audio-time" id="${id}-time">0:00</span>
  </div>
  <audio id="${id}" src="${url}" preload="auto" ontimeupdate="updateAudioProgress('${id}')" onended="audioEnded('${id}')"></audio>`;
}

window.toggleAudio = function(url, id) {
  const audio = document.getElementById(id);
  const btn = document.getElementById(id+'-btn');
  if (!audio) return;
  if (audio.paused) {
    document.querySelectorAll('audio').forEach(a => { a.pause(); });
    document.querySelectorAll('[id$="-btn"]').forEach(b => { if(b.textContent==='⏸') b.innerHTML='&#9654;'; });
    audio.play();
    btn.innerHTML = '⏸';
  } else {
    audio.pause();
    btn.innerHTML = '&#9654;';
  }
};

window.updateAudioProgress = function(id) {
  const audio = document.getElementById(id);
  const fill = document.getElementById(id+'-fill');
  const time = document.getElementById(id+'-time');
  if (!audio || !fill || !time) return;
  const pct = (audio.currentTime / audio.duration) * 100 || 0;
  fill.style.width = pct + '%';
  time.textContent = formatAudioTime(audio.currentTime);
};

window.seekAudio = function(e, url, id) {
  const bar = document.getElementById(id+'-bar');
  const audio = document.getElementById(id);
  if (!bar || !audio) return;
  const rect = bar.getBoundingClientRect();
  const pct = (e.clientX - rect.left) / rect.width;
  audio.currentTime = pct * audio.duration;
};

window.audioEnded = function(id) {
  const btn = document.getElementById(id+'-btn');
  const fill = document.getElementById(id+'-fill');
  if (btn) btn.innerHTML = '&#9654;';
  if (fill) fill.style.width = '0%';
};

function formatAudioTime(s) {
  const m = Math.floor(s/60);
  const sec = Math.floor(s%60);
  return `${m}:${sec.toString().padStart(2,'0')}`;
}

function scrollToBottom() {
  const c = document.getElementById('messages-container');
  c.scrollTop = c.scrollHeight;
}

// Send Message
document.getElementById('message-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  socket.emit('typing:start', currentConversation?.id);
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => socket.emit('typing:stop', currentConversation?.id), 2000);
});
document.getElementById('send-btn').addEventListener('click', sendMessage);

function sendMessage() {
  const input = document.getElementById('message-input');
  const content = input.value.trim();
  if (!content || !currentConversation) return;
  if (editingMessage) {
    socket.emit('message:edit', { messageId: editingMessage, content, conversationId: currentConversation.id });
    editingMessage = null;
    document.getElementById('edit-preview').style.display = 'none';
  } else {
    socket.emit('message:send', {
      conversationId: currentConversation.id,
      content, type: 'text', replyTo: replyToMessage
    });
  }
  input.value = '';
  input.style.height = 'auto';
  replyToMessage = null;
  document.getElementById('reply-preview').style.display = 'none';
}

function startReply(msgId, name, content) {
  replyToMessage = msgId; editingMessage = null;
  document.getElementById('edit-preview').style.display = 'none';
  document.getElementById('reply-to-name').textContent = `@${name}`;
  document.getElementById('reply-to-text').textContent = content.substring(0, 80);
  document.getElementById('reply-preview').style.display = 'flex';
  document.getElementById('message-input').focus();
}
document.getElementById('reply-close').addEventListener('click', () => {
  replyToMessage = null; document.getElementById('reply-preview').style.display = 'none';
});

function startEdit(msgId, content) {
  editingMessage = msgId; replyToMessage = null;
  document.getElementById('reply-preview').style.display = 'none';
  document.getElementById('edit-preview').style.display = 'flex';
  document.getElementById('message-input').value = content.replace(/\\n/g, '\n');
  document.getElementById('message-input').focus();
}
document.getElementById('edit-close').addEventListener('click', () => {
  editingMessage = null; document.getElementById('edit-preview').style.display = 'none';
  document.getElementById('message-input').value = '';
});

function deleteMessage(msgId) {
  if (!confirm('Delete this message?')) return;
  socket.emit('message:delete', { messageId: msgId, conversationId: currentConversation.id });
}

// Reactions
function showReactionPicker(event, msgId) {
  event.stopPropagation();
  activeReactionMsgId = msgId;
  const picker = document.getElementById('reaction-picker');
  const rect = event.target.getBoundingClientRect();
  picker.style.left = `${Math.min(rect.left, window.innerWidth - 300)}px`;
  picker.style.top = `${rect.top - 50}px`;
  picker.style.display = 'flex';
}

document.querySelectorAll('.reaction-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (activeReactionMsgId && currentConversation) {
      socket.emit('message:react', { messageId: activeReactionMsgId, emoji: btn.dataset.emoji, conversationId: currentConversation.id });
    }
    document.getElementById('reaction-picker').style.display = 'none';
    activeReactionMsgId = null;
  });
});

document.addEventListener('click', (e) => {
  if (!e.target.closest('.reaction-picker') && !e.target.closest('.msg-action-btn'))
    document.getElementById('reaction-picker').style.display = 'none';
  if (!e.target.closest('.emoji-picker') && !e.target.closest('#emoji-trigger'))
    document.getElementById('emoji-picker').style.display = 'none';
  if (!e.target.closest('.sticker-panel') && !e.target.closest('#sticker-btn'))
    document.getElementById('sticker-panel').classList.remove('show');
  if (!e.target.closest('.attach-menu') && !e.target.closest('#attach-btn'))
    document.getElementById('attach-menu').classList.remove('show');
});

// Emoji Picker
document.getElementById('emoji-trigger').addEventListener('click', (e) => {
  e.stopPropagation();
  const p = document.getElementById('emoji-picker');
  p.style.display = p.style.display === 'none' ? 'block' : 'none';
  if (p.style.display === 'block') renderEmojiGrid('smileys');
});

function renderEmojiGrid(category) {
  const grid = document.getElementById('emoji-grid');
  const emojis = EMOJIS[category] || EMOJIS.smileys;
  grid.innerHTML = emojis.map(e => `<div class="emoji-item" data-emoji="${e}">${e}</div>`).join('');
  grid.querySelectorAll('.emoji-item').forEach(item => {
    item.addEventListener('click', () => {
      document.getElementById('message-input').value += item.dataset.emoji;
      document.getElementById('message-input').focus();
    });
  });
}

document.querySelectorAll('.emoji-cat').forEach(cat => {
  cat.addEventListener('click', () => {
    document.querySelectorAll('.emoji-cat').forEach(c => c.classList.remove('active'));
    cat.classList.add('active');
    renderEmojiGrid(cat.dataset.cat);
  });
});

document.getElementById('emoji-search').addEventListener('input', (e) => {
  const q = e.target.value.toLowerCase();
  if (!q) { renderEmojiGrid('smileys'); return; }
  const all = Object.values(EMOJIS).flat();
  document.getElementById('emoji-grid').innerHTML = all.slice(0, 50).map(em => `<div class="emoji-item" data-emoji="${em}">${em}</div>`).join('');
  document.querySelectorAll('.emoji-item').forEach(item => {
    item.addEventListener('click', () => { document.getElementById('message-input').value += item.dataset.emoji; });
  });
});

// Stickers
async function loadStickers() {
  try {
    const data = await api('GET', '/api/media/stickers');
    stickerData = data.categories;
    renderStickerTabs();
  } catch (err) { console.error('Load stickers error:', err); }
}

function renderStickerTabs() {
  if (!stickerData) return;
  const tabs = document.getElementById('sticker-tabs');
  tabs.innerHTML = stickerData.map((c, i) =>
    `<button class="sticker-tab ${i===0?'active':''}" data-idx="${i}">${c.name}</button>`
  ).join('');
  tabs.querySelectorAll('.sticker-tab').forEach(t => {
    t.addEventListener('click', () => {
      tabs.querySelectorAll('.sticker-tab').forEach(x => x.classList.remove('active'));
      t.classList.add('active');
      renderStickerGrid(parseInt(t.dataset.idx));
    });
  });
  renderStickerGrid(0);
}

function renderStickerGrid(idx) {
  if (!stickerData || !stickerData[idx]) return;
  const grid = document.getElementById('sticker-grid');
  grid.innerHTML = stickerData[idx].stickers.map(s =>
    `<div class="sticker-item" data-sticker="${s}">${s}</div>`
  ).join('');
  grid.querySelectorAll('.sticker-item').forEach(item => {
    item.addEventListener('click', () => sendSticker(item.dataset.sticker));
  });
}

function sendSticker(emoji) {
  if (!currentConversation) return;
  socket.emit('message:send', {
    conversationId: currentConversation.id,
    content: emoji, type: 'sticker', mediaType: 'sticker'
  });
  document.getElementById('sticker-panel').classList.remove('show');
}

document.getElementById('sticker-btn').addEventListener('click', (e) => {
  e.stopPropagation();
  document.getElementById('sticker-panel').classList.toggle('show');
  document.getElementById('emoji-picker').style.display = 'none';
});

// File Attachments
document.getElementById('attach-btn').addEventListener('click', (e) => {
  e.stopPropagation();
  document.getElementById('attach-menu').classList.toggle('show');
});

document.querySelectorAll('.attach-menu-item').forEach(item => {
  item.addEventListener('click', () => {
    const type = item.dataset.type;
    document.getElementById('attach-menu').classList.remove('show');
    if (type === 'image') document.getElementById('file-input-image').click();
    else if (type === 'video') document.getElementById('file-input-video').click();
    else if (type === 'audio') document.getElementById('file-input-audio').click();
    else document.getElementById('file-input-file').click();
  });
});

['image','video','audio','file'].forEach(type => {
  document.getElementById(`file-input-${type}`).addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file || !currentConversation) return;
    try {
      const uploaded = await uploadFile(file);
      socket.emit('message:send', {
        conversationId: currentConversation.id,
        content: file.name,
        type: uploaded.type,
        mediaType: uploaded.type,
        mediaUrl: uploaded.url,
        mimeType: uploaded.mimeType,
        fileName: file.name,
        fileSize: file.size
      });
    } catch (err) { alert('Upload failed: ' + err.message); }
    e.target.value = '';
  });
});

// Voice Recording
document.getElementById('voice-btn').addEventListener('click', startVoiceRecording);
document.getElementById('voice-cancel').addEventListener('click', cancelVoiceRecording);
document.getElementById('voice-send').addEventListener('click', sendVoiceMessage);

async function startVoiceRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
    audioChunks = [];
    mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunks.push(e.data); };
    mediaRecorder.onstop = () => { stream.getTracks().forEach(t => t.stop()); };
    mediaRecorder.start();

    document.getElementById('text-mode').style.display = 'none';
    document.getElementById('voice-mode').style.display = 'block';
    document.getElementById('voice-btn').style.display = 'none';

    voiceSeconds = 0;
    const wave = document.getElementById('voice-wave');
    wave.innerHTML = '';
    for (let i = 0; i < 30; i++) {
      const bar = document.createElement('div');
      bar.className = 'voice-wave-bar';
      bar.style.animationDelay = `${Math.random() * 0.5}s`;
      wave.appendChild(bar);
    }

    voiceTimer = setInterval(() => {
      voiceSeconds++;
      document.getElementById('voice-timer').textContent = `${Math.floor(voiceSeconds/60)}:${(voiceSeconds%60).toString().padStart(2,'0')}`;
    }, 1000);
  } catch (err) {
    alert('Microphone access denied.');
  }
}

function cancelVoiceRecording() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
  clearInterval(voiceTimer);
  document.getElementById('text-mode').style.display = 'flex';
  document.getElementById('voice-mode').style.display = 'none';
  document.getElementById('voice-btn').style.display = 'flex';
}

async function sendVoiceMessage() {
  if (!mediaRecorder || !currentConversation) return;
  mediaRecorder.stop();
  clearInterval(voiceTimer);

  const blob = new Blob(audioChunks, { type: 'audio/webm' });
  const formData = new FormData();
  formData.append('voice', blob, 'voice.webm');

  try {
    const res = await fetch(`${API}/api/media/upload-voice`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    });
    const data = await res.json();
    socket.emit('message:send', {
      conversationId: currentConversation.id,
      content: '🎤 Voice Message',
      type: 'voice',
      mediaType: 'voice',
      mediaUrl: data.url,
      mimeType: data.mimeType,
      duration: voiceSeconds
    });
  } catch (err) { alert('Voice upload failed.'); }

  document.getElementById('text-mode').style.display = 'flex';
  document.getElementById('voice-mode').style.display = 'none';
  document.getElementById('voice-btn').style.display = 'flex';
}

// Lightbox
window.openLightbox = function(url, type) {
  const lb = document.getElementById('lightbox');
  if (type === 'image') lb.innerHTML = `<img src="${url}" alt="Full size">`;
  else if (type === 'video') lb.innerHTML = `<video src="${url}" controls autoplay style="max-width:90vw;max-height:90vh;"></video>`;
  lb.style.display = 'flex';
  lb.onclick = () => { lb.style.display = 'none'; lb.innerHTML = ''; };
};

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes/1024).toFixed(1) + ' KB';
  return (bytes/1048576).toFixed(1) + ' MB';
}

// New Chat / Group
document.getElementById('new-chat-btn').addEventListener('click', showNewChatModal);
document.getElementById('new-group-btn').addEventListener('click', showNewGroupModal);

function showNewChatModal() {
  document.getElementById('modal-title').textContent = 'New Conversation';
  document.getElementById('modal-body').innerHTML = `<input type="text" class="modal-input" id="user-search-input" placeholder="Search user..."><div class="modal-user-list" id="user-search-results"></div>`;
  document.getElementById('modal-footer').innerHTML = '';
  document.getElementById('modal-overlay').style.display = 'flex';
  document.getElementById('user-search-input').addEventListener('input', (e) => {
    if (e.target.value.length >= 1) socket.emit('user:search', e.target.value);
  });
}

function showNewGroupModal() {
  document.getElementById('modal-title').textContent = 'New Group';
  document.getElementById('modal-body').innerHTML = `<input type="text" class="modal-input" id="group-name-input" placeholder="Group name"><input type="text" class="modal-input" id="group-user-search" placeholder="Search users..."><div class="modal-user-list" id="group-user-results"></div><div id="selected-members" style="margin-top:10px;"></div>`;
  document.getElementById('modal-footer').innerHTML = `<button class="btn-cancel" onclick="closeModal()">Cancel</button><button class="btn-confirm" onclick="createGroup()">Create Group</button>`;
  document.getElementById('modal-overlay').style.display = 'flex';
  let selectedMembers = [];
  document.getElementById('group-user-search').addEventListener('input', (e) => socket.emit('user:search', e.target.value));
  window.createGroup = async () => {
    const name = document.getElementById('group-name-input').value.trim();
    if (!name || selectedMembers.length === 0) return;
    try {
      const data = await api('POST', '/api/conversations/group', { name, memberIds: selectedMembers });
      closeModal(); await loadConversations(); openConversation(data.conversationId);
    } catch (err) { alert(err.message); }
  };
}

function closeModal() { document.getElementById('modal-overlay').style.display = 'none'; }
document.getElementById('close-modal').addEventListener('click', closeModal);
document.getElementById('modal-overlay').addEventListener('click', (e) => {
  if (e.target === document.getElementById('modal-overlay')) closeModal();
});

// Members
document.getElementById('members-btn').addEventListener('click', async () => {
  if (!currentConversation) return;
  const panel = document.getElementById('members-panel');
  panel.style.display = panel.style.display === 'none' ? 'flex' : 'none';
  if (panel.style.display === 'flex') {
    try {
      const data = await api('GET', `/api/conversations/${currentConversation.id}/members`);
      document.getElementById('members-list').innerHTML = data.members.map(m => `
        <div class="member-item">
          <div class="member-avatar">${m.display_name.charAt(0).toUpperCase()}</div>
          <div class="member-info"><div class="member-name">${escapeHtml(m.display_name)}</div><div class="member-role">${m.role} - ${m.status}</div></div>
        </div>`).join('');
    } catch (err) { console.error(err); }
  }
});
document.getElementById('close-members').addEventListener('click', () => {
  document.getElementById('members-panel').style.display = 'none';
});

// Socket
function initSocket() {
  socket = io({ auth: { token } });
  socket.on('connect', () => console.log('[SOCKET] Connected'));
  socket.on('disconnect', () => console.log('[SOCKET] Disconnected'));

  socket.on('message:new', (msg) => {
    if (currentConversation && msg.conversation_id === currentConversation.id) {
      appendMessage(msg); scrollToBottom();
    }
    loadConversations();
    if (msg.sender_id !== currentUser.id) {
      showNotification(msg.display_name || msg.username, msg.content || 'Media message', msg.conversation_id);
      playNotifSound();
    }
  });

  socket.on('message:edited', (data) => {
    if (currentConversation && data.conversationId === currentConversation.id) {
      const el = document.querySelector(`.message[data-id="${data.messageId}"] .msg-text`);
      if (el) { el.textContent = data.content; const meta = el.closest('.msg-content')?.querySelector('.msg-meta'); if (meta && !meta.querySelector('.msg-edited')) meta.insertAdjacentHTML('afterbegin', '<span class="msg-edited">(edited)</span>'); }
    }
  });

  socket.on('message:deleted', (data) => {
    if (currentConversation && data.conversationId === currentConversation.id) {
      const el = document.querySelector(`.message[data-id="${data.messageId}"]`);
      if (el) {
        const textEl = el.querySelector('.msg-text');
        if (textEl) { textEl.textContent = '[Pesan Dihapus]'; textEl.className = 'msg-text msg-deleted'; }
        const mediaEl = el.querySelector('.msg-media');
        if (mediaEl) mediaEl.remove();
        const actions = el.querySelector('.msg-actions');
        if (actions) actions.remove();
      }
    }
  });

  socket.on('message:reaction', (data) => {
    if (currentConversation && data.conversationId === currentConversation.id) loadMessages(currentConversation.id);
  });

  socket.on('typing:start', (data) => {
    if (currentConversation && data.conversationId === currentConversation.id) {
      document.getElementById('typing-indicator').style.display = 'flex';
      document.getElementById('typing-text').textContent = `${data.username} is typing`;
    }
  });
  socket.on('typing:stop', (data) => {
    if (currentConversation && data.conversationId === currentConversation.id)
      document.getElementById('typing-indicator').style.display = 'none';
  });

  socket.on('user:status', (data) => {
    if (currentConversation) {
      const member = currentConversation.members?.find(m => m.id === data.userId);
      if (member) { member.status = data.status; document.getElementById('chat-status').textContent = data.status; }
    }
  });

  socket.on('user:results', (users) => {
    const container = document.getElementById('user-search-results') || document.getElementById('group-user-results');
    if (!container) return;
    container.innerHTML = users.map(u => `<div class="modal-user-item" data-id="${u.id}"><div class="member-avatar">${u.display_name.charAt(0).toUpperCase()}</div><div class="member-info"><div class="member-name">${escapeHtml(u.display_name)}</div><div class="member-role">${u.username} - ${u.status}</div></div></div>`).join('');
    container.querySelectorAll('.modal-user-item').forEach(item => {
      item.addEventListener('click', async () => {
        try {
          const data = await api('POST', '/api/conversations/private', { userId: item.dataset.id });
          closeModal(); await loadConversations(); openConversation(data.conversationId);
        } catch (err) { alert(err.message); }
      });
    });
  });

  socket.on('notification', (data) => {
    showNotification(data.from, data.preview, data.conversationId);
  });
}

function playNotifSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.15);
  } catch(e) {}
}

// Helpers
function formatTime(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now - d) / 86400000);
  if (diffDays === 0) return d.toLocaleTimeString('id', { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return d.toLocaleDateString('id', { weekday: 'short' });
  return d.toLocaleDateString('id', { day: 'numeric', month: 'short' });
}

function escapeHtml(text) {
  const d = document.createElement('div'); d.textContent = text; return d.innerHTML;
}

// Loading animation
function initLoadingAnimation() {
  const field = document.getElementById('stars-field');
  if (!field) return;
  for (let i = 0; i < 80; i++) {
    const star = document.createElement('div');
    star.className = 'star';
    star.style.left = Math.random() * 100 + '%';
    star.style.top = Math.random() * 100 + '%';
    star.style.animationDelay = (Math.random() * 2) + 's';
    star.style.width = (Math.random() * 3 + 1) + 'px';
    star.style.height = star.style.width;
    field.appendChild(star);
  }

  setTimeout(() => {
    const loadScreen = document.getElementById('loading-screen');
    if (loadScreen) {
      loadScreen.classList.add('fade-out');
      setTimeout(() => {
        loadScreen.style.display = 'none';
        document.getElementById('auth-screen').style.display = 'flex';
      }, 800);
    }
  }, 7000);
}

initLoadingAnimation();

// Init
if (token) {
  document.getElementById('loading-screen').style.display = 'none';
  document.getElementById('auth-screen').style.display = 'none';
  api('GET', '/api/auth/me').then(data => { currentUser = data.user; showApp(); }).catch(() => {
    localStorage.removeItem('chat_token');
    document.getElementById('loading-screen').style.display = 'none';
    document.getElementById('auth-screen').style.display = 'flex';
  });
}
