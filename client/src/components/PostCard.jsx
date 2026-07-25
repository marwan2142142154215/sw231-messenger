import { motion } from 'framer-motion'
import { format } from 'date-fns'
import { useState } from 'react'
import { useSocialStore } from '../store/socialStore'
import { useAuthStore } from '../store/authStore'

export default function PostCard({ post }) {
  const [commentText, setCommentText] = useState('')
  const [showComments, setShowComments] = useState(false)
  const likePost = useSocialStore(s => s.likePost)
  const commentOnPost = useSocialStore(s => s.commentOnPost)
  const user = useAuthStore(s => s.user)

  const handleComment = async () => {
    if (!commentText.trim()) return
    await commentOnPost(post.id, commentText)
    setCommentText('')
  }

  const authorName = post.user?.display_name || post.user?.username || 'Unknown'
  const authorInitial = authorName.charAt(0).toUpperCase()

  let mediaUrls = []
  try { mediaUrls = typeof post.media_urls === 'string' ? JSON.parse(post.media_urls) : (post.media_urls || []) } catch { mediaUrls = [] }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl p-5 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-nyx-500 to-neon-purple flex items-center justify-center text-sm font-bold">
          {authorInitial}
        </div>
        <div>
          <p className="font-medium text-sm">{authorName}</p>
          <p className="text-xs text-gray-500">{format(new Date(post.created_at), 'MMM d, HH:mm')}</p>
        </div>
      </div>

      <p className="text-sm leading-relaxed">{post.content}</p>

      {mediaUrls.length > 0 && mediaUrls[0] && (
        <img src={mediaUrls[0]} alt="" className="w-full rounded-xl object-cover max-h-80" />
      )}

      <div className="flex items-center gap-6 pt-2 border-t border-white/5">
        <button
          onClick={() => likePost(post.id)}
          className={`flex items-center gap-2 text-sm transition-all ${post.hasLiked ? 'text-neon-pink' : 'text-gray-400 hover:text-neon-pink'}`}
        >
          <svg className="w-5 h-5" fill={post.hasLiked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          <span>{post.likesCount || post.likes_count || 0}</span>
        </button>
        <button
          onClick={() => setShowComments(!showComments)}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-neon-cyan transition-all"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <span>{post.commentsCount || post.comments_count || 0}</span>
        </button>
      </div>

      {showComments && (
        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="space-y-3">
          {(post.comments || []).map((c, i) => (
            <div key={i} className="flex gap-2 items-start">
              <div className="w-6 h-6 rounded-full bg-nyx-700 flex items-center justify-center text-[10px] font-bold shrink-0 mt-1">
                {(c.user?.username || '?').charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-xs font-medium">{c.user?.username || 'Unknown'}</p>
                <p className="text-xs text-gray-400">{c.content}</p>
              </div>
            </div>
          ))}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Write a comment..."
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleComment()}
              className="input-field text-sm py-2 flex-1"
            />
            <button onClick={handleComment} className="btn-primary text-sm px-3 py-2">Post</button>
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}
