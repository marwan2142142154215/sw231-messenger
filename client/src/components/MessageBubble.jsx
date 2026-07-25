import { motion } from 'framer-motion'
import { format } from 'date-fns'
import { useState } from 'react'
import { useSocket } from '../hooks/useSocket'

const EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '😡']

export default function MessageBubble({ message, isOwn, onReply, onEdit }) {
  const [showReactions, setShowReactions] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const { emit } = useSocket()

  const handleReact = (emoji) => {
    emit('react_message', { messageId: message.id, emoji })
    setShowReactions(false)
  }

  const handleDelete = () => {
    emit('delete_message', { messageId: message.id })
    setShowMenu(false)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
    >
      <div className={`relative group max-w-md ${isOwn ? 'order-1' : 'order-1'}`}>
        {message.reply_to && (
          <div className="text-xs text-gray-500 mb-1 px-2 py-1 glass rounded-t-lg border-b-0">
            Replying to: {message.reply_to.content?.substring(0, 50)}
          </div>
        )}
        <div
          className={isOwn ? 'chat-bubble-right' : 'chat-bubble-left'}
          onDoubleClick={() => setShowReactions(!showReactions)}
        >
          {message.is_edited && <span className="text-xs text-gray-500 italic">edited </span>}
          <p className="text-sm leading-relaxed break-words">{message.content}</p>
          <p className={`text-[10px] mt-1 ${isOwn ? 'text-white/50' : 'text-gray-500'}`}>
            {format(new Date(message.created_at), 'HH:mm')}
          </p>
        </div>

        {message.reactions && message.reactions.length > 0 && (
          <div className="flex gap-1 mt-1 flex-wrap">
            {message.reactions.map((r, i) => (
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
                  <button onClick={onEdit} className="w-full px-3 py-1.5 text-xs text-left hover:bg-white/10">Edit</button>
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
