import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useChatStore } from '../store/chatStore'
import toast from 'react-hot-toast'

export default function SearchUsers({ onClose, onSelect }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const createConversation = useChatStore(s => s.createConversation)

  const handleSearch = useCallback(async (q) => {
    setQuery(q)
    if (q.length < 2) { setResults([]); return }
    setLoading(true)
    try {
      const users = await useChatStore.getState().searchUsers(q)
      setResults(users)
    } catch {}
    setLoading(false)
  }, [])

  const handleStartChat = async (userId) => {
    try {
      const conv = await createConversation(userId)
      toast.success('Conversation started!')
      onSelect(conv)
    } catch (err) {
      toast.error(err.message)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="glass-strong rounded-2xl p-6 max-w-sm w-full space-y-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center">
          <h2 className="font-display text-lg font-semibold gradient-text">Find Users</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">✕</button>
        </div>

        <input
          type="text"
          placeholder="Search by username or email..."
          value={query}
          onChange={e => handleSearch(e.target.value)}
          className="input-field"
          autoFocus
        />

        <div className="max-h-60 overflow-y-auto space-y-2">
          {loading && <p className="text-center text-gray-400 text-sm py-4">Searching...</p>}
          {results.map(user => (
            <div key={user.id} className="flex items-center gap-3 p-3 glass rounded-xl hover:bg-white/5 transition-all">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-nyx-500 to-neon-cyan flex items-center justify-center text-sm font-bold">
                {user.username?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">{user.username}</p>
                <p className="text-xs text-gray-500">{user.display_name || user.username}</p>
              </div>
              <button onClick={() => handleStartChat(user.id)} className="btn-primary text-xs px-3 py-1.5">
                Chat
              </button>
            </div>
          ))}
          {!loading && query.length >= 2 && results.length === 0 && (
            <p className="text-center text-gray-500 text-sm py-4">No users found</p>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
