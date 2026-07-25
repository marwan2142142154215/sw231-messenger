import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useChatStore } from '../store/chatStore'
import { useAuthStore } from '../store/authStore'
import { useSocket } from '../hooks/useSocket'
import MessageBubble from './MessageBubble'

export default function ChatArea() {
  const activeConversation = useChatStore(s => s.activeConversation)
  const messages = useChatStore(s => s.messages)
  const typingUsers = useChatStore(s => s.typingUsers)
  const [input, setInput] = useState('')
  const [replyTo, setReplyTo] = useState(null)
  const [editingMsg, setEditingMsg] = useState(null)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const { emit } = useSocket()
  const sendMessage = useChatStore(s => s.sendMessage)
  const user = useAuthStore(s => s.user)
  const typingTimeout = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (activeConversation) {
      emit('conversation:join', activeConversation.id)
    }
  }, [activeConversation, emit])

  const handleTyping = () => {
    if (!activeConversation) return
    emit('typing:start', activeConversation.id)
    clearTimeout(typingTimeout.current)
    typingTimeout.current = setTimeout(() => {
      emit('typing:stop', activeConversation.id)
    }, 2000)
  }

  const handleSend = async () => {
    if (!input.trim() || !activeConversation) return
    if (editingMsg) {
      emit('message:edit', { messageId: editingMsg.id, content: input, conversationId: activeConversation.id })
      setEditingMsg(null)
    } else {
      sendMessage(activeConversation.id, input, replyTo, user, emit)
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
    }
  }

  const getOtherMember = () => {
    if (!activeConversation?.members) return null
    return activeConversation.members.find(m => m.id !== user?.id) || activeConversation.members[0]
  }

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
    <div className="flex-1 flex flex-col h-full">
      <div className="px-6 py-3 glass border-b border-white/10 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-nyx-500 to-neon-purple flex items-center justify-center text-sm font-bold">
          {displayName.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="font-medium text-sm">{displayName}</p>
          {typingNames.length > 0 && (
            <p className="text-xs text-neon-cyan animate-pulse">typing...</p>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
        {messages.map(msg => (
          <MessageBubble
            key={msg.id}
            message={msg}
            isOwn={msg.sender_id === user?.id}
            onReply={() => setReplyTo(msg)}
            onEdit={() => { setEditingMsg(msg); setInput(msg.content); inputRef.current?.focus() }}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {(replyTo || editingMsg) && (
        <div className="px-6 py-2 glass border-t border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <svg className="w-4 h-4 text-nyx-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
            <span>{editingMsg ? 'Editing message' : `Replying to ${replyTo.display_name || replyTo.username}`}</span>
          </div>
          <button onClick={() => { setReplyTo(null); setEditingMsg(null) }} className="text-gray-500 hover:text-white">✕</button>
        </div>
      )}

      <div className="px-6 py-4 border-t border-white/10">
        <div className="flex items-end gap-3">
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
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="btn-primary px-4 py-3 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
