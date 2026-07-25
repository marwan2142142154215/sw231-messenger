import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import axios from 'axios'
import toast from 'react-hot-toast'

const headers = (token) => ({ headers: { Authorization: `Bearer ${token}` } })

export default function AdminFlags({ token }) {
  const [flags, setFlags] = useState([])

  useEffect(() => {
    axios.get('/api/admin/dashboard', headers(token))
      .then(({ data }) => setFlags(data.featureFlags || []))
      .catch(() => {})
  }, [token])

  const toggleFlag = async (key, current) => {
    try {
      await axios.put(`/api/admin/flags/${key}`, { enabled: !current }, headers(token))
      setFlags(flags.map(f => f.key === key ? { ...f, enabled: !current ? 1 : 0 } : f))
      toast.success('Flag updated')
    } catch { toast.error('Failed') }
  }

  return (
    <div className="space-y-6">
      <h2 className="font-display text-2xl font-bold gradient-text">Feature Flags</h2>
      <div className="space-y-2">
        {flags.map((flag, i) => (
          <motion.div key={flag.key} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">{flag.key}</p>
              <p className="text-xs text-gray-500">{flag.description || 'No description'}</p>
            </div>
            <button
              onClick={() => toggleFlag(flag.key, flag.enabled)}
              className={`w-12 h-6 rounded-full transition-all ${flag.enabled ? 'bg-neon-cyan' : 'bg-gray-600'} relative`}
            >
              <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all ${flag.enabled ? 'left-6' : 'left-0.5'}`} />
            </button>
          </motion.div>
        ))}
        {flags.length === 0 && <p className="text-gray-500 text-center py-8">No feature flags defined</p>}
      </div>
    </div>
  )
}
