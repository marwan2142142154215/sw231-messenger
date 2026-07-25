import { useState } from 'react'
import { motion } from 'framer-motion'
import axios from 'axios'

export default function AdminLogin({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const { data } = await axios.post('/api/admin/login', { username, password })
      onLogin(data.token)
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed')
    }
    setLoading(false)
  }

  return (
    <div className="h-screen w-screen aurora-bg flex items-center justify-center">
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="glass-strong rounded-3xl p-8 max-w-sm w-full space-y-6">
        <div className="text-center">
          <h1 className="font-display text-3xl font-bold gradient-text">Admin Panel</h1>
          <p className="text-gray-400 text-sm mt-1">NYXORA Management</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          <input type="text" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} className="input-field" required />
          <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className="input-field" required />
          {error && <p className="text-neon-pink text-sm text-center">{error}</p>}
          <button type="submit" disabled={loading} className="w-full btn-primary py-3 disabled:opacity-50">
            {loading ? 'Authenticating...' : 'Access Panel'}
          </button>
        </form>
      </motion.div>
    </div>
  )
}
