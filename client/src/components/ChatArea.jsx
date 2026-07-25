import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useChatStore } from '../store/chatStore'
import { useAuthStore } from '../store/authStore'
import { socketEmit } from '../services/socket'
import api from '../services/api'
import MessageBubble from './MessageBubble'
import EmojiPicker from './EmojiPicker'
import GifPicker from './GifPicker'

function DateSeparator({ date }) {
  return (
    <div className="flex items-center gap-3 py-3 select-none">
      <div className="flex-1 h-px bg-white/10" />
      <span className="text-[11px] text-gray-500 font-medium px-2 py-1 rounded-full glass">{date}</span>
      <div className="flex-1 h-px bg-white/10" />
    </div>
  )
}

function formatDateSeparator(dateStr) {
  const d = new Date(dateStr)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const msgDate = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const diff = today - msgDate

  if (diff === 0) return 'Today'
  if (diff === 86400000) return 'Yesterday'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined })
}

export default function ChatArea() {
  const activeConversation = useChatStore(s => s.activeConversation)
  const messages = useChatStore(s => s.messages)
  const typingUsers = useChatStore(s => s.typingUsers)
  const [input, setInput] = useState('')
  const [replyTo, setReplyTo] = useState(null)
  const [editingMsg, setEditingMsg] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [showStickers, setShowStickers] = useState(false)
  const [showEmoji, setShowEmoji] = useState(false)
  const [showGif, setShowGif] = useState(false)
  const [recording, setRecording] = useState(false)
  const [stickerCategories, setStickerCategories] = useState([])
  const [activeStickerTab, setActiveStickerTab] = useState(0)
  const [recordingTime, setRecordingTime] = useState(0)
  const [isAtBottom, setIsAtBottom] = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)

  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchMatches, setSearchMatches] = useState([])
  const [currentMatchIdx, setCurrentMatchIdx] = useState(0)

  const messagesContainerRef = useRef(null)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const searchInputRef = useRef(null)
  const fileInputRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const recordingTimerRef = useRef(null)
  const lastSeenMsgCountRef = useRef(0)

  const sendMessage = useChatStore(s => s.sendMessage)
  const onlineUsers = useChatStore(s => s.onlineUsers)
  const user = useAuthStore(s => s.user)
  const typingTimeout = useRef(null)

  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'instant' })
  }, [])

  useEffect(() => {
    if (isAtBottom) {
      setUnreadCount(0)
      scrollToBottom(false)
    } else if (messages.length > lastSeenMsgCountRef.current) {
      setUnreadCount(prev => prev + (messages.length - lastSeenMsgCountRef.current))
    }
    lastSeenMsgCountRef.current = messages.length
  }, [messages, isAtBottom, scrollToBottom])

  useEffect(() => {
    if (activeConversation) {
      socketEmit('conversation:join', activeConversation.id)
      setSearchQuery('')
      setSearchMatches([])
      setShowSearch(false)
      setUnreadCount(0)
      lastSeenMsgCountRef.current = 0
      setTimeout(() => scrollToBottom(false), 50)
    }
  }, [activeConversation, scrollToBottom])

  useEffect(() => {
    api.get('/media/stickers').then(r => setStickerCategories(r.data.categories || [])).catch(() => {})
  }, [])

  useEffect(() => {
    if (showSearch && searchInputRef.current) searchInputRef.current.focus()
  }, [showSearch])

  const handleScroll = useCallback(() => {
    const el = messagesContainerRef.current
    if (!el) return
    const threshold = 80
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < threshold
    setIsAtBottom(atBottom)
    if (atBottom) setUnreadCount(0)
  }, [])

  useEffect(() => {
    const el = messagesContainerRef.current
    if (!el) return
    el.addEventListener('scroll', handleScroll, { passive: true })
    return () => el.removeEventListener('scroll', handleScroll)
  }, [handleScroll])

  const messagesWithDates = useMemo(() => {
    const result = []
    let lastDate = ''
    for (const msg of messages) {
      const dateStr = formatDateSeparator(msg.created_at)
      if (dateStr !== lastDate) {
        result.push({ _type: 'date', date: dateStr, _key: `date-${msg.id}` })
        lastDate = dateStr
      }
      result.push({ _type: 'message', ...msg })
    }
    return result
  }, [messages])

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchMatches([])
      setCurrentMatchIdx(0)
      return
    }
    const q = searchQuery.toLowerCase()
    const matches = messages
      .map((msg, idx) => ({ idx, msg }))
      .filter(({ msg }) => msg.content && msg.content.toLowerCase().includes(q))
    setSearchMatches(matches)
    setCurrentMatchIdx(0)
    if (matches.length > 0) {
      scrollToMatch(matches[0].msg.id)
    }
  }, [searchQuery, messages])

  const scrollToMatch = useCallback((msgId) => {
    const el = messagesContainerRef.current
    if (!el) return
    const msgEl = el.querySelector(`[data-msg-id="${msgId}"]`)
    if (msgEl) {
      msgEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
      msgEl.classList.add('ring-2', 'ring-nyx-400', 'ring-offset-2', 'ring-offset-transparent')
      setTimeout(() => {
        msgEl.classList.remove('ring-2', 'ring-nyx-400', 'ring-offset-2', 'ring-offset-transparent')
      }, 2000)
    }
  }, [])

  const navigateMatch = useCallback((dir) => {
    if (searchMatches.length === 0) return
    let next = currentMatchIdx + dir
    if (next < 0) next = searchMatches.length - 1
    if (next >= searchMatches.length) next = 0
    setCurrentMatchIdx(next)
    scrollToMatch(searchMatches[next].msg.id)
  }, [searchMatches, currentMatchIdx, scrollToMatch])

  const handleTyping = () => {
    if (!activeConversation) return
    socketEmit('typing:start', activeConversation.id)
    clearTimeout(typingTimeout.current)
    typingTimeout.current = setTimeout(() => {
      socketEmit('typing:stop', activeConversation.id)
    }, 2000)
  }

  const uploadFile = async (file) => {
    const formData = new FormData()
    formData.append('file', file)
    setUploading(true)
    try {
      const { data } = await api.post('/media/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      return data
    } catch (err) {
      return null
    } finally {
      setUploading(false)
    }
  }

  const sendMediaMessage = useCallback((mediaData, type, content) => {
    if (!activeConversation) return
    socketEmit('message:send', {
      conversationId: activeConversation.id,
      content: content || mediaData.originalName || '📎 File',
      type,
      mediaUrl: mediaData.url,
      mediaType: type,
      mimeType: mediaData.mimeType,
      fileName: mediaData.originalName,
      fileSize: mediaData.size,
    })
  }, [activeConversation])

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    const data = await uploadFile(file)
    if (data) {
      let type = 'file'
      if (data.type === 'image') type = 'image'
      else if (data.type === 'video') type = 'video'
      else if (data.type === 'audio') type = 'audio'
      sendMediaMessage(data, type)
    }
  }

  const handlePaste = async (e) => {
    if (!activeConversation) return
    const items = e.clipboardData?.items
    if (!items) return
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault()
        const blob = item.getAsFile()
        if (!blob) return
        const ext = blob.type.split('/')[1] || 'png'
        const file = new File([blob], `paste-${Date.now()}.${ext}`, { type: blob.type })
        setUploading(true)
        try {
          const formData = new FormData()
          formData.append('file', file)
          const { data } = await api.post('/media/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
          if (data && activeConversation) sendMediaMessage(data, 'image')
        } catch (err) {
          console.error('[PASTE] Upload failed:', err)
        }
        setUploading(false)
        return
      }
    }
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' })
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []
      setRecordingTime(0)

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        const file = new File([blob], `voice-${Date.now()}.webm`, { type: 'audio/webm' })
        const formData = new FormData()
        formData.append('voice', file)
        setUploading(true)
        try {
          const { data } = await api.post('/media/upload-voice', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
          if (data) sendMediaMessage(data, 'voice', '🎤 Voice message')
        } catch {}
        setUploading(false)
      }

      mediaRecorder.start()
      setRecording(true)
      recordingTimerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000)
    } catch (err) {
      console.error('Microphone access denied')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop()
      setRecording(false)
      clearInterval(recordingTimerRef.current)
    }
  }

  const cancelRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop())
      mediaRecorderRef.current = null
      setRecording(false)
      clearInterval(recordingTimerRef.current)
    }
  }

  const sendSticker = (sticker) => {
    if (!activeConversation) return
    socketEmit('message:send', {
      conversationId: activeConversation.id,
      content: sticker,
      type: 'sticker'
    })
    setShowStickers(false)
  }

  const sendEmoji = (emoji) => {
    setInput(prev => prev + emoji)
    setShowEmoji(false)
    inputRef.current?.focus()
  }

  const sendGif = (gifUrl, thumbnail) => {
    if (!activeConversation) return
    socketEmit('message:send', {
      conversationId: activeConversation.id,
      content: 'GIF',
      type: 'image',
      mediaUrl: gifUrl,
      mediaType: 'image',
      mimeType: 'image/gif',
    })
    setShowGif(false)
  }

  const handleSend = async () => {
    if (!input.trim() || !activeConversation) return
    if (editingMsg) {
      socketEmit('message:edit', { messageId: editingMsg.id, content: input, conversationId: activeConversation.id })
      setEditingMsg(null)
    } else {
      sendMessage(activeConversation.id, input, replyTo, user, socketEmit)
      setReplyTo(null)
    }
    setInput('')
    inputRef.current?.focus()
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
    if (e.key === 'Escape') {
      if (showSearch) { setShowSearch(false); setSearchQuery('') }
      setReplyTo(null)
      setEditingMsg(null)
      setShowStickers(false)
      setShowEmoji(false)
      setShowGif(false)
    }
  }

  const getOtherMember = () => {
    if (!activeConversation?.members) return null
    return activeConversation.members.find(m => m.id !== user?.id) || activeConversation.members[0]
  }

  const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  const typingInConv = typingUsers[activeConversation?.id] || new Set()
  const typingNames = [...typingInConv].filter(id => id !== user?.id)

  if (!activeConversation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="space-y-4">
          <div className="w-20 h-20 rounded-full bg-nyx-600/20 flex items-center justify-center mx-auto animate-float">
            <svg className="w-10 h-10 text-nyx-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h2 className="font-display text-xl font-semibold gradient-text">Select a Conversation</h2>
          <p className="text-gray-400 text-sm max-w-xs">Choose a chat from the sidebar or scan a QR code to add a friend</p>
        </motion.div>
      </div>
    )
  }

  const otherMember = getOtherMember()
  const displayName = activeConversation.type === 'group' ? activeConversation.name : (otherMember?.display_name || otherMember?.username || 'Chat')
  const searchMatchIds = new Set(searchMatches.map(m => m.msg.id))
  const otherUserId = otherMember?.id
  const isOnline = otherUserId ? onlineUsers.has(otherUserId) : false
  const otherLastSeen = useChatStore.getState().lastSeenMap?.[otherUserId]

  const formatHeaderStatus = () => {
    if (typingNames.length > 0) return null
    if (isOnline) return <p className="text-xs text-neon-cyan">online</p>
    if (otherLastSeen) {
      try {
        const d = new Date(otherLastSeen)
        const now = new Date()
        const diffMin = (now - d) / 60000
        if (diffMin < 1) return <p className="text-xs text-gray-500">last seen just now</p>
        if (diffMin < 60) return <p className="text-xs text-gray-500">last seen {Math.floor(diffMin)}m ago</p>
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        const seenDate = new Date(d.getFullYear(), d.getMonth(), d.getDate())
        const dayDiff = (today - seenDate) / 86400000
        if (dayDiff === 0) return <p className="text-xs text-gray-500">last seen today {d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}</p>
        if (dayDiff === 1) return <p className="text-xs text-gray-500">last seen yesterday {d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}</p>
        return <p className="text-xs text-gray-500">last seen {d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} {d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}</p>
      } catch {}
    }
    return null
  }

  return (
    <div className="flex-1 flex flex-col h-full relative" onPaste={handlePaste}>
      <div className="px-4 sm:px-6 py-3 glass border-b border-white/10 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-nyx-500 to-neon-purple flex items-center justify-center text-sm font-bold shrink-0">
          {displayName.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-sm truncate">{displayName}</p>
          {typingNames.length > 0 && (
            <p className="text-xs text-neon-cyan animate-pulse">typing...</p>
          )}
          {formatHeaderStatus()}
        </div>
        <button onClick={() => { setShowSearch(!showSearch); if (showSearch) setSearchQuery('') }}
          className={`w-9 h-9 rounded-full flex items-center justify-center transition-all shrink-0 ${showSearch ? 'bg-nyx-600 text-white' : 'glass text-gray-400 hover:text-nyx-400 hover:bg-white/10'}`}
          title="Search messages">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>
      </div>

      <AnimatePresence>
        {showSearch && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="border-b border-white/10 glass overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5">
              <svg className="w-4 h-4 text-gray-500 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') { e.preventDefault(); navigateMatch(e.shiftKey ? -1 : 1) }
                  if (e.key === 'Escape') { setShowSearch(false); setSearchQuery('') }
                }}
                placeholder="Search in conversation..."
                className="flex-1 bg-transparent text-sm text-white placeholder-gray-500 outline-none"
              />
              {searchMatches.length > 0 && (
                <span className="text-[11px] text-gray-400 whitespace-nowrap">
                  {currentMatchIdx + 1} / {searchMatches.length}
                </span>
              )}
              {searchMatches.length > 0 && (
                <div className="flex gap-0.5">
                  <button onClick={() => navigateMatch(-1)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" /></svg>
                  </button>
                  <button onClick={() => navigateMatch(1)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                  </button>
                </div>
              )}
              {searchQuery && (
                <span className="text-[11px] text-gray-500 whitespace-nowrap">
                  {searchMatches.length === 0 ? 'No results' : ''}
                </span>
              )}
              <button onClick={() => { setShowSearch(false); setSearchQuery('') }}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/10 transition-all">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-1 relative">
        {messagesWithDates.map((item) => {
          if (item._type === 'date') {
            return <DateSeparator key={item._key} date={item.date} />
          }
          return (
            <div key={item.id} data-msg-id={item.id}>
              <MessageBubble
                message={item}
                isOwn={item.sender_id === user?.id}
                onReply={() => setReplyTo(item)}
                onEdit={() => { setEditingMsg(item); setInput(item.content); inputRef.current?.focus() }}
                searchHighlight={searchQuery.trim() ? searchQuery : null}
                isSearchMatch={searchMatchIds.has(item.id)}
              />
            </div>
          )
        })}
        {uploading && (
          <div className="flex justify-center">
            <div className="glass rounded-xl px-4 py-2 flex items-center gap-2 text-sm text-gray-400">
              <svg className="w-4 h-4 animate-spin text-nyx-400" fill="none" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-20" />
                <path d="M12 2a10 10 0 019.5 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              </svg>
              Uploading...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <AnimatePresence>
        {!isAtBottom && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            onClick={() => { scrollToBottom(); setUnreadCount(0) }}
            className="absolute bottom-28 right-6 z-20 w-10 h-10 rounded-full bg-nyx-600 text-white flex items-center justify-center shadow-lg shadow-nyx-600/40 hover:bg-nyx-500 transition-all active:scale-90"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-neon-pink text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showStickers && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="border-t border-white/10 glass overflow-hidden">
            <div className="flex gap-1 px-3 py-2 overflow-x-auto">
              {stickerCategories.map((cat, i) => (
                <button key={i} onClick={() => setActiveStickerTab(i)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${i === activeStickerTab ? 'bg-nyx-600 text-white' : 'text-gray-400 hover:text-white'}`}>
                  {cat.name}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-8 sm:grid-cols-10 gap-1 px-3 pb-3">
              {(stickerCategories[activeStickerTab]?.stickers || []).map((s, i) => (
                <button key={i} onClick={() => sendSticker(s)}
                  className="text-2xl p-1 hover:bg-white/10 rounded-lg transition-all hover:scale-110">
                  {s}
                </button>
              ))}
            </div>
          </motion.div>
        )}
        {showEmoji && (
          <div className="border-t border-white/10 glass relative">
            <EmojiPicker
              onSelect={sendEmoji}
              onClose={() => setShowEmoji(false)}
            />
          </div>
        )}
        {showGif && (
          <div className="border-t border-white/10 glass relative">
            <GifPicker
              onSelect={sendGif}
              onClose={() => setShowGif(false)}
            />
          </div>
        )}
      </AnimatePresence>

      {(replyTo || editingMsg) && (
        <div className="px-6 py-2 glass border-t border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-400 min-w-0">
            <svg className="w-4 h-4 text-nyx-400 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
            <span className="truncate">{editingMsg ? 'Editing message' : `Replying to ${replyTo.display_name || replyTo.username}`}</span>
          </div>
          <button onClick={() => { setReplyTo(null); setEditingMsg(null) }} className="text-gray-500 hover:text-white shrink-0">✕</button>
        </div>
      )}

      <input ref={fileInputRef} type="file" accept="image/*,video/*,audio/*" className="hidden" onChange={handleFileSelect} />

      <div className="px-4 sm:px-6 py-3 border-t border-white/10">
        {recording ? (
          <div className="flex items-center gap-3">
            <button onClick={cancelRecording} className="w-10 h-10 rounded-full glass flex items-center justify-center text-red-400 hover:bg-red-400/10 transition-all">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <div className="flex-1 flex items-center gap-3 glass rounded-xl px-4 py-3">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              <span className="text-sm text-white font-mono">{formatTime(recordingTime)}</span>
              <span className="text-xs text-gray-400">Recording...</span>
            </div>
            <button onClick={stopRecording} className="w-10 h-10 rounded-full bg-nyx-600 flex items-center justify-center text-white hover:bg-nyx-500 transition-all">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
            </button>
          </div>
        ) : (
          <div className="flex items-end gap-2">
            <button onClick={() => fileInputRef.current?.click()} title="Attach file"
              className="w-10 h-10 rounded-full glass flex items-center justify-center text-gray-400 hover:text-nyx-400 hover:bg-white/10 transition-all shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
            </button>

            <button onClick={() => { setShowEmoji(!showEmoji); setShowGif(false); setShowStickers(false) }} title="Emoji"
              className={`w-10 h-10 rounded-full glass flex items-center justify-center transition-all shrink-0 ${showEmoji ? 'text-nyx-400 bg-nyx-600/20' : 'text-gray-400 hover:text-nyx-400 hover:bg-white/10'}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01" /></svg>
            </button>

            <button onClick={() => { setShowGif(!showGif); setShowEmoji(false); setShowStickers(false) }} title="GIFs"
              className={`w-10 h-10 rounded-full glass flex items-center justify-center transition-all shrink-0 ${showGif ? 'text-neon-cyan bg-neon-cyan/20' : 'text-gray-400 hover:text-neon-cyan hover:bg-white/10'}`}>
              <span className="text-sm font-bold">GIF</span>
            </button>

            <button onClick={() => { setShowStickers(!showStickers); setShowEmoji(false) }} title="Stickers"
              className={`w-10 h-10 rounded-full glass flex items-center justify-center transition-all shrink-0 ${showStickers ? 'text-nyx-400 bg-nyx-600/20' : 'text-gray-400 hover:text-nyx-400 hover:bg-white/10'}`}>
              <span className="text-lg">😀</span>
            </button>

            <textarea
              ref={inputRef}
              value={input}
              onChange={e => { setInput(e.target.value); handleTyping() }}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              rows={1}
              className="input-field resize-none max-h-32 flex-1"
              style={{ minHeight: '44px' }}
            />

            {input.trim() ? (
              <button onClick={handleSend}
                className="w-10 h-10 rounded-full bg-nyx-600 flex items-center justify-center text-white hover:bg-nyx-500 transition-all shrink-0 active:scale-90">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
              </button>
            ) : (
              <button onClick={startRecording} title="Voice message"
                className="w-10 h-10 rounded-full glass flex items-center justify-center text-gray-400 hover:text-neon-pink hover:bg-neon-pink/10 transition-all shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-14 0m7 7v4m-4 0h8m-4-12a3 3 0 01-3 3m3-3a3 3 0 106 0m-6 0V5a3 3 0 016 0v6" /></svg>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
