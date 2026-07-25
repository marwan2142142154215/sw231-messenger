import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSocialStore } from '../store/socialStore'
import PostCard from '../components/PostCard'
import StoryBar from '../components/StoryBar'
import toast from 'react-hot-toast'

export default function FeedPage() {
  const feed = useSocialStore(s => s.feed)
  const stories = useSocialStore(s => s.stories)
  const loadFeed = useSocialStore(s => s.loadFeed)
  const loadStories = useSocialStore(s => s.loadStories)
  const createPost = useSocialStore(s => s.createPost)
  const createStory = useSocialStore(s => s.createStory)
  const [newPost, setNewPost] = useState('')
  const [posting, setPosting] = useState(false)
  const storyRef = useRef(null)
  const postImageRef = useRef(null)
  const [imageFile, setImageFile] = useState(null)

  useEffect(() => { loadFeed(); loadStories() }, [loadFeed, loadStories])

  const handlePost = async () => {
    if (!newPost.trim() && !imageFile) return
    setPosting(true)
    try {
      await createPost(newPost, imageFile)
      setNewPost('')
      setImageFile(null)
      toast.success('Posted!')
    } catch { toast.error('Failed to post') }
    setPosting(false)
  }

  const handleStoryUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      await createStory(file)
      toast.success('Story added!')
    } catch { toast.error('Failed to add story') }
  }

  const handlePostImage = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 50 * 1024 * 1024) { toast.error('Max 50MB'); return }
    setImageFile(file)
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <motion.h1 initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="font-display text-2xl font-bold gradient-text">
          Feed
        </motion.h1>

        <StoryBar stories={stories} onAdd={() => storyRef.current?.click()} onView={(s) => toast('Story viewer coming soon')} />
        <input ref={storyRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleStoryUpload} />
        <input ref={postImageRef} type="file" accept="image/*" className="hidden" onChange={handlePostImage} />

        <div className="glass rounded-2xl p-4 space-y-3">
          <textarea
            value={newPost}
            onChange={e => setNewPost(e.target.value)}
            placeholder="What's on your mind?"
            rows={3}
            className="input-field resize-none"
          />
          {imageFile && (
            <div className="relative">
              <img src={URL.createObjectURL(imageFile)} alt="" className="w-full h-40 object-cover rounded-xl" />
              <button onClick={() => setImageFile(null)} className="absolute top-2 right-2 w-6 h-6 glass rounded-full flex items-center justify-center text-xs">✕</button>
            </div>
          )}
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <button onClick={() => postImageRef.current?.click()} className="text-gray-400 hover:text-nyx-400 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </button>
            </div>
            <button onClick={handlePost} disabled={posting || (!newPost.trim() && !imageFile)} className="btn-primary text-sm px-4 py-2 disabled:opacity-30">
              {posting ? 'Posting...' : 'Post'}
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <AnimatePresence>
            {feed.map(post => <PostCard key={post.id} post={post} />)}
          </AnimatePresence>
          {feed.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <p>No posts yet. Be the first to share something!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
