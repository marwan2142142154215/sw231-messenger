import { useState, useMemo, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { EMOJI_CATEGORIES, getRecentlyUsed, addRecentlyUsed } from '../data/emojiData'

export default function EmojiPicker({ onSelect, onClose }) {
  const [query, setQuery] = useState('')
  const [activeTab, setActiveTab] = useState('Smileys')
  const [recentEmojis, setRecentEmojis] = useState(getRecentlyUsed())
  const searchRef = useRef(null)
  const containerRef = useRef(null)

  useEffect(() => {
    searchRef.current?.focus()
  }, [])

  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  const filteredCategories = useMemo(() => {
    if (!query) {
      return EMOJI_CATEGORIES.map(cat => {
        if (cat.name === 'Recent') return { ...cat, emojis: recentEmojis }
        return cat
      }).filter(cat => cat.name !== 'Recent' || cat.emojis.length > 0)
    }
    const q = query.toLowerCase()
    return EMOJI_CATEGORIES
      .map(cat => ({
        ...cat,
        emojis: cat.emojis.filter(e => e.includes(q)),
      }))
      .filter(cat => cat.emojis.length > 0)
      .map((cat, i) => (i === 0 ? { ...cat, name: 'Results' } : cat))
  }, [query, recentEmojis])

  const handleSelect = (emoji) => {
    addRecentlyUsed(emoji)
    setRecentEmojis(getRecentlyUsed())
    onSelect(emoji)
  }

  const tabs = filteredCategories.map(c => ({ name: c.name, icon: c.icon }))

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.95 }}
      transition={{ duration: 0.15 }}
      className="absolute bottom-full left-0 mb-2 w-[340px] h-[420px] bg-gray-900 border border-gray-700/50 rounded-xl shadow-2xl flex flex-col overflow-hidden z-50"
    >
      {/* Search */}
      <div className="p-2 border-b border-gray-700/50">
        <input
          ref={searchRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search emoji..."
          className="w-full bg-gray-800 text-white text-sm rounded-lg px-3 py-2 outline-none border border-gray-700/50 focus:border-neon-purple/50 transition-colors"
        />
      </div>

      {/* Category tabs */}
      {!query && (
        <div className="flex gap-0.5 px-1 py-1 border-b border-gray-700/50 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab.name}
              onClick={() => setActiveTab(tab.name)}
              className={`px-2 py-1.5 rounded-md text-sm transition-all shrink-0 ${
                activeTab === tab.name
                  ? 'bg-neon-purple/20 text-neon-purple'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
              title={tab.name}
            >
              {tab.icon}
            </button>
          ))}
        </div>
      )}

      {/* Emoji grid */}
      <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
        {filteredCategories
          .filter(cat => query || cat.name === activeTab)
          .map((cat) => (
            <div key={cat.name} className="mb-3">
              <p className="text-[10px] uppercase tracking-wider text-gray-500 font-medium mb-1 px-1">
                {cat.name}
              </p>
              <div className="grid grid-cols-9 gap-0">
                {cat.emojis.map((emoji, i) => (
                  <button
                    key={`${emoji}-${i}`}
                    onClick={() => handleSelect(emoji)}
                    className="w-8 h-8 flex items-center justify-center text-xl hover:bg-gray-800 rounded-md transition-colors cursor-pointer active:scale-90"
                    title={emoji}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          ))}
      </div>
    </motion.div>
  )
}
