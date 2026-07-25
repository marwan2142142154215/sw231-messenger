import { motion } from 'framer-motion'
import { format } from 'date-fns'
import { useState, useRef } from 'react'
import { socketEmit } from '../services/socket'
import { useChatStore } from '../store/chatStore'

const EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '😡']
const API_BASE = import.meta.env.VITE_API_URL || ''

function MediaImage({ url, fileName }) {
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)
  const src = url.startsWith('http') ? url : `${API_BASE}${url}`
  if (error) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-xs text-gray-400">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
        Failed to load image
      </div>
    )
  }
  return (
    <div className="rounded-xl overflow-hidden max-w-[280px]">
      {!loaded && <div className="w-[280px] h-[200px] bg-white/5 animate-pulse rounded-xl" />}
      <img
        src={src}
        alt={fileName || 'image'}
        className={`max-w-[280px] max-h-[320px] object-cover rounded-xl cursor-pointer hover:opacity-90 transition-opacity ${loaded ? '' : 'hidden'}`}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
        onClick={() => window.open(src, '_blank')}
      />
    </div>
  )
}

function MediaVideo({ url, fileName }) {
  const src = url.startsWith('http') ? url : `${API_BASE}${url}`
  return (
    <div className="rounded-xl overflow-hidden max-w-[300px]">
      <video
        src={src}
        controls
        className="max-w-[300px] max-h-[320px] rounded-xl"
        preload="metadata"
      />
    </div>
  )
}

function MediaAudio({ url, fileName }) {
  const src = url.startsWith('http') ? url : `${API_BASE}${url}`
  return (
    <div className="flex items-center gap-3 glass rounded-xl px-3 py-2 min-w-[200px]">
      <svg className="w-5 h-5 text-nyx-400 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" />
      </svg>
      <audio src={src} controls className="max-w-[200px] h-8" preload="metadata" />
    </div>
  )
}

function MediaVoice({ url }) {
  const src = url.startsWith('http') ? url : `${API_BASE}${url}`
  return (
    <div className="flex items-center gap-3 glass rounded-xl px-3 py-2 min-w-[180px]">
      <svg className="w-5 h-5 text-neon-pink shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-14 0m7 7v4m-4 0h8m-4-12a3 3 0 01-3 3m3-3a3 3 0 106 0m-6 0V5a3 3 0 016 0v6" />
      </svg>
      <audio src={src} controls className="max-w-[200px] h-8" preload="metadata" />
    </div>
  )
}

function MediaSticker({ content }) {
  return <span className="text-6xl leading-none block py-1">{content}</span>
}

function MediaFile({ url, fileName, fileSize }) {
  const src = url.startsWith('http') ? url : `${API_BASE}${url}`
  const sizeStr = fileSize ? (fileSize > 1048576 ? `${(fileSize / 1048576).toFixed(1)} MB` : `${(fileSize / 1024).toFixed(1)} KB`) : ''
  return (
    <a href={src} target="_blank" rel="noopener noreferrer"
      className="flex items-center gap-3 glass rounded-xl px-3 py-2 hover:bg-white/10 transition-all no-underline min-w-[200px]">
      <div className="w-10 h-10 rounded-lg bg-nyx-600/30 flex items-center justify-center shrink-0">
        <svg className="w-5 h-5 text-nyx-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
      </div>
      <div className="min-w-0">
        <p className="text-sm text-white truncate">{fileName || 'File'}</p>
        {sizeStr && <p className="text-[10px] text-gray-500">{sizeStr}</p>}
      </div>
    </a>
  )
}

function MessageMedia({ message }) {
  switch (message.type) {
    case 'image': return <MediaImage url={message.media_url} fileName={message.file_name} />
    case 'video': return <MediaVideo url={message.media_url} fileName={message.file_name} />
    case 'audio': return <MediaAudio url={message.media_url} fileName={message.file_name} />
    case 'voice': return <MediaVoice url={message.media_url} />
    case 'sticker': return <MediaSticker content={message.content} />
    case 'file': return <MediaFile url={message.media_url} fileName={message.file_name} fileSize={message.file_size} />
    default: return null
  }
}

function HighlightedText({ text, query }) {
  if (!query || !text) return <>{text}</>
  const q = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`(${q})`, 'gi')
  const parts = text.split(regex)
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-nyx-400/40 text-yellow-200 rounded px-0.5">{part}</mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  )
}

export default function MessageBubble({ message, isOwn, onReply, onEdit, searchHighlight, isSearchMatch }) {
  const [showReactions, setShowReactions] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const retryMessage = useChatStore(s => s.retryMessage)

  const handleReact = (emoji) => {
    socketEmit('message:react', { messageId: message.id, emoji, conversationId: message.conversation_id })
    setShowReactions(false)
  }

  const handleDelete = () => {
    socketEmit('message:delete', { messageId: message.id, conversationId: message.conversation_id, forEveryone: true })
    setShowMenu(false)
  }

  const handleRetry = () => {
    retryMessage(message.id, message.conversation_id, message.content, message.replyTo, { id: message.sender_id, username: message.username, display_name: message.display_name, avatar_url: message.avatar_url }, socketEmit)
  }

  const groupedReactions = (message.reactions || []).reduce((acc, r) => {
    const existing = acc.find(a => a.emoji === r.emoji)
    if (existing) { existing.count++; existing.userIds.push(r.userId) }
    else acc.push({ emoji: r.emoji, count: 1, userIds: [r.userId] })
    return acc
  }, [])

  const isSticker = message.type === 'sticker'
  const hasText = message.type === 'text' || (message.content && message.type !== 'sticker' && message.type !== 'voice')
  const hasMedia = message.type && message.type !== 'text' && message.type !== 'sticker'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
    >
      <div className={`relative group max-w-sm sm:max-w-md ${isOwn ? 'order-1' : 'order-1'} ${isSearchMatch ? 'transition-all duration-500' : ''}`}>
        {message.replyTo && (
          <div className="text-xs text-gray-500 mb-1 px-2 py-1 glass rounded-t-lg border-b-0">
            Replying to: {message.replyTo.content?.substring(0, 50)}
          </div>
        )}

        {isSticker ? (
          <div
            className="cursor-pointer hover:scale-105 transition-transform"
            onDoubleClick={() => setShowReactions(!showReactions)}
          >
            <MessageMedia message={message} />
          </div>
        ) : (
          <div
            className={isOwn ? 'chat-bubble-right' : 'chat-bubble-left'}
            onDoubleClick={() => setShowReactions(!showReactions)}
          >
            {message.is_edited === 1 && <span className="text-xs text-gray-500 italic">edited </span>}

            {hasMedia && (
              <div className={`${hasText ? 'mb-2' : ''}`}>
                <MessageMedia message={message} />
              </div>
            )}

            {hasText && (
              <p className="text-sm leading-relaxed break-words">
                {searchHighlight ? <HighlightedText text={message.content} query={searchHighlight} /> : message.content}
              </p>
            )}

            <div className={`flex items-center gap-1.5 mt-1 ${isOwn ? 'justify-end' : ''}`}>
              {message._sending && (
                <svg className="w-3 h-3 text-white/40 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-20" />
                  <path d="M12 2a10 10 0 019.5 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
              )}
              {message._failed && (
                <button onClick={handleRetry} title="Retry" className="text-red-400 hover:text-red-300 text-xs">⚠ Retry</button>
              )}
              <p className={`text-[10px] ${isOwn ? 'text-white/50' : 'text-gray-500'}`}>
                {format(new Date(message.created_at), 'HH:mm')}
              </p>
            </div>
          </div>
        )}

        {groupedReactions.length > 0 && (
          <div className="flex gap-1 mt-1 flex-wrap">
            {groupedReactions.map((r, i) => (
              <button
                key={i}
                onClick={() => handleReact(r.emoji)}
                className="glass rounded-full px-2 py-0.5 text-xs flex items-center gap-1 hover:bg-white/10 transition-all"
              >
                <span>{r.emoji}</span>
                <span className="text-gray-400">{r.count}</span>
              </button>
            ))}
          </div>
        )}

        <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 -mt-2 -mr-2">
          <button onClick={() => setShowReactions(!showReactions)} className="w-6 h-6 glass rounded-full flex items-center justify-center text-xs hover:bg-white/10">😊</button>
          <button onClick={onReply} className="w-6 h-6 glass rounded-full flex items-center justify-center text-xs hover:bg-white/10">↩</button>
          {isOwn && (
            <div className="relative">
              <button onClick={() => setShowMenu(!showMenu)} className="w-6 h-6 glass rounded-full flex items-center justify-center text-xs hover:bg-white/10">⋮</button>
              {showMenu && (
                <div className="absolute top-8 right-0 glass-strong rounded-xl py-1 min-w-[100px] z-10">
                  {message.type === 'text' && <button onClick={onEdit} className="w-full px-3 py-1.5 text-xs text-left hover:bg-white/10">Edit</button>}
                  <button onClick={handleDelete} className="w-full px-3 py-1.5 text-xs text-left hover:bg-white/10 text-neon-pink">Delete</button>
                </div>
              )}
            </div>
          )}
        </div>

        {showReactions && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: -5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="absolute -top-12 left-0 glass-strong rounded-full px-2 py-1 flex gap-1 z-20"
          >
            {EMOJIS.map(e => (
              <button key={e} onClick={() => handleReact(e)} className="text-lg hover:scale-125 transition-transform p-1">{e}</button>
            ))}
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}
