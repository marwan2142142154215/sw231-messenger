import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, useMotionValue, useTransform, useSpring } from 'framer-motion'
import { useAuthStore } from '../store/authStore'
import toast from 'react-hot-toast'

function Particles() {
  const canvasRef = useRef(null)
  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    let animId
    const particles = []
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight }
    resize()
    window.addEventListener('resize', resize)
    for (let i = 0; i < 60; i++) {
      particles.push({
        x: Math.random() * canvas.width, y: Math.random() * canvas.height,
        size: Math.random() * 3 + 1, speedX: (Math.random() - 0.5) * 0.5, speedY: (Math.random() - 0.5) * 0.5,
        opacity: Math.random() * 0.5 + 0.1,
        color: ['#7c3aed', '#06d6a0', '#ef476f', '#9b5de5'][Math.floor(Math.random() * 4)]
      })
    }
    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      particles.forEach(p => {
        p.x += p.speedX; p.y += p.speedY
        if (p.x < 0) p.x = canvas.width; if (p.x > canvas.width) p.x = 0
        if (p.y < 0) p.y = canvas.height; if (p.y > canvas.height) p.y = 0
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = p.color; ctx.globalAlpha = p.opacity; ctx.fill()
      })
      ctx.globalAlpha = 1; animId = requestAnimationFrame(animate)
    }
    animate()
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize) }
  }, [])
  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />
}

export default function RegisterPage() {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [shake, setShake] = useState(false)
  const register = useAuthStore(s => s.register)
  const navigate = useNavigate()

  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  const rotateX = useSpring(useTransform(mouseY, [-300, 300], [5, -5]), { stiffness: 150, damping: 20 })
  const rotateY = useSpring(useTransform(mouseX, [-300, 300], [-5, 5]), { stiffness: 150, damping: 20 })

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    mouseX.set(e.clientX - rect.left - rect.width / 2)
    mouseY.set(e.clientY - rect.top - rect.height / 2)
  }

  const [pending, setPending] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (username.length < 3) { toast.error('Username must be 3+ characters'); return }
    if (password.length < 6) { toast.error('Password must be 6+ characters'); return }
    setLoading(true)
    try {
      await register(username, email, password)
      setPending(true)
    } catch (err) {
      setShake(true)
      setTimeout(() => setShake(false), 500)
      toast.error(err.message)
    }
    setLoading(false)
  }

  return (
    <div className="h-screen w-screen aurora-bg flex items-center justify-center overflow-hidden relative">
      <Particles />
      <motion.div
        animate={{ x: [0, 100, -50, 0], y: [0, -80, 60, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-1/3 left-1/3 w-72 h-72 bg-nyx-600/15 rounded-full blur-3xl"
      />
      <motion.div
        animate={{ x: [0, -80, 40, 0], y: [0, 60, -100, 0] }}
        transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute bottom-1/3 right-1/3 w-64 h-64 bg-neon-pink/10 rounded-full blur-3xl"
      />

      <motion.div
        onMouseMove={handleMouseMove}
        style={{ rotateX, rotateY, perspective: 1000 }}
        className={`relative z-10 w-full max-w-md p-8 ${shake ? 'animate-shake' : ''}`}
      >
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="glass-strong rounded-3xl p-8 space-y-6"
        >
          {pending ? (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-4 py-6">
              <div className="w-16 h-16 rounded-full bg-neon-yellow/20 flex items-center justify-center mx-auto">
                <svg className="w-8 h-8 text-neon-yellow" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="font-display text-xl font-bold text-neon-yellow">Pending Approval</h2>
              <p className="text-sm text-gray-400">Your account has been created. Please wait for the admin to approve your account before you can login.</p>
              <Link to="/login" className="inline-block btn-secondary text-sm mt-2">Back to Login</Link>
            </motion.div>
          ) : (
          <>
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-center space-y-2">
            <h1 className="font-display text-4xl font-bold gradient-text">Join NYXORA</h1>
            <p className="text-gray-400 text-sm">Create your encrypted identity</p>
          </motion.div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
              <input type="text" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} className="input-field" required minLength={3} />
            </motion.div>
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}>
              <input type="email" placeholder="Email (optional)" value={email} onChange={e => setEmail(e.target.value)} className="input-field" />
            </motion.div>
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }}>
              <input type="password" placeholder="Password (min 6 chars)" value={password} onChange={e => setPassword(e.target.value)} className="input-field" required minLength={6} />
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
              <button type="submit" disabled={loading} className="w-full btn-primary py-3.5 text-lg disabled:opacity-50">
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                    Creating account...
                  </span>
                ) : 'Create Account'}
              </button>
            </motion.div>
          </form>
          </>
          )}

          {!pending && (
          <p className="text-center text-sm text-gray-400">
            Already have an account?{' '}
            <Link to="/login" className="text-nyx-400 hover:text-nyx-300 font-medium transition-colors">Sign In</Link>
          </p>
          )}
        </motion.div>
      </motion.div>
    </div>
  )
}
