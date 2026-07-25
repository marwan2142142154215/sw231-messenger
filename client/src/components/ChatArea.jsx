import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useChatStore } from '../store/chatStore'
import { useAuthStore } from '../store/authStore'
import { socketEmit } from '../services/socket'
import api from '../services/api'
import MessageBubble from './MessageBubble'

const EMOJIS = ['😀','😂','😍','🥰','😎','🤩','😭','🥳','🤔','😱','👍','❤️','🔥','💯','🙏','✨']

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
  const [recording, setRecording] = useState(false)
  const [stickerCategories, setStickerCategories] = useState([])
  const [activeStickerTab, setActiveStickerTab] = useState(0)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const fileInputRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const recordingTimerRef = useRef(null)
  const [recordingTime, setRecordingTime] = useState(0)
  const sendMessage = useChatStore(s => s.sendMessage)
  const user = useAuthStore(s => s.user)
  const typingTimeout = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (activeConversation) {
      socketEmit('conversation:join', activeConversation.id)
    }
  }, [activeConversation])

  useEffect(() => {
    api.get('/media/stickers').then(r => setStickerCategories(r.data.categories || [])).catch(() => {})
  }, [])

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
      type: type,
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
    const items = e.clipboardData?.items
    if (!items) return
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault()
        const blob = item.getAsFile()
        const ext = blob.type.split('/')[1] || 'png'
        const file = new File([blob], `paste-${Date.now()}.${ext}`, { type: blob.type })
        setUploading(true)
        try {
          const formData = new FormData()
          formData.append('file', file)
          const { data } = await api.post('/media/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
          if (data) sendMediaMessage(data, 'image')
        } catch {}
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
      setReplyTo(null)
      setEditingMsg(null)
      setShowStickers(false)
      setShowEmoji(false)
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

  return (
    <div className="flex-1 flex flex-col h-full" onPaste={handlePaste}>
      <div className="px-6 py-3 glass border-b border-white/10 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-nyx-500 to-neon-purple flex items-center justify-center text-sm font-bold shrink-0">
          {displayName.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="font-medium text-sm truncate">{displayName}</p>
          {typingNames.length > 0 && (
            <p className="text-xs text-neon-cyan animate-pulse">typing...</p>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-3">
        {messages.map(msg => (
          <MessageBubble
            key={msg.id}
            message={msg}
            isOwn={msg.sender_id === user?.id}
            onReply={() => setReplyTo(msg)}
            onEdit={() => { setEditingMsg(msg); setInput(msg.content); inputRef.current?.focus() }}
          />
        ))}
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
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="border-t border-white/10 glass overflow-hidden">
            <div className="grid grid-cols-8 sm:grid-cols-8 gap-1 px-3 py-2">
              {EMOJIS.map((e, i) => (
                <button key={i} onClick={() => sendEmoji(e)}
                  className="text-xl p-1.5 hover:bg-white/10 rounded-lg transition-all hover:scale-110">
                  {e}
                </button>
              ))}
            </div>
          </motion.div>
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

            <button onClick={() => setShowEmoji(!showEmoji)} title="Emoji"
              className={`w-10 h-10 rounded-full glass flex items-center justify-center transition-all shrink-0 ${showEmoji ? 'text-nyx-400 bg-nyx-600/20' : 'text-gray-400 hover:text-nyx-400 hover:bg-white/10'}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01" /></svg>
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
