import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import axios from 'axios'
import toast from 'react-hot-toast'

const headers = (token) => ({ headers: { Authorization: `Bearer ${token}` } })

export default function AdminUsers({ token }) {
  const [users, setUsers] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ username: '', password: '', displayName: '', email: '' })
  const [selectedUser, setSelectedUser] = useState(null)

  const loadUsers = async () => {
    setLoading(true)
    try {
      const q = filter ? `?filter=${filter}&limit=100` : '?limit=100'
      const { data } = await axios.get(`/api/admin/users${q}`, headers(token))
      setUsers(data.users)
      setTotal(data.total)
    } catch {}
    setLoading(false)
  }

  useEffect(() => { loadUsers() }, [token, filter])

  const handleAddUser = async () => {
    if (!form.username || !form.password) { toast.error('Username & password required'); return }
    try {
      await axios.post('/api/admin/users', form, headers(token))
      toast.success('User created!')
      setForm({ username: '', password: '', displayName: '', email: '' })
      setShowAdd(false)
      loadUsers()
    } catch (err) { toast.error(err.response?.data?.error || 'Failed') }
  }

  const handleAction = async (userId, action) => {
    try {
      if (action === 'approve') {
        await axios.post(`/api/admin/users/${userId}/approve`, {}, headers(token))
        toast.success('User approved')
      } else if (action === 'reject') {
        await axios.post(`/api/admin/users/${userId}/reject`, {}, headers(token))
        toast.success('User rejected')
      } else if (action === 'delete') {
        if (!confirm('Delete this user permanently?')) return
        await axios.delete(`/api/admin/users/${userId}`, headers(token))
        toast.success('User deleted')
      } else if (action === 'reset') {
        const { data } = await axios.post(`/api/admin/users/${userId}/reset-password`, {}, headers(token))
        toast.success(`New password: ${data.newPassword}`, { duration: 10000 })
      }
      loadUsers()
    } catch { toast.error('Action failed') }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="font-display text-2xl font-bold gradient-text">Users ({total})</h2>
        <div className="flex gap-2">
          <select value={filter} onChange={e => setFilter(e.target.value)} className="input-field text-sm py-2 w-40">
            <option value="">All Users</option>
            <option value="pending">Pending Approval</option>
            <option value="active">Online</option>
          </select>
          <button onClick={() => setShowAdd(!showAdd)} className="btn-primary text-sm px-4 py-2">
            {showAdd ? 'Cancel' : '+ Add User'}
          </button>
        </div>
      </div>

      {showAdd && (
        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="glass rounded-2xl p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input type="text" placeholder="Username" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} className="input-field text-sm" />
            <input type="password" placeholder="Password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className="input-field text-sm" />
            <input type="text" placeholder="Display Name" value={form.displayName} onChange={e => setForm({ ...form, displayName: e.target.value })} className="input-field text-sm" />
            <input type="email" placeholder="Email (optional)" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="input-field text-sm" />
          </div>
          <button onClick={handleAddUser} className="btn-primary text-sm w-full">Create User</button>
        </motion.div>
      )}

      {loading ? <p className="text-gray-500 text-center py-8">Loading...</p> : (
        <div className="space-y-2">
          {users.map(user => (
            <motion.div key={user.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass rounded-xl p-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-nyx-500 to-neon-purple flex items-center justify-center text-sm font-bold shrink-0">
                  {user.username?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-sm">{user.username}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                      user.is_approved === 1 ? 'bg-neon-cyan/20 text-neon-cyan' :
                      user.is_approved === -1 ? 'bg-neon-pink/20 text-neon-pink' :
                      'bg-neon-yellow/20 text-neon-yellow'
                    }`}>
                      {user.is_approved === 1 ? 'Approved' : user.is_approved === -1 ? 'Rejected' : 'Pending'}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                      user.status === 'online' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-500'
                    }`}>
                      {user.status || 'offline'}
                    </span>
                    {user.role !== 'user' && <span className="text-[10px] px-2 py-0.5 rounded-full bg-nyx-500/20 text-nyx-300">{user.role}</span>}
                  </div>
                  <div className="flex gap-4 mt-1 text-xs text-gray-500 flex-wrap">
                    {user.email && <span>{user.email}</span>}
                    {user.last_ip && <span title="Last IP">IP: {user.last_ip}</span>}
                    {user.last_device && <span title="Last Device">{user.last_device}</span>}
                    {user.location && <span>{user.location}</span>}
                  </div>
                </div>
                <div className="flex gap-1.5 shrink-0 flex-wrap justify-end">
                  {user.is_approved === 0 && (
                    <>
                      <button onClick={() => handleAction(user.id, 'approve')} className="text-xs px-3 py-1.5 rounded-lg bg-neon-cyan/20 text-neon-cyan hover:bg-neon-cyan/30 transition-all">Approve</button>
                      <button onClick={() => handleAction(user.id, 'reject')} className="text-xs px-3 py-1.5 rounded-lg bg-neon-pink/20 text-neon-pink hover:bg-neon-pink/30 transition-all">Reject</button>
                    </>
                  )}
                  <button onClick={() => setSelectedUser(selectedUser?.id === user.id ? null : user)} className="text-xs px-3 py-1.5 glass rounded-lg hover:bg-white/10">Info</button>
                  <button onClick={() => handleAction(user.id, 'reset')} className="text-xs px-3 py-1.5 glass rounded-lg hover:bg-white/10 text-neon-yellow">Reset PW</button>
                  <button onClick={() => handleAction(user.id, 'delete')} className="text-xs px-3 py-1.5 glass rounded-lg hover:bg-white/10 text-neon-pink">Delete</button>
                </div>
              </div>

              {selectedUser?.id === user.id && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="mt-3 pt-3 border-t border-white/5 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div><span className="text-gray-500">User ID:</span><p className="font-mono text-gray-300 break-all">{user.id}</p></div>
                  <div><span className="text-gray-500">Email:</span><p className="text-gray-300">{user.email || '-'}</p></div>
                  <div><span className="text-gray-500">Display Name:</span><p className="text-gray-300">{user.display_name}</p></div>
                  <div><span className="text-gray-500">Role:</span><p className="text-gray-300">{user.role}</p></div>
                  <div><span className="text-gray-500">Last IP:</span><p className="font-mono text-gray-300">{user.last_ip || user.ip_address || '-'}</p></div>
                  <div><span className="text-gray-500">Last Device:</span><p className="text-gray-300">{user.last_device || user.device_info || '-'}</p></div>
                  <div><span className="text-gray-500">Location:</span><p className="text-gray-300">{user.location || '-'}</p></div>
                  <div><span className="text-gray-500">Registered:</span><p className="text-gray-300">{user.created_at ? new Date(user.created_at).toLocaleString() : '-'}</p></div>
                  <div><span className="text-gray-500">Last Seen:</span><p className="text-gray-300">{user.last_seen ? new Date(user.last_seen).toLocaleString() : '-'}</p></div>
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
