import { useState } from 'react'
import { Routes, Route, Navigate, NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import AdminLogin from './pages/AdminLogin'
import AdminDashboard from './pages/AdminDashboard'
import AdminUsers from './pages/AdminUsers'
import AdminLogs from './pages/AdminLogs'
import AdminFlags from './pages/AdminFlags'
import AdminBroadcast from './pages/AdminBroadcast'

export default function AdminPanel() {
  const [token, setToken] = useState(localStorage.getItem('nyx_admin_token'))

  if (!token) return <AdminLogin onLogin={(t) => { localStorage.setItem('nyx_admin_token', t); setToken(t) }} />

  return (
    <div className="h-screen flex bg-nyx-950">
      <aside className="w-64 glass-strong flex flex-col shrink-0">
        <div className="p-4 border-b border-white/10">
          <h1 className="font-display text-xl font-bold gradient-text">NYXORA Admin</h1>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {[
            { path: '/sawq4e2', label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6', end: true },
            { path: '/sawq4e2/users', label: 'Users', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z', end: false },
            { path: '/sawq4e2/logs', label: 'Logs', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2', end: false },
            { path: '/sawq4e2/flags', label: 'Feature Flags', icon: 'M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2z', end: false },
            { path: '/sawq4e2/broadcast', label: 'Broadcast', icon: 'M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z', end: false },
          ].map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm ${isActive ? 'text-white bg-white/10' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d={item.icon} /></svg>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-white/10">
          <button onClick={() => { localStorage.removeItem('nyx_admin_token'); setToken(null) }} className="w-full text-left px-4 py-3 text-sm text-gray-400 hover:text-neon-pink transition-all">
            Logout
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto p-6">
        <Routes>
          <Route index element={<AdminDashboard token={token} />} />
          <Route path="users" element={<AdminUsers token={token} />} />
          <Route path="logs" element={<AdminLogs token={token} />} />
          <Route path="flags" element={<AdminFlags token={token} />} />
          <Route path="broadcast" element={<AdminBroadcast token={token} />} />
          <Route path="*" element={<Navigate to="/sawq4e2" replace />} />
        </Routes>
      </main>
    </div>
  )
}
