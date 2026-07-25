import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import axios from 'axios'
import toast from 'react-hot-toast'

const headers = (token) => ({ headers: { Authorization: `Bearer ${token}` } })

export default function AdminUsers({ token }) {
  const [users, setUsers] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  const loadUsers = async () => {
    setLoading(true)
    try {
      const { data } = await axios.get('/api/admin/users?limit=100', headers(token))
      setUsers(data.users)
      setTotal(data.total)
    } catch {}
    setLoading(false)
  }

  useEffect(() => { loadUsers() }, [token])

  const handleAction = async (userId, action) => {
    try {
      if (action === 'delete') {
        if (!confirm('Delete this user?')) return
        await axios.delete(`/api/admin/users/${userId}`, headers(token))
        toast.success('User deleted')
        loadUsers()
      } else if (action === 'reset') {
        const { data } = await axios.post(`/api/admin/users/${userId}/reset-password`, {}, headers(token))
        toast.success(`New password: ${data.newPassword}`)
      } else if (action === 'toggle') {
        const user = users.find(u => u.id === userId)
        await axios.put(`/api/admin/users/${userId}`, { isApproved: !user.is_approved }, headers(token))
        toast.success('Updated')
        loadUsers()
      }
    } catch { toast.error('Action failed') }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-bold gradient-text">Users ({total})</h2>
      </div>
      {loading ? <p className="text-gray-500">Loading...</p> : (
        <div className="space-y-2">
          {users.map(user => (
            <motion.div key={user.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass rounded-xl p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-nyx-500 to-neon-purple flex items-center justify-center text-sm font-bold">
                {user.username?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{user.username}</p>
                <p className="text-xs text-gray-500">Role: {user.role} | {user.is_approved ? 'Approved' : 'Pending'}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleAction(user.id, 'toggle')} className="text-xs px-3 py-1.5 glass rounded-lg hover:bg-white/10">{user.is_approved ? 'Revoke' : 'Approve'}</button>
                <button onClick={() => handleAction(user.id, 'reset')} className="text-xs px-3 py-1.5 glass rounded-lg hover:bg-white/10 text-neon-yellow">Reset PW</button>
                <button onClick={() => handleAction(user.id, 'delete')} className="text-xs px-3 py-1.5 glass rounded-lg hover:bg-white/10 text-neon-pink">Delete</button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
