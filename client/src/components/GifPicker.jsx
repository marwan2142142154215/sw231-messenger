import { useState, useEffect, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import api from '../services/api'

const TRENDING_SEARCHES = ['hello', 'love', 'funny', 'cool', 'thumbs up', 'celebration', 'dance', 'fire', 'yes', 'no', 'sad', 'excited']

export default function GifPicker({ onSelect, onClose }) {
  const [query, setQuery] = useState('')
  const [gifs, setGifs] = useState([])
  const [loading, setLoading] = useState(false)
  const [trending, setTrending] = useState([])
  const searchRef = useRef(null)
  const containerRef = useRef(null)
  const debounceRef = useRef(null)

  useEffect(() => {
    searchRef.current?.focus()
    fetchGifs('')
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

  const fetchGifs = useCallback(async (q) => {
    setLoading(true)
    try {
      const url = q ? `/api/media/gifs?q=${encodeURIComponent(q)}` : '/api/media/gifs?trending=true'
      const res = await api.get(url)
      const results = res.data?.results || res.data?.gifs || []
      if (!q) setTrending(results)
      setGifs(results)
    } catch (err) {
      console.error('GIF fetch error:', err)
      setGifs([])
    } finally {
      setLoading(false)
    }
  }, [])

  const handleSearch = (val) => {
    setQuery(val)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchGifs(val), 400)
  }

  const handleTrendingSearch = (term) => {
    setQuery(term)
    fetchGifs(term)
  }

  const displayGifs = query ? gifs : (trending.length > 0 ? trending : gifs)

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.95 }}
      transition={{ duration: 0.15 }}
      className="absolute bottom-full left-0 mb-2 w-[360px] h-[440px] bg-gray-900 border border-gray-700/50 rounded-xl shadow-2xl flex flex-col overflow-hidden z-50"
    >
      {/* Search */}
      <div className="p-2 border-b border-gray-700/50">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
          <input
            ref={searchRef}
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search GIFs..."
            className="w-full bg-gray-800 text-white text-sm rounded-lg pl-8 pr-3 py-2 outline-none border border-gray-700/50 focus:border-neon-cyan/50 transition-colors"
          />
        </div>
      </div>

      {/* Trending tags when no query */}
      {!query && (
        <div className="flex flex-wrap gap-1.5 px-2 py-2 border-b border-gray-700/50">
          {TRENDING_SEARCHES.map((term) => (
            <button
              key={term}
              onClick={() => handleTrendingSearch(term)}
              className="px-2.5 py-1 text-[11px] bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-full transition-colors"
            >
              {term}
            </button>
          ))}
        </div>
      )}

      {/* GIF grid */}
      <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-8 h-8 border-2 border-neon-cyan border-t-transparent rounded-full animate-spin" />
          </div>
        ) : displayGifs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 text-sm gap-2">
            <span className="text-3xl">🎬</span>
            <p>No GIFs found</p>
            <p className="text-xs text-gray-600">Try a different search term</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-1.5">
            {displayGifs.map((gif, i) => {
              const thumb = gif.thumbnail || gif.media_formats?.tinygif?.url || gif.media_formats?.nanogif?.url || ''
              const full = gif.url || gif.media_formats?.gif?.url || gif.media_formats?.mediumgif?.url || ''
              return (
                <button
                  key={gif.id || i}
                  onClick={() => onSelect(full, thumb)}
                  className="relative group rounded-lg overflow-hidden bg-gray-800 aspect-video"
                >
                  <img
                    src={thumb}
                    alt={gif.title || 'GIF'}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Powered by */}
      <div className="px-3 py-1.5 border-t border-gray-700/50 text-center">
        <p className="text-[10px] text-gray-600">Powered by Tenor</p>
      </div>
    </motion.div>
  )
}
