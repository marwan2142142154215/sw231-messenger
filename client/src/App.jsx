import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useAuthStore } from './store/authStore'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ChatPage from './pages/ChatPage'
import FeedPage from './pages/FeedPage'
import ProfilePage from './pages/ProfilePage'
import MarketplacePage from './pages/MarketplacePage'
import AdminPanel from './admin/AdminPanel'
import Layout from './components/Layout'

function ProtectedRoute({ children }) {
  const user = useAuthStore(s => s.user)
  const loading = useAuthStore(s => s.loading)
  if (loading) return (
    <div className="h-screen w-screen flex items-center justify-center aurora-bg">
      <div className="flex gap-1">
        <div className="w-3 h-3 rounded-full bg-nyx-400 animate-pulse-dot" style={{ animationDelay: '0s' }} />
        <div className="w-3 h-3 rounded-full bg-neon-cyan animate-pulse-dot" style={{ animationDelay: '0.2s' }} />
        <div className="w-3 h-3 rounded-full bg-nyx-400 animate-pulse-dot" style={{ animationDelay: '0.4s' }} />
      </div>
    </div>
  )
  if (!user) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  const init = useAuthStore(s => s.init)

  React.useEffect(() => {
    init()
  }, [init])

  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: { background: 'rgba(30,20,60,0.9)', color: '#fff', border: '1px solid rgba(124,58,237,0.3)', backdropFilter: 'blur(12px)' },
          success: { iconTheme: { primary: '#06d6a0', secondary: '#fff' } },
          error: { iconTheme: { primary: '#ef476f', secondary: '#fff' } }
        }}
      />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/sawq4e2/*" element={<AdminPanel />} />
        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<Navigate to="/chat" replace />} />
          <Route path="chat" element={<ChatPage />} />
          <Route path="chat/:conversationId" element={<ChatPage />} />
          <Route path="feed" element={<FeedPage />} />
          <Route path="profile/:userId?" element={<ProfilePage />} />
          <Route path="marketplace" element={<MarketplacePage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
