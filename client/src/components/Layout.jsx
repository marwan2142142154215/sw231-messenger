import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '../store/authStore'
import { useChatStore } from '../store/chatStore'
import { useThemeStore } from '../store/themeStore'
import { useSocket } from '../hooks/useSocket'
import { socketEmit } from '../services/socket'
import ThemeSettings from './ThemeSettings'
import { useEffect, useState } from 'react'

const navItems = [
  { path: '/chat', label: 'Chat', icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z' },
  { path: '/feed', label: 'Feed', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { path: '/marketplace', label: 'Shop', icon: 'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z' },
  { path: '/profile', label: 'Profile', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
]

function getBackgroundStyle(theme) {
  if (theme.bgType === 'image' && theme.bgUrl) {
    return { backgroundImage: `url(${theme.bgUrl})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }
  }
  if (theme.bgType === 'solid') {
    return { backgroundColor: theme.bgColor1 }
  }
  return { background: `linear-gradient(-45deg, ${theme.bgColor1}, ${theme.bgColor2}, ${theme.bgColor3}, ${theme.bgColor4})`, backgroundSize: '400% 400%', animation: 'aurora 15s ease infinite' }
}

export default function Layout() {
  const user = useAuthStore(s => s.user)
  const logout = useAuthStore(s => s.logout)
  const loadConversations = useChatStore(s => s.loadConversations)
  const loadFriends = useChatStore(s => s.loadFriends)
  const navigate = useNavigate()
  useSocket()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [showTheme, setShowTheme] = useState(false)
  const theme = useThemeStore(s => s.theme)

  useEffect(() => {
    loadConversations()
    loadFriends()
  }, [loadConversations, loadFriends])

  useEffect(() => {
    if (user) socketEmit('set_status', { status: 'online' })
  }, [user])

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const bgStyle = getBackgroundStyle(theme)

  return (
    <div className="h-screen w-screen flex overflow-hidden" style={bgStyle}>
      <motion.aside
        initial={{ x: -280 }}
        animate={{ x: sidebarOpen ? 0 : -280 }}
        className="w-72 h-full flex flex-col z-20 shrink-0"
        style={{ backgroundColor: theme.sidebarBg, backdropFilter: 'blur(20px)', borderRight: '1px solid rgba(255,255,255,0.08)' }}
      >
        <div className="p-4 border-b border-white/10">
          <h1 className="font-display text-2xl font-bold gradient-text">NYXORA</h1>
          <p className="text-xs mt-1" style={{ color: theme.textSecondary }}>Welcome, {user?.username}</p>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'text-white'
                    : 'hover:bg-white/5'
                }`
              }
              style={({ isActive }) => isActive ? { backgroundColor: `${theme.accentColor}30`, color: theme.accentColor } : { color: theme.textSecondary }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
              </svg>
              <span className="font-medium">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-white/10 space-y-1">
          <button onClick={() => setShowTheme(true)} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:text-nyx-400 hover:bg-white/5 transition-all">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
            </svg>
            <span className="font-medium text-sm">Theme</span>
          </button>
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:text-neon-pink hover:bg-neon-pink/10 transition-all">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="font-medium text-sm">Logout</span>
          </button>
        </div>
      </motion.aside>

      <button onClick={() => setSidebarOpen(!sidebarOpen)} className="fixed top-4 left-4 z-30 w-10 h-10 glass rounded-xl flex items-center justify-center hover:bg-white/10 transition-all">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d={sidebarOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'} />
        </svg>
      </button>

      <main className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div key={location.pathname} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="h-full">
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {showTheme && <ThemeSettings onClose={() => setShowTheme(false)} />}
      </AnimatePresence>
    </div>
  )
}
