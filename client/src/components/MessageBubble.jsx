import { motion } from 'framer-motion'
import { format, formatDistanceToNow } from 'date-fns'
import { useState } from 'react'
import { socketEmit } from '../services/socket'
import { useChatStore } from '../store/chatStore'

const EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '😡']

function resolveUrl(url) {
  if (!url) return ''
  return url.startsWith('http') ? url : `${import.meta.env.VITE_API_URL || ''}${url}`
}

function MediaImage({ url, fileName }) {
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)
  const src = resolveUrl(url)
  if (!src || error) {
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

function MediaVideo({ url }) {
  const src = resolveUrl(url)
  if (!src) return null
  return (
    <div className="rounded-xl overflow-hidden max-w-[300px]">
      <video src={src} controls className="max-w-[300px] max-h-[320px] rounded-xl" preload="metadata" />
    </div>
  )
}

function MediaAudio({ url }) {
  const src = resolveUrl(url)
  if (!src) return null
  return (
    <div className="flex items-center gap-3 glass rounded-xl px-3 py-2 min-w-[200px]">
      <svg className="w-5 h-5 text-nyx-400 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.105-2 3-2 3 .895 3 2z" />
      </svg>
      <audio src={src} controls className="max-w-[200px] h-8" preload="metadata" />
    </div>
  )
}

function MediaVoice({ url }) {
  const src = resolveUrl(url)
  if (!src) return null
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
  const src = resolveUrl(url)
  if (!src) return null
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
    case 'image': return <MediaImage url={message.mediaUrl || message.media_url} fileName={message.fileName || message.file_name} />
    case 'video': return <MediaVideo url={message.mediaUrl || message.media_url} />
    case 'audio': return <MediaAudio url={message.mediaUrl || message.media_url} />
    case 'voice': return <MediaVoice url={message.mediaUrl || message.media_url} />
    case 'sticker': return <MediaSticker content={message.content} />
    case 'file': return <MediaFile url={message.mediaUrl || message.media_url} fileName={message.fileName || message.file_name} fileSize={message.fileSize || message.file_size} />
    default: return null
  }
}

function HighlightedText({ text, query }) {
  if (!query || !text) return <>{String(text || '')}</>
  const safeText = String(text)
  const q = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`(${q})`, 'gi')
  const parts = safeText.split(regex)
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={i} className="bg-nyx-400/40 text-yellow-200 rounded px-0.5">{part}</mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  )
}

function formatLastSeen(lastSeen) {
  if (!lastSeen) return 'Last seen: unknown'
  try {
    const date = new Date(lastSeen)
    const now = new Date()
    const diffMin = (now - date) / 60000
    if (diffMin < 1) return 'Last seen: just now'
    if (diffMin < 60) return `Last seen: ${Math.floor(diffMin)}m ago`
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const seenDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    const dayDiff = (today - seenDate) / 86400000
    if (dayDiff === 0) return `Last seen: today ${format(date, 'HH:mm')}`
    if (dayDiff === 1) return `Last seen: yesterday ${format(date, 'HH:mm')}`
    return `Last seen: ${format(date, 'MMM d, HH:mm')}`
  } catch { return 'Last seen: unknown' }
}

export default function MessageBubble({ message, isOwn, onReply, onEdit, searchHighlight, isSearchMatch }) {
  const [showReactions, setShowReactions] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [showReactionNames, setShowReactionNames] = useState(null)
  const [showReadBy, setShowReadBy] = useState(false)
  const retryMessage = useChatStore(s => s.retryMessage)
  const lastSeenMap = useChatStore(s => s.lastSeenMap)
  const activeConversation = useChatStore(s => s.activeConversation)

  if (!message || !message.id) return null

  const handleReact = (emoji) => {
    socketEmit('message:react', { messageId: message.id, emoji, conversationId: message.conversation_id })
    setShowReactions(false)
  }

  const handleDelete = () => {
    socketEmit('message:delete', { messageId: message.id, conversationId: message.conversation_id, forEveryone: true })
    setShowMenu(false)
  }

  const handleRetry = () => {
    if (!message.conversation_id) return
    retryMessage(message.id, message.conversation_id, message.content, message.replyTo, { id: message.sender_id, username: message.username, display_name: message.display_name, avatar_url: message.avatar_url }, socketEmit)
  }

  const groupedReactions = (message.reactions || []).reduce((acc, r) => {
    if (!r || !r.emoji) return acc
    const existing = acc.find(a => a.emoji === r.emoji)
    if (existing) { existing.count++; existing.userIds.push(r.userId); if (r.username) existing.names.push(r.display_name || r.username) }
    else acc.push({ emoji: r.emoji, count: 1, userIds: [r.userId], names: r.username ? [r.display_name || r.username] : [] })
    return acc
  }, [])

  const isSticker = message.type === 'sticker'
  const hasText = message.type === 'text' || (message.content && message.type !== 'sticker' && message.type !== 'voice')
  const hasMedia = message.type && message.type !== 'text' && message.type !== 'sticker'

  const readBy = message.readBy || []
  const hasBeenRead = readBy.length > 0
  const isPrivateChat = activeConversation?.type !== 'group'
  const otherMembers = (activeConversation?.members || []).filter(m => m.id !== message.sender_id)
  const allOthersRead = isPrivateChat && otherMembers.length > 0 && otherMembers.every(m => readBy.find(r => r.userId === m.id))

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
    >
      <div className={`relative group max-w-sm sm:max-w-md ${isSearchMatch ? 'transition-all duration-500' : ''}`}>
        {message.replyTo && (
          <div className={`text-xs mb-1 px-3 py-1.5 glass rounded-t-lg border-b-0 ${isOwn ? 'rounded-tr-none' : 'rounded-tl-none'}`}>
            <p className="text-nyx-300 font-medium truncate">{message.replyTo.display_name || message.replyTo.username || 'Unknown'}</p>
            <p className="text-gray-500 truncate mt-0.5">{message.replyTo.content?.substring(0, 60) || 'Media'}</p>
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
            {!isOwn && message.display_name && (
              <p className="text-[11px] font-semibold text-nyx-300 mb-0.5">{message.display_name}</p>
            )}
            {message.is_edited === 1 && <span className="text-[10px] text-gray-500 italic">edited </span>}

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
              {message._failed && (
                <button onClick={handleRetry} title="Retry" className="text-red-400 hover:text-red-300 text-xs flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </button>
              )}
              <p className={`text-[10px] ${isOwn ? 'text-white/50' : 'text-gray-500'}`}>
                {(() => { try { return format(new Date(message.created_at), 'HH:mm') } catch { return '' } })()}
              </p>
              {isOwn && (
                <div className="relative">
                  <button
                    onClick={() => { if (hasBeenRead) setShowReadBy(!showReadBy) }}
                    className="flex items-center"
                    title={hasBeenRead ? `Read by ${readBy.map(r => r.display_name || r.username).join(', ')}` : 'Sent'}
                  >
                    {hasBeenRead ? (
                      <svg className={`w-4 h-4 ${allOthersRead ? 'text-blue-400' : 'text-blue-300'}`} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M1.5 8.5l3 3 7-7" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M5.5 8.5l3 3 7-7" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : (
                      <svg className="w-3.5 h-3.5 text-white/40" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <path d="M2 8.5l3.5 3.5 8.5-8.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </button>
                  {showReadBy && hasBeenRead && (
                    <div className="absolute bottom-5 right-0 glass-strong rounded-lg px-2.5 py-1.5 text-[10px] text-gray-300 whitespace-nowrap z-30 min-w-[120px] shadow-lg">
                      <p className="font-medium text-white mb-0.5">Seen by</p>
                      {readBy.map((r, i) => (
                        <p key={i} className="text-gray-400">{r.display_name || r.username}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {!isOwn && !isSticker && message.type !== 'voice' && (
                <div className="group/seen relative">
                  <svg className="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
                  <div className="absolute bottom-5 right-0 hidden group-hover/seen:block glass-strong rounded-lg px-2 py-1 text-[10px] text-gray-300 whitespace-nowrap z-30">
                    {formatLastSeen(lastSeenMap[message.sender_id])}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {groupedReactions.length > 0 && (
          <div className="flex gap-1 mt-1 flex-wrap relative">
            {groupedReactions.map((r, i) => (
              <button
                key={i}
                onClick={() => setShowReactionNames(showReactionNames === i ? null : i)}
                className="glass rounded-full px-2 py-0.5 text-xs flex items-center gap-1 hover:bg-white/10 transition-all"
              >
                <span>{r.emoji}</span>
                <span className="text-gray-400">{r.count}</span>
              </button>
            ))}
            {showReactionNames !== null && groupedReactions[showReactionNames] && (
              <div className="absolute bottom-6 left-0 glass-strong rounded-lg px-3 py-2 text-[11px] text-gray-300 whitespace-nowrap z-30 min-w-[120px]">
                <p className="font-medium text-white mb-0.5">{groupedReactions[showReactionNames].emoji}</p>
                {groupedReactions[showReactionNames].names.length > 0 ? (
                  groupedReactions[showReactionNames].names.map((name, ni) => (
                    <p key={ni} className="text-gray-400">{name}</p>
                  ))
                ) : (
                  <p className="text-gray-500">{groupedReactions[showReactionNames].count} reaction{groupedReactions[showReactionNames].count > 1 ? 's' : ''}</p>
                )}
              </div>
            )}
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
