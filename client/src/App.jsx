import { useEffect, Component } from 'react'
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

class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { hasError: false } }
  static getDerivedStateFromError() { return { hasError: true } }
  componentDidCatch(err) { console.error('[ERROR BOUNDARY]', err) }
  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-screen flex items-center justify-center aurora-bg">
          <div className="glass rounded-2xl p-8 max-w-sm text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
            </div>
            <h2 className="font-display text-lg font-semibold text-white">Something went wrong</h2>
            <p className="text-gray-400 text-sm">An unexpected error occurred. Try refreshing the page.</p>
            <button onClick={() => { this.setState({ hasError: false }); window.location.reload() }} className="btn-primary text-sm px-4 py-2">Reload</button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

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

  useEffect(() => {
    init()
  }, [init])

  return (
    <ErrorBoundary>
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
    </ErrorBoundary>
  )
}
