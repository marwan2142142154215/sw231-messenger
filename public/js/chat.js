var API = '';
var token = localStorage.getItem('chat_token');
var currentUser = null;
var socket = null;
var currentConversation = null;
var conversations = [];
var replyToMessage = null;
var editingMessage = null;
var typingTimeout = null;
var activeReactionMsgId = null;
var stickerData = null;
var mediaRecorder = null;
var audioChunks = [];
var voiceTimer = null;
var voiceSeconds = 0;

var EMOJIS = {
  smileys: ['\u{1F600}','\u{1F603}','\u{1F604}','\u{1F601}','\u{1F606}','\u{1F605}','\u{1F923}','\u{1F602}','\u{1F642}','\u{1F60A}','\u{1F607}','\u{1F970}','\u{1F60D}','\u{1F929}','\u{1F618}','\u{1F617}','\u{1F61A}','\u{1F619}','\u{1F60B}','\u{1F61B}','\u{1F61C}','\u{1F92A}','\u{1F61D}','\u{1F911}','\u{1F917}','\u{1F92D}','\u{1F914}','\u{1F610}','\u{1F611}','\u{1F636}','\u{1F60F}','\u{1F612}','\u{1F644}','\u{1F62C}','\u{1F61F}','\u{1F634}','\u{1F637}','\u{1F912}','\u{1F915}','\u{1F922}','\u{1F92E}','\u{1F974}','\u{1F635}','\u{1F92F}','\u{1F973}','\u{1F978}','\u{1F60E}','\u{1F913}','\u{1F9D0}'],
  people: ['\u{1F44B}','\u{1F91A}','\u{270B}','\u{1F590}','\u{1F44C}','\u{1F90C}','\u{1F90F}','\u{270C}','\u{1F91E}','\u{1F91F}','\u{1F918}','\u{1F919}','\u{1F91B}','\u{1F448}','\u{1F449}','\u{1F446}','\u{1F595}','\u{1F447}','\u{1F44D}','\u{1F44E}','\u{270A}','\u{1F44A}','\u{1F91C}','\u{1F91D}','\u{1F44F}','\u{1F64C}','\u{1F91D}','\u{1F64F}','\u{1F4AA}'],
  nature: ['\u{1F436}','\u{1F431}','\u{1F42D}','\u{1F439}','\u{1F430}','\u{1F98A}','\u{1F43B}','\u{1F43C}','\u{1F428}','\u{1F42F}','\u{1F981}','\u{1F402}','\u{1F437}','\u{1F438}','\u{1F412}','\u{1F414}','\u{1F427}','\u{1F426}','\u{1F98B}','\u{1F41D}','\u{1F419}','\u{1F41A}','\u{1F422}','\u{1F40D}','\u{1F338}','\u{1F33A}','\u{1F33B}','\u{1F339}','\u{1F308}','\u{2600}','\u{1F319}','\u{2B50}','\u{1F30A}','\u{1F525}','\u{2744}'],
  food: ['\u{1F34E}','\u{1F34A}','\u{1F34B}','\u{1F34C}','\u{1F349}','\u{1F347}','\u{1F353}','\u{1F352}','\u{1F351}','\u{1F96D}','\u{1F34D}','\u{1F95D}','\u{1F345}','\u{1F951}','\u{1F354}','\u{1F35F}','\u{1F355}','\u{1F32E}','\u{1F32F}','\u{1F957}','\u{1F370}','\u{1F36A}','\u{1F36B}','\u{1F36C}','\u{2615}','\u{1F37A}','\u{1F377}'],
  travel: ['\u{2708}','\u{1F697}','\u{1F695}','\u{1F68C}','\u{1F3CE}','\u{1F699}','\u{1F691}','\u{1F692}','\u{1F690}','\u{1F694}','\u{1F6B2}','\u{1F681}','\u{26F5}','\u{1F6A4}','\u{1F682}','\u{1F684}','\u{1F687}','\u{1F3E0}','\u{1F3F0}','\u{1F5FC}','\u{1F5FD}','\u{26EA}','\u{1F54C}'],
  objects: ['\u{231A}','\u{1F4F1}','\u{1F4BB}','\u{1F5A5}','\u{1F4F7}','\u{1F4F9}','\u{1F3A5}','\u{1F4DE}','\u{1F4FA}','\u{1F3B5}','\u{1F3B6}','\u{1F3B8}','\u{1F3B9}','\u{1F3BA}','\u{1F4A1}','\u{1F511}','\u{1F4B0}','\u{1F4E6}','\u{1F381}','\u{1F3AE}','\u{1F3B2}','\u{1F9E9}','\u{1F3A8}','\u{270F}','\u{1F4DD}'],
  symbols: ['\u{2764}','\u{1F9E1}','\u{1F49B}','\u{1F49A}','\u{1F499}','\u{1F49C}','\u{1F5A4}','\u{1F90D}','\u{1F90E}','\u{1F494}','\u{1F495}','\u{1F496}','\u{1F497}','\u{1F498}','\u{1F49D}','\u{1F49E}','\u{1F49F}','\u{262E}','\u{271D}','\u{262A}','\u{1F549}','\u{262F}','\u{2721}','\u{26A1}','\u{1F4AB}','\u{2728}']
};

function api(method, path, body) {
  var opts = { method: method, headers: { 'Content-Type': 'application/json' } };
  if (token) opts.headers['Authorization'] = 'Bearer ' + token;
  if (body) opts.body = JSON.stringify(body);
  return fetch(API + path, opts).then(function(res) {
    return res.json().then(function(data) {
      if (!res.ok) throw new Error(data.error || 'Request failed');
      return data;
    });
  });
}

function uploadFile(file) {
  var formData = new FormData();
  formData.append('file', file);
  return fetch(API + '/api/media/upload', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + token },
    body: formData
  }).then(function(res) {
    if (!res.ok) throw new Error('Upload failed');
    return res.json();
  });
}

function esc(str) {
  var d = document.createElement('div');
  d.textContent = str || '';
  return d.innerHTML;
}

function escapeAttr(str) {
  return (str || '').replace(/&/g,'&amp;').replace(/'/g,'&#39;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function escapeContent(str) {
  return esc(str);
}

// Auth
document.querySelectorAll('.auth-tab').forEach(function(tab) {
  tab.addEventListener('click', function() {
    document.querySelectorAll('.auth-tab').forEach(function(t) { t.classList.remove('active'); });
    tab.classList.add('active');
    var isRegister = tab.dataset.tab === 'register';
    document.getElementById('register-fields').style.display = isRegister ? 'block' : 'none';
    document.getElementById('auth-submit').textContent = isRegister ? 'Register' : 'Login';
  });
});

document.getElementById('auth-form').addEventListener('submit', function(e) {
  e.preventDefault();
  var isRegister = document.querySelector('.auth-tab.active').dataset.tab === 'register';
  var username = document.getElementById('auth-username').value;
  var password = document.getElementById('auth-password').value;
  var msgEl = document.getElementById('auth-msg');
  msgEl.textContent = '';
  msgEl.style.color = '';
  if (isRegister) {
    var displayName = document.getElementById('reg-displayname').value;
    if (!displayName) { msgEl.textContent = 'Display name required.'; return; }
    api('POST', '/api/auth/register', { username: username, password: password, displayName: displayName }).then(function() {
      msgEl.style.color = 'var(--success)';
      msgEl.textContent = 'Registration successful! Waiting for admin approval.';
    }).catch(function(err) { msgEl.textContent = err.message; });
  } else {
    api('POST', '/api/auth/login', { username: username, password: password }).then(function(data) {
      token = data.token;
      localStorage.setItem('chat_token', token);
      currentUser = data.user;
      showApp();
    }).catch(function(err) { msgEl.textContent = err.message; });
  }
});

function showApp() {
  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('app').style.display = 'flex';
  document.getElementById('my-name').textContent = currentUser.displayName;
  document.getElementById('my-avatar').textContent = currentUser.displayName.charAt(0).toUpperCase();
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
  initSocket();
  loadConversations();
  loadStickers();
}

function showNotification(title, body, conversationId) {
  if ('Notification' in window && Notification.permission === 'granted') {
    var n = new Notification(title, { body: body, tag: conversationId });
    n.onclick = function() { window.focus(); if (conversationId) openConversation(conversationId); };
  }
}

// Conversations
function loadConversations() {
  api('GET', '/api/conversations').then(function(data) {
    conversations = data.conversations || [];
    renderConversations();
  }).catch(function(err) { console.error('Load conversations error:', err); });
}

function renderConversations() {
  var list = document.getElementById('conversations-list');
  var search = document.getElementById('search-input').value.toLowerCase();
  var filtered = conversations.filter(function(c) {
    if (!search) return true;
    return (c.name && c.name.toLowerCase().indexOf(search) !== -1) || (c.members && c.members.some(function(m) { return m.display_name.toLowerCase().indexOf(search) !== -1; }));
  });
  var html = '';
  filtered.forEach(function(c) {
    var other = c.type === 'private' ? (c.members || []).find(function(m) { return m.id !== currentUser.id; }) : null;
    var name = c.type === 'group' ? c.name : (other && other.display_name || 'Unknown');
    var initial = name.charAt(0).toUpperCase();
    var preview = c.lastMessage || 'No messages yet';
    var time = c.lastMessageTime ? formatTime(c.lastMessageTime) : '';
    var isActive = currentConversation && currentConversation.id === c.id;
    html += '<div class="conv-item ' + (isActive ? 'active' : '') + '" data-id="' + c.id + '">' +
      '<div class="conv-avatar">' + initial + '</div>' +
      '<div class="conv-info">' +
        '<div class="conv-name">' + esc(name) + '</div>' +
        '<div class="conv-preview">' + esc(preview) + '</div>' +
      '</div>' +
      '<div class="conv-meta">' +
        '<div class="conv-time">' + time + '</div>' +
      '</div>' +
    '</div>';
  });
  list.innerHTML = html;
  list.querySelectorAll('.conv-item').forEach(function(item) {
    item.addEventListener('click', function() { openConversation(item.dataset.id); });
  });
}

document.getElementById('search-input').addEventListener('input', renderConversations);

function openConversation(convId) {
  var conv = conversations.find(function(c) { return c.id === convId; });
  if (!conv) return;
  currentConversation = conv;
  var other = conv.type === 'private' ? (conv.members || []).find(function(m) { return m.id !== currentUser.id; }) : null;
  var name = conv.type === 'group' ? conv.name : (other && other.display_name || 'Unknown');
  document.getElementById('chat-placeholder').style.display = 'none';
  document.getElementById('chat-active').style.display = 'flex';
  document.getElementById('chat-name').textContent = name;
  document.getElementById('chat-status').textContent = conv.type === 'group' ? (conv.members ? conv.members.length : 0) + ' members' : (other && other.status || 'offline');
  socket.emit('conversation:join', convId);
  loadMessages(convId);
  renderConversations();
  if (window.innerWidth <= 768) document.getElementById('chat-area').classList.add('active-mobile');
}

document.getElementById('back-btn').addEventListener('click', function() {
  document.getElementById('chat-area').classList.remove('active-mobile');
});

// Messages
function loadMessages(convId) {
  api('GET', '/api/messages/' + convId).then(function(data) {
    var container = document.getElementById('messages-container');
    container.innerHTML = '';
    (data.messages || []).forEach(function(msg) { appendMessage(msg); });
    scrollToBottom();
  }).catch(function(err) { console.error('Load messages error:', err); });
}

function appendMessage(msg) {
  var container = document.getElementById('messages-container');
  var isOwn = msg.sender_id === currentUser.id;
  var div = document.createElement('div');
  div.className = 'message' + (isOwn ? ' own' : '');
  div.dataset.id = msg.id;
  div.dataset.type = msg.type || 'text';

  var initial = (msg.display_name || msg.username || '?').charAt(0).toUpperCase();
  var time = formatTime(msg.created_at);
  var displayName = esc(msg.display_name || msg.username || 'Unknown');
  var content = msg.content || '';
  var msgId = msg.id;

  var senderHtml = '';
  if (!isOwn) {
    senderHtml = '<div class="msg-sender">' + displayName + '</div>';
  }

  var replyHtml = '';
  if (msg.replyTo) {
    replyHtml = '<div class="msg-reply-ref"><span class="msg-reply-name">@' + esc(msg.replyTo.username || 'Unknown') + '</span><span class="msg-reply-content">' + esc(msg.replyTo.content || '') + '</span></div>';
  }

  var mediaHtml = '';
  var url = msg.mediaUrl;
  if (msg.type === 'image' && url) {
    mediaHtml = '<div class="msg-media"><img src="' + url + '" alt="Photo" loading="lazy" onclick="openLightbox(\'' + escapeAttr(url) + '\', \'image\')"></div>';
  } else if (msg.type === 'video' && url) {
    mediaHtml = '<div class="msg-media"><video src="' + url + '" controls autoplay muted playsinline loop preload="auto"></video></div>';
  } else if (msg.type === 'audio' && url) {
    mediaHtml = '<div class="msg-media">' + createAudioPlayerHTML(url, content) + '</div>';
  } else if (msg.type === 'voice' && url) {
    mediaHtml = '<div class="msg-media"><div class="voice-message">' + createAudioPlayerHTML(url, 'Voice Message') + '</div></div>';
  } else if (msg.type === 'sticker') {
    mediaHtml = '<div class="msg-media"><div class="sticker-media">' + esc(content) + '</div></div>';
  } else if (msg.type === 'file' && url) {
    var fname = esc(msg.fileName || 'file');
    var fsize = msg.fileSize ? formatFileSize(msg.fileSize) : '';
    mediaHtml = '<div class="msg-media"><div class="file-badge"><span class="file-icon">\uD83D\uDCC4</span><div class="file-info"><div class="file-name">' + fname + '</div><div class="file-size">' + fsize + '</div></div><a href="' + url + '" download class="file-download">Download</a></div></div>';
  }

  var reactions = {};
  (msg.reactions || []).forEach(function(r) {
    if (!r || !r.emoji) return;
    if (!reactions[r.emoji]) reactions[r.emoji] = { emoji: r.emoji, count: 0, users: [] };
    reactions[r.emoji].count++;
    reactions[r.emoji].users.push(r.username);
  });
  var reactionsHtml = '';
  for (var key in reactions) {
    var r = reactions[key];
    reactionsHtml += '<span class="reaction-chip" title="' + esc(r.users.join(', ')) + '">' + r.emoji + ' <span class="reaction-count">' + r.count + '</span></span>';
  }

  var textClass = msg.is_deleted ? ' msg-deleted' : '';
  var showText = msg.type !== 'sticker' && content && content.indexOf('\uD83C\uDFA4') !== 0 && content.indexOf('\uD83C\uDF9F') !== 0 && content.indexOf('\uD83C\uDFB5') !== 0 && content.indexOf('\uD83D\uDCCE') !== 0;

  var actionsHtml = '';
  if (!msg.is_deleted) {
    actionsHtml = '<div class="msg-actions">' +
      '<button class="msg-action-btn js-react" data-msgid="' + msgId + '" title="React">\uD83D\uDC4D</button>' +
      '<button class="msg-action-btn js-reply" data-msgid="' + msgId + '" data-name="' + escapeAttr(msg.display_name || msg.username) + '" data-content="' + escapeAttr(content) + '" title="Reply">\u21A9</button>' +
      (isOwn ? '<button class="msg-action-btn js-edit" data-msgid="' + msgId + '" data-content="' + escapeAttr(content) + '" title="Edit">\u270F</button>' +
      '<button class="msg-action-btn js-delete" data-msgid="' + msgId + '" title="Delete">\uD83D\uDDD1</button>' : '') +
    '</div>';
  }

  var textContent = '';
  if (showText && content) {
    textContent = '<div class="msg-text' + textClass + '">' + esc(content) + '</div>';
  } else if (!mediaHtml && content) {
    textContent = '<div class="msg-text' + textClass + '">' + esc(content) + '</div>';
  }

  var innerHtml = '<div class="msg-avatar">' + initial + '</div><div class="msg-content">' +
    senderHtml + replyHtml + mediaHtml + textContent +
    (reactionsHtml ? '<div class="msg-reactions">' + reactionsHtml + '</div>' : '') +
    '<div class="msg-meta">' +
      (msg.is_edited ? '<span class="msg-edited">(edited)</span>' : '') +
      '<span class="msg-time">' + time + '</span>' +
    '</div>' + actionsHtml + '</div>';

  div.innerHTML = innerHtml;
  container.appendChild(div);

  div.querySelectorAll('.js-react').forEach(function(btn) {
    btn.addEventListener('click', function(e) { showReactionPicker(e, btn.dataset.msgid); });
  });
  div.querySelectorAll('.js-reply').forEach(function(btn) {
    btn.addEventListener('click', function() { startReply(btn.dataset.msgid, btn.dataset.name, btn.dataset.content); });
  });
  div.querySelectorAll('.js-edit').forEach(function(btn) {
    btn.addEventListener('click', function() { startEdit(btn.dataset.msgid, btn.dataset.content); });
  });
  div.querySelectorAll('.js-delete').forEach(function(btn) {
    btn.addEventListener('click', function() { deleteMessage(btn.dataset.msgid); });
  });

  if (msg.id) socket.emit('message:read', { messageId: msg.id, conversationId: currentConversation && currentConversation.id });
}

function createAudioPlayerHTML(url, label) {
  var id = 'audio-' + Math.random().toString(36).substr(2, 9);
  return '<div class="audio-player">' +
    '<button class="audio-play-btn" id="' + id + '-btn" data-url="' + esc(url) + '" data-id="' + id + '">\u25B6</button>' +
    '<div class="audio-progress-bar" id="' + id + '-bar" data-url="' + esc(url) + '" data-id="' + id + '">' +
      '<div class="audio-progress-fill" id="' + id + '-fill"></div>' +
    '</div>' +
    '<span class="audio-time" id="' + id + '-time">0:00</span>' +
  '</div>' +
  '<audio id="' + id + '" src="' + url + '" preload="auto"></audio>';
}

document.addEventListener('click', function(e) {
  var btn = e.target.closest('.audio-play-btn');
  if (btn) {
    var url = btn.dataset.url;
    var id = btn.dataset.id;
    var audio = document.getElementById(id);
    if (!audio) return;
    if (audio.paused) {
      document.querySelectorAll('audio').forEach(function(a) { a.pause(); });
      document.querySelectorAll('.audio-play-btn').forEach(function(b) { b.textContent = '\u25B6'; });
      audio.play();
      btn.textContent = '\u23F8';
    } else {
      audio.pause();
      btn.textContent = '\u25B6';
    }
  }
  var bar = e.target.closest('.audio-progress-bar');
  if (bar) {
    var aId = bar.dataset.id;
    var aUrl = bar.dataset.url;
    var audio2 = document.getElementById(aId);
    if (!audio2) return;
    var rect = bar.getBoundingClientRect();
    var pct = (e.clientX - rect.left) / rect.width;
    audio2.currentTime = pct * audio2.duration;
  }
});

document.addEventListener('timeupdate', function(e) {
  if (e.target.tagName === 'AUDIO' && e.target.id) {
    var fill = document.getElementById(e.target.id + '-fill');
    var time = document.getElementById(e.target.id + '-time');
    if (fill) fill.style.width = ((e.target.currentTime / e.target.duration) * 100 || 0) + '%';
    if (time) time.textContent = formatAudioTime(e.target.currentTime);
  }
}, true);

document.addEventListener('ended', function(e) {
  if (e.target.tagName === 'AUDIO' && e.target.id) {
    var btn = document.getElementById(e.target.id + '-btn');
    var fill = document.getElementById(e.target.id + '-fill');
    if (btn) btn.textContent = '\u25B6';
    if (fill) fill.style.width = '0%';
  }
}, true);

function formatAudioTime(s) {
  var m = Math.floor(s / 60);
  var sec = Math.floor(s % 60);
  return m + ':' + (sec < 10 ? '0' : '') + sec;
}

function scrollToBottom() {
  var c = document.getElementById('messages-container');
  c.scrollTop = c.scrollHeight;
}

// Send Message
document.getElementById('message-input').addEventListener('keydown', function(e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  if (socket && currentConversation) {
    socket.emit('typing:start', currentConversation.id);
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(function() { socket.emit('typing:stop', currentConversation.id); }, 2000);
  }
});
document.getElementById('send-btn').addEventListener('click', sendMessage);

function sendMessage() {
  var input = document.getElementById('message-input');
  var content = input.value.trim();
  if (!content || !currentConversation) return;
  if (editingMessage) {
    socket.emit('message:edit', { messageId: editingMessage, content: content, conversationId: currentConversation.id });
    editingMessage = null;
    document.getElementById('edit-preview').style.display = 'none';
  } else {
    socket.emit('message:send', {
      conversationId: currentConversation.id,
      content: content, type: 'text', replyTo: replyToMessage
    });
  }
  input.value = '';
  input.style.height = 'auto';
  replyToMessage = null;
  document.getElementById('reply-preview').style.display = 'none';
}

function startReply(msgId, name, content) {
  replyToMessage = msgId;
  editingMessage = null;
  document.getElementById('edit-preview').style.display = 'none';
  document.getElementById('reply-to-name').textContent = '@' + name;
  document.getElementById('reply-to-text').textContent = (content || '').substring(0, 80);
  document.getElementById('reply-preview').style.display = 'flex';
  document.getElementById('message-input').focus();
}
document.getElementById('reply-close').addEventListener('click', function() {
  replyToMessage = null;
  document.getElementById('reply-preview').style.display = 'none';
});

function startEdit(msgId, content) {
  editingMessage = msgId;
  replyToMessage = null;
  document.getElementById('reply-preview').style.display = 'none';
  document.getElementById('edit-preview').style.display = 'flex';
  document.getElementById('message-input').value = content.replace(/\\n/g, '\n');
  document.getElementById('message-input').focus();
}
document.getElementById('edit-close').addEventListener('click', function() {
  editingMessage = null;
  document.getElementById('edit-preview').style.display = 'none';
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
  var picker = document.getElementById('reaction-picker');
  var rect = event.target.getBoundingClientRect();
  picker.style.left = Math.min(rect.left, window.innerWidth - 300) + 'px';
  picker.style.top = (rect.top - 50) + 'px';
  picker.style.display = 'flex';
}

document.querySelectorAll('.reaction-btn').forEach(function(btn) {
  btn.addEventListener('click', function(e) {
    e.stopPropagation();
    if (activeReactionMsgId && currentConversation) {
      socket.emit('message:react', { messageId: activeReactionMsgId, emoji: btn.dataset.emoji, conversationId: currentConversation.id });
    }
    document.getElementById('reaction-picker').style.display = 'none';
    activeReactionMsgId = null;
  });
});

document.addEventListener('click', function(e) {
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
document.getElementById('emoji-trigger').addEventListener('click', function(e) {
  e.stopPropagation();
  var p = document.getElementById('emoji-picker');
  p.style.display = p.style.display === 'none' ? 'block' : 'none';
  if (p.style.display === 'block') renderEmojiGrid('smileys');
});

function renderEmojiGrid(category) {
  var grid = document.getElementById('emoji-grid');
  var emojis = EMOJIS[category] || EMOJIS.smileys;
  grid.innerHTML = emojis.map(function(e) {
    return '<div class="emoji-item" data-emoji="' + e + '">' + e + '</div>';
  }).join('');
  grid.querySelectorAll('.emoji-item').forEach(function(item) {
    item.addEventListener('click', function() {
      document.getElementById('message-input').value += item.dataset.emoji;
      document.getElementById('message-input').focus();
    });
  });
}

document.querySelectorAll('.emoji-cat').forEach(function(cat) {
  cat.addEventListener('click', function() {
    document.querySelectorAll('.emoji-cat').forEach(function(c) { c.classList.remove('active'); });
    cat.classList.add('active');
    renderEmojiGrid(cat.dataset.cat);
  });
});

document.getElementById('emoji-search').addEventListener('input', function(e) {
  var q = e.target.value.toLowerCase();
  if (!q) { renderEmojiGrid('smileys'); return; }
  var all = Object.values(EMOJIS).reduce(function(a, b) { return a.concat(b); }, []);
  document.getElementById('emoji-grid').innerHTML = all.slice(0, 50).map(function(em) {
    return '<div class="emoji-item" data-emoji="' + em + '">' + em + '</div>';
  }).join('');
  document.querySelectorAll('.emoji-item').forEach(function(item) {
    item.addEventListener('click', function() {
      document.getElementById('message-input').value += item.dataset.emoji;
    });
  });
});

// Stickers
function loadStickers() {
  api('GET', '/api/media/stickers').then(function(data) {
    stickerData = data.categories;
    renderStickerTabs();
  }).catch(function(err) { console.error('Load stickers error:', err); });
}

function renderStickerTabs() {
  if (!stickerData) return;
  var tabs = document.getElementById('sticker-tabs');
  tabs.innerHTML = stickerData.map(function(c, i) {
    return '<button class="sticker-tab ' + (i === 0 ? 'active' : '') + '" data-idx="' + i + '">' + c.name + '</button>';
  }).join('');
  tabs.querySelectorAll('.sticker-tab').forEach(function(t) {
    t.addEventListener('click', function() {
      tabs.querySelectorAll('.sticker-tab').forEach(function(x) { x.classList.remove('active'); });
      t.classList.add('active');
      renderStickerGrid(parseInt(t.dataset.idx));
    });
  });
  renderStickerGrid(0);
}

function renderStickerGrid(idx) {
  if (!stickerData || !stickerData[idx]) return;
  var grid = document.getElementById('sticker-grid');
  grid.innerHTML = stickerData[idx].stickers.map(function(s) {
    return '<div class="sticker-item" data-sticker="' + s + '">' + s + '</div>';
  }).join('');
  grid.querySelectorAll('.sticker-item').forEach(function(item) {
    item.addEventListener('click', function() { sendSticker(item.dataset.sticker); });
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

document.getElementById('sticker-btn').addEventListener('click', function(e) {
  e.stopPropagation();
  document.getElementById('sticker-panel').classList.toggle('show');
  document.getElementById('emoji-picker').style.display = 'none';
});

// File Attachments
document.getElementById('attach-btn').addEventListener('click', function(e) {
  e.stopPropagation();
  document.getElementById('attach-menu').classList.toggle('show');
});

document.querySelectorAll('.attach-menu-item').forEach(function(item) {
  item.addEventListener('click', function() {
    var type = item.dataset.type;
    document.getElementById('attach-menu').classList.remove('show');
    if (type === 'image') document.getElementById('file-input-image').click();
    else if (type === 'video') document.getElementById('file-input-video').click();
    else if (type === 'audio') document.getElementById('file-input-audio').click();
    else document.getElementById('file-input-file').click();
  });
});

['image', 'video', 'audio', 'file'].forEach(function(type) {
  document.getElementById('file-input-' + type).addEventListener('change', function(e) {
    var file = e.target.files[0];
    if (!file || !currentConversation) return;
    uploadFile(file).then(function(uploaded) {
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
    }).catch(function(err) { alert('Upload failed: ' + err.message); });
    e.target.value = '';
  });
});

// Voice Recording
document.getElementById('voice-btn').addEventListener('click', startVoiceRecording);
document.getElementById('voice-cancel').addEventListener('click', cancelVoiceRecording);
document.getElementById('voice-send').addEventListener('click', sendVoiceMessage);

function startVoiceRecording() {
  navigator.mediaDevices.getUserMedia({ audio: true }).then(function(stream) {
    mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
    audioChunks = [];
    mediaRecorder.ondataavailable = function(e) { if (e.data.size > 0) audioChunks.push(e.data); };
    mediaRecorder.onstop = function() { stream.getTracks().forEach(function(t) { t.stop(); }); };
    mediaRecorder.start();

    document.getElementById('text-mode').style.display = 'none';
    document.getElementById('voice-mode').style.display = 'block';
    document.getElementById('voice-btn').style.display = 'none';

    voiceSeconds = 0;
    var wave = document.getElementById('voice-wave');
    wave.innerHTML = '';
    for (var i = 0; i < 30; i++) {
      var bar = document.createElement('div');
      bar.className = 'voice-wave-bar';
      bar.style.animationDelay = (Math.random() * 0.5) + 's';
      wave.appendChild(bar);
    }

    voiceTimer = setInterval(function() {
      voiceSeconds++;
      document.getElementById('voice-timer').textContent = Math.floor(voiceSeconds / 60) + ':' + (voiceSeconds % 60 < 10 ? '0' : '') + (voiceSeconds % 60);
    }, 1000);
  }).catch(function() {
    alert('Microphone access denied.');
  });
}

function cancelVoiceRecording() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
  clearInterval(voiceTimer);
  document.getElementById('text-mode').style.display = 'flex';
  document.getElementById('voice-mode').style.display = 'none';
  document.getElementById('voice-btn').style.display = 'flex';
}

function sendVoiceMessage() {
  if (!mediaRecorder || !currentConversation) return;
  mediaRecorder.stop();
  clearInterval(voiceTimer);

  var blob = new Blob(audioChunks, { type: 'audio/webm' });
  var formData = new FormData();
  formData.append('voice', blob, 'voice.webm');

  fetch(API + '/api/media/upload-voice', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + token },
    body: formData
  }).then(function(res) { return res.json(); }).then(function(data) {
    socket.emit('message:send', {
      conversationId: currentConversation.id,
      content: '\uD83C\uDFA4 Voice Message',
      type: 'voice',
      mediaType: 'voice',
      mediaUrl: data.url,
      mimeType: data.mimeType,
      duration: voiceSeconds
    });
  }).catch(function() { alert('Voice upload failed.'); });

  document.getElementById('text-mode').style.display = 'flex';
  document.getElementById('voice-mode').style.display = 'none';
  document.getElementById('voice-btn').style.display = 'flex';
}

// Lightbox
window.openLightbox = function(url, type) {
  var lb = document.getElementById('lightbox');
  if (type === 'image') lb.innerHTML = '<img src="' + url + '" alt="Full size">';
  else if (type === 'video') lb.innerHTML = '<video src="' + url + '" controls autoplay style="max-width:90vw;max-height:90vh;"></video>';
  lb.style.display = 'flex';
  lb.onclick = function() { lb.style.display = 'none'; lb.innerHTML = ''; };
};

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

// New Chat / Group
document.getElementById('new-chat-btn').addEventListener('click', showNewChatModal);
document.getElementById('new-group-btn').addEventListener('click', showNewGroupModal);

function showNewChatModal() {
  document.getElementById('modal-title').textContent = 'New Conversation';
  document.getElementById('modal-body').innerHTML = '<input type="text" class="modal-input" id="user-search-input" placeholder="Search user..."><div class="modal-user-list" id="user-search-results"></div>';
  document.getElementById('modal-footer').innerHTML = '';
  document.getElementById('modal-overlay').style.display = 'flex';
  document.getElementById('user-search-input').addEventListener('input', function(e) {
    if (e.target.value.length >= 1) socket.emit('user:search', e.target.value);
  });
}

function showNewGroupModal() {
  document.getElementById('modal-title').textContent = 'New Group';
  document.getElementById('modal-body').innerHTML = '<input type="text" class="modal-input" id="group-name-input" placeholder="Group name"><input type="text" class="modal-input" id="group-user-search" placeholder="Search users..."><div class="modal-user-list" id="group-user-results"></div>';
  document.getElementById('modal-footer').innerHTML = '<button class="btn-cancel" onclick="closeModal()">Cancel</button><button class="btn-confirm" onclick="createGroup()">Create Group</button>';
  document.getElementById('modal-overlay').style.display = 'flex';
  document.getElementById('group-user-search').addEventListener('input', function(e) { socket.emit('user:search', e.target.value); });
}

window.createGroup = function() {
  var name = document.getElementById('group-name-input').value.trim();
  if (!name) return;
  api('POST', '/api/conversations/group', { name: name, memberIds: [] }).then(function(data) {
    closeModal();
    loadConversations();
    openConversation(data.conversationId);
  }).catch(function(err) { alert(err.message); });
};

function closeModal() { document.getElementById('modal-overlay').style.display = 'none'; }
document.getElementById('close-modal').addEventListener('click', closeModal);
document.getElementById('modal-overlay').addEventListener('click', function(e) {
  if (e.target === document.getElementById('modal-overlay')) closeModal();
});

// Members
document.getElementById('members-btn').addEventListener('click', function() {
  if (!currentConversation) return;
  var panel = document.getElementById('members-panel');
  panel.style.display = panel.style.display === 'none' ? 'flex' : 'none';
  if (panel.style.display === 'flex') {
    api('GET', '/api/conversations/' + currentConversation.id + '/members').then(function(data) {
      document.getElementById('members-list').innerHTML = (data.members || []).map(function(m) {
        return '<div class="member-item"><div class="member-avatar">' + (m.display_name || '?').charAt(0).toUpperCase() + '</div><div class="member-info"><div class="member-name">' + esc(m.display_name) + '</div><div class="member-role">' + m.role + ' - ' + m.status + '</div></div></div>';
      }).join('');
    }).catch(function(err) { console.error(err); });
  }
});
document.getElementById('close-members').addEventListener('click', function() {
  document.getElementById('members-panel').style.display = 'none';
});

// Socket
function initSocket() {
  socket = io({ auth: { token: token } });
  socket.on('connect', function() { console.log('[SOCKET] Connected'); });
  socket.on('disconnect', function() { console.log('[SOCKET] Disconnected'); });

  socket.on('message:new', function(msg) {
    if (currentConversation && msg.conversation_id === currentConversation.id) {
      appendMessage(msg);
      scrollToBottom();
    }
    loadConversations();
    if (msg.sender_id !== currentUser.id) {
      showNotification(msg.display_name || msg.username, msg.content || 'Media message', msg.conversation_id);
      playNotifSound();
    }
  });

  socket.on('message:edited', function(data) {
    if (currentConversation && data.conversationId === currentConversation.id) {
      var el = document.querySelector('.message[data-id="' + data.messageId + '"] .msg-text');
      if (el) {
        el.textContent = data.content;
        var meta = el.closest('.msg-content');
        if (meta) {
          var metaInner = meta.querySelector('.msg-meta');
          if (metaInner && !metaInner.querySelector('.msg-edited')) {
            metaInner.insertAdjacentHTML('afterbegin', '<span class="msg-edited">(edited)</span>');
          }
        }
      }
    }
  });

  socket.on('message:deleted', function(data) {
    if (currentConversation && data.conversationId === currentConversation.id) {
      var el = document.querySelector('.message[data-id="' + data.messageId + '"]');
      if (el) {
        var textEl = el.querySelector('.msg-text');
        if (textEl) { textEl.textContent = '[Pesan Dihapus]'; textEl.className = 'msg-text msg-deleted'; }
        var mediaEl = el.querySelector('.msg-media');
        if (mediaEl) mediaEl.remove();
        var actions = el.querySelector('.msg-actions');
        if (actions) actions.remove();
      }
    }
  });

  socket.on('message:reaction', function(data) {
    if (currentConversation && data.conversationId === currentConversation.id) loadMessages(currentConversation.id);
  });

  socket.on('typing:start', function(data) {
    if (currentConversation && data.conversationId === currentConversation.id) {
      document.getElementById('typing-indicator').style.display = 'flex';
      document.getElementById('typing-text').textContent = data.username + ' is typing';
    }
  });
  socket.on('typing:stop', function(data) {
    if (currentConversation && data.conversationId === currentConversation.id)
      document.getElementById('typing-indicator').style.display = 'none';
  });

  socket.on('user:status', function(data) {
    if (currentConversation) {
      var member = (currentConversation.members || []).find(function(m) { return m.id === data.userId; });
      if (member) { member.status = data.status; document.getElementById('chat-status').textContent = data.status; }
    }
  });

  socket.on('user:results', function(users) {
    var container = document.getElementById('user-search-results') || document.getElementById('group-user-results');
    if (!container) return;
    container.innerHTML = (users || []).map(function(u) {
      return '<div class="modal-user-item" data-id="' + u.id + '"><div class="member-avatar">' + (u.display_name || '?').charAt(0).toUpperCase() + '</div><div class="member-info"><div class="member-name">' + esc(u.display_name) + '</div><div class="member-role">' + u.username + ' - ' + u.status + '</div></div></div>';
    }).join('');
    container.querySelectorAll('.modal-user-item').forEach(function(item) {
      item.addEventListener('click', function() {
        api('POST', '/api/conversations/private', { userId: item.dataset.id }).then(function(data) {
          closeModal();
          loadConversations();
          openConversation(data.conversationId);
        }).catch(function(err) { alert(err.message); });
      });
    });
  });

  socket.on('notification', function(data) {
    showNotification(data.from, data.preview, data.conversationId);
  });
}

function playNotifSound() {
  try {
    var ctx = new (window.AudioContext || window.webkitAudioContext)();
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
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
  var d = new Date(dateStr);
  var now = new Date();
  var diffDays = Math.floor((now - d) / 86400000);
  if (diffDays === 0) return d.toLocaleTimeString('id', { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return d.toLocaleDateString('id', { weekday: 'short' });
  return d.toLocaleDateString('id', { day: 'numeric', month: 'short' });
}

// Loading dismiss
setTimeout(function() {
  var ls = document.getElementById('loading-screen');
  if (ls) {
    ls.classList.add('fade-out');
    setTimeout(function() { ls.style.display = 'none'; }, 500);
  }
  var auth = document.getElementById('auth-screen');
  if (auth) auth.style.display = 'flex';
}, 10000);

// Init
if (token) {
  var ls = document.getElementById('loading-screen');
  if (ls) ls.style.display = 'none';
  api('GET', '/api/auth/me').then(function(data) {
    currentUser = data.user;
    showApp();
  }).catch(function() {
    localStorage.removeItem('chat_token');
    var auth = document.getElementById('auth-screen');
    if (auth) auth.style.display = 'flex';
  });
}
