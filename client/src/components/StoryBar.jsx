import { motion } from 'framer-motion'
import { format } from 'date-fns'

export default function StoryBar({ stories, onAdd, onView }) {
  return (
    <div className="flex gap-4 overflow-x-auto py-3 px-1 scrollbar-hide">
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onAdd}
        className="shrink-0 w-16 h-16 rounded-full glass flex flex-col items-center justify-center gap-0.5 hover:bg-white/10 transition-all border-2 border-dashed border-nyx-500/30"
      >
        <svg className="w-5 h-5 text-nyx-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        <span className="text-[9px] text-nyx-400">Story</span>
      </motion.button>

      {stories.map((story, i) => (
        <motion.button
          key={story.id || i}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onView(story)}
          className="shrink-0 w-16 h-16 rounded-full p-0.5 bg-gradient-to-br from-nyx-500 via-neon-cyan to-neon-pink"
        >
          <div className="w-full h-full rounded-full bg-nyx-950 flex items-center justify-center border-2 border-nyx-950">
            <span className="text-sm font-bold">{(story.user?.username || '?').charAt(0).toUpperCase()}</span>
          </div>
        </motion.button>
      ))}
    </div>
  )
}
