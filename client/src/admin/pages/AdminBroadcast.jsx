import { useState } from 'react'
import { motion } from 'framer-motion'
import axios from 'axios'
import toast from 'react-hot-toast'

const headers = (token) => ({ headers: { Authorization: `Bearer ${token}` } })

export default function AdminBroadcast({ token }) {
  const [content, setContent] = useState('')
  const [sending, setSending] = useState(false)

  const handleBroadcast = async () => {
    if (!content.trim()) { toast.error('Enter message content'); return }
    setSending(true)
    try {
      await axios.post('/api/admin/broadcast', { content }, headers(token))
      toast.success('Broadcast sent!')
      setContent('')
    } catch { toast.error('Broadcast failed') }
    setSending(false)
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h2 className="font-display text-2xl font-bold gradient-text">Broadcast Message</h2>
      <div className="glass rounded-2xl p-6 space-y-4">
        <p className="text-sm text-gray-400">Send a system broadcast to all users.</p>
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="Type broadcast message..."
          rows={5}
          className="input-field resize-none"
        />
        <button onClick={handleBroadcast} disabled={sending} className="btn-primary w-full disabled:opacity-50">
          {sending ? 'Sending...' : 'Send Broadcast'}
        </button>
      </div>
    </div>
  )
}
