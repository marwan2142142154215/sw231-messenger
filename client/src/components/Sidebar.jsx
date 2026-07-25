import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useChatStore } from '../store/chatStore'
import { useAuthStore } from '../store/authStore'
import { useNavigate, useParams } from 'react-router-dom'
import QRModal from './QRModal'
import SearchUsers from './SearchUsers'

export default function Sidebar() {
  const conversations = useChatStore(s => s.conversations)
  const activeConversation = useChatStore(s => s.activeConversation)
  const setActiveConversation = useChatStore(s => s.setActiveConversation)
  const onlineUsers = useChatStore(s => s.onlineUsers)
  const user = useAuthStore(s => s.user)
  const navigate = useNavigate()
  const { conversationId } = useParams()
  const [showQR, setShowQR] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [filter, setFilter] = useState('')
  const lastConvIdRef = useRef(null)

  useEffect(() => {
    if (conversationId && conversationId !== lastConvIdRef.current && conversations.length) {
      const conv = conversations.find(c => c.id === conversationId)
      if (conv && activeConversation?.id !== conversationId) {
        lastConvIdRef.current = conversationId
        setActiveConversation(conv)
      }
    }
  }, [conversationId])

  const handleSelect = (conv) => {
    lastConvIdRef.current = conv.id
    setActiveConversation(conv)
    navigate(`/chat/${conv.id}`)
  }

  const getOtherMember = (conv) => {
    if (!conv.members) return null
    return conv.members.find(m => m.id !== user?.id) || conv.members[0]
  }

  const filtered = conversations.filter(c => {
    const other = getOtherMember(c)
    const name = c.type === 'group' ? c.name : (other?.display_name || other?.username || '')
    return name.toLowerCase().includes(filter.toLowerCase())
  })

  return (
    <div className="w-80 h-full glass flex flex-col border-r border-white/10 shrink-0">
      <div className="p-4 space-y-3">
        <div className="flex gap-2">
          <button onClick={() => setShowQR(true)} className="btn-primary text-sm px-3 py-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
          </button>
          <button onClick={() => setShowSearch(true)} className="btn-secondary text-sm px-3 py-2 flex-1 flex items-center justify-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Search
          </button>
        </div>
        <input
          type="text"
          placeholder="Filter chats..."
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="input-field text-sm py-2"
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        <AnimatePresence>
          {filtered.map((conv, i) => {
            const other = getOtherMember(conv)
            const otherName = conv.type === 'group' ? conv.name : (other?.display_name || other?.username || 'Unknown')
            const isOnline = other?.id ? onlineUsers.has(other.id) : false
            return (
              <motion.button
                key={conv.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => handleSelect(conv)}
                className={`w-full flex items-center gap-3 px-4 py-3 transition-all hover:bg-white/5 ${
                  activeConversation?.id === conv.id ? 'bg-nyx-600/20 border-r-2 border-nyx-500' : ''
                }`}
              >
                <div className="relative">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-nyx-500 to-neon-purple flex items-center justify-center text-sm font-bold">
                    {otherName.charAt(0).toUpperCase()}
                  </div>
                  {isOnline && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-neon-cyan rounded-full border-2 border-nyx-950" />
                  )}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="font-medium text-sm truncate">{otherName}</p>
                  <p className="text-xs text-gray-500 truncate">{conv.lastMessage || 'No messages yet'}</p>
                </div>
              </motion.button>
            )
          })}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showQR && <QRModal onClose={() => setShowQR(false)} />}
        {showSearch && <SearchUsers onClose={() => setShowSearch(false)} onSelect={(conv) => { setShowSearch(false); handleSelect(conv) }} />}
      </AnimatePresence>
    </div>
  )
}
