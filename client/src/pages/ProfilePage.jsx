import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuthStore } from '../store/authStore'
import api from '../services/api'
import toast from 'react-hot-toast'

export default function ProfilePage() {
  const { userId } = useParams()
  const currentUser = useAuthStore(s => s.user)
  const updateProfile = useAuthStore(s => s.updateProfile)
  const [profile, setProfile] = useState(null)
  const [editing, setEditing] = useState(false)
  const [bio, setBio] = useState('')
  const [avatarPreview, setAvatarPreview] = useState(null)
  const avatarRef = useState(null)
  const isOwn = !userId || userId === currentUser?.id

  useEffect(() => {
    if (isOwn) {
      setProfile(currentUser)
      setBio(currentUser?.bio || '')
    } else {
      api.get(`/users/${userId}`).then(({ data }) => setProfile(data.user)).catch(() => toast.error('User not found'))
    }
  }, [userId, currentUser, isOwn])

  const handleSave = async () => {
    try {
      await updateProfile({ bio })
      setEditing(false)
      toast.success('Profile updated!')
    } catch (err) { toast.error(err.message) }
  }

  const handleAvatar = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const formData = new FormData()
    formData.append('file', file)
    try {
      const { data } = await api.post('/media/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      await updateProfile({ avatar_url: data.url })
      setAvatarPreview(data.url)
      toast.success('Avatar updated!')
    } catch { toast.error('Upload failed') }
  }

  if (!profile) return <div className="h-full flex items-center justify-center"><div className="animate-pulse text-gray-500">Loading...</div></div>

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative group">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-nyx-500 to-neon-cyan flex items-center justify-center text-2xl font-bold overflow-hidden">
                {avatarPreview || profile.avatar_url ? (
                  <img src={avatarPreview || profile.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : profile.username?.charAt(0).toUpperCase()
                }
              </div>
              {isOwn && (
                <>
                  <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={handleAvatar} />
                  <button onClick={() => avatarRef.current?.click()} className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  </button>
                </>
              )}
            </div>
            <div className="flex-1">
              <h1 className="font-display text-xl font-bold">{profile.username}</h1>
              <p className="text-sm text-gray-400">{profile.email}</p>
              <p className="text-xs text-gray-500 mt-1">Joined {new Date(profile.created_at).toLocaleDateString()}</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-400">Bio</h3>
              {isOwn && (
                <button onClick={() => editing ? handleSave() : setEditing(true)} className="text-xs text-nyx-400 hover:text-nyx-300">
                  {editing ? 'Save' : 'Edit'}
                </button>
              )}
            </div>
            {editing ? (
              <textarea value={bio} onChange={e => setBio(e.target.value)} className="input-field resize-none" rows={3} placeholder="Write something about yourself..." />
            ) : (
              <p className="text-sm text-gray-300">{profile.bio || 'No bio yet'}</p>
            )}
          </div>

          <div className="flex gap-6 pt-4 border-t border-white/5">
            <div className="text-center">
              <p className="font-bold text-lg">{profile.posts_count || 0}</p>
              <p className="text-xs text-gray-500">Posts</p>
            </div>
            <div className="text-center">
              <p className="font-bold text-lg">{profile.followers_count || 0}</p>
              <p className="text-xs text-gray-500">Followers</p>
            </div>
            <div className="text-center">
              <p className="font-bold text-lg">{profile.following_count || 0}</p>
              <p className="text-xs text-gray-500">Following</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
