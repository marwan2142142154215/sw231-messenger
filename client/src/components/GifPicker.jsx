import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { getCuratedGifs, searchCuratedGifs, CATEGORIES } from '../data/curatedGifs'
import api from '../services/api'

export default function GifPicker({ onSelect, onClose }) {
  const [query, setQuery] = useState('')
  const [activeTab, setActiveTab] = useState(0)
  const [apiResults, setApiResults] = useState(null)
  const [searching, setSearching] = useState(false)
  const searchRef = useRef(null)
  const containerRef = useRef(null)
  const debounceRef = useRef(null)

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

  const handleSearch = (val) => {
    setQuery(val)
    setApiResults(null)
    clearTimeout(debounceRef.current)
    if (val.length >= 2) {
      debounceRef.current = setTimeout(async () => {
        setSearching(true)
        try {
          const res = await api.get(`/media/gifs?q=${encodeURIComponent(val)}&limit=20`)
          const results = res.data?.results || []
          if (results.length > 0) setApiResults(results)
          else setApiResults(searchCuratedGifs(val))
        } catch {
          setApiResults(searchCuratedGifs(val))
        }
        setSearching(false)
      }, 300)
    }
  }

  const handleTabClick = (idx) => {
    setActiveTab(idx)
    setQuery('')
    setApiResults(null)
  }

  const displayGifs = apiResults || getCuratedGifs(activeTab)

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.95 }}
      transition={{ duration: 0.15 }}
      className="absolute bottom-full left-0 mb-2 w-[340px] h-[420px] bg-gray-900 border border-gray-700/50 rounded-xl shadow-2xl flex flex-col overflow-hidden z-50"
    >
      <div className="p-2 border-b border-gray-700/50">
        <input
          ref={searchRef}
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search GIFs..."
          className="w-full bg-gray-800 text-white text-sm rounded-lg px-3 py-2 outline-none border border-gray-700/50 focus:border-neon-cyan/50 transition-colors"
        />
      </div>

      {!query && (
        <div className="flex gap-0.5 px-1 py-1 border-b border-gray-700/50 overflow-x-auto no-scrollbar">
          {CATEGORIES.map((cat, idx) => (
            <button
              key={cat.name}
              onClick={() => handleTabClick(idx)}
              className={`px-2 py-1.5 rounded-md text-[11px] font-medium whitespace-nowrap transition-all shrink-0 flex items-center gap-1 ${
                activeTab === idx
                  ? 'bg-neon-cyan/20 text-neon-cyan'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.name}</span>
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
        {searching ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-6 h-6 border-2 border-neon-cyan border-t-transparent rounded-full animate-spin" />
          </div>
        ) : displayGifs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-gray-500 text-sm gap-2">
            <span className="text-2xl">🎬</span>
            <p>No GIFs found</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-1.5">
            {displayGifs.map((gif) => (
              <button
                key={gif.id}
                onClick={() => onSelect(gif.url, gif.thumb)}
                className="relative group rounded-lg overflow-hidden bg-gray-800 aspect-video"
              >
                <img
                  src={gif.thumb}
                  alt={gif.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="px-3 py-1.5 border-t border-gray-700/50 text-center">
        <p className="text-[10px] text-gray-600">{displayGifs.length} GIFs</p>
      </div>
    </motion.div>
  )
}
