import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import axios from 'axios'

const headers = (token) => ({ headers: { Authorization: `Bearer ${token}` } })

const StatCard = ({ label, value, color, icon }) => (
  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl p-5">
    <div className="flex items-center gap-3">
      {icon}
      <div>
        <p className="text-gray-400 text-sm">{label}</p>
        <p className={`font-display text-3xl font-bold mt-1 ${color}`}>{value}</p>
      </div>
    </div>
  </motion.div>
)

export default function AdminDashboard({ token }) {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    axios.get('/api/admin/dashboard', headers(token))
      .then(({ data }) => setStats(data.stats))
      .catch(() => {})
  }, [token])

  if (!stats) return <div className="text-gray-500 text-center py-20">Loading dashboard...</div>

  return (
    <div className="space-y-6">
      <h2 className="font-display text-2xl font-bold gradient-text">Dashboard</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Users" value={stats.totalUsers} color="text-nyx-400" />
        <StatCard label="Total Messages" value={stats.totalMessages} color="text-neon-cyan" />
        <StatCard label="Total Posts" value={stats.totalPosts} color="text-neon-purple" />
        <StatCard label="Active Now" value={stats.activeUsers} color="text-green-400" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard label="Pending Approval" value={stats.pendingApproval || 0} color="text-neon-yellow" />
        <StatCard label="Today's Messages" value={stats.todayMessages} color="text-neon-pink" />
        <StatCard label="New Users Today" value={stats.todayUsers} color="text-nyx-300" />
      </div>
    </div>
  )
}
