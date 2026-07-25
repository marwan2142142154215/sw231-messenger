import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import axios from 'axios'
import { format } from 'date-fns'

const headers = (token) => ({ headers: { Authorization: `Bearer ${token}` } })

export default function AdminLogs({ token }) {
  const [logs, setLogs] = useState([])

  useEffect(() => {
    axios.get('/api/admin/logs?limit=100', headers(token))
      .then(({ data }) => setLogs(data.logs))
      .catch(() => {})
  }, [token])

  return (
    <div className="space-y-6">
      <h2 className="font-display text-2xl font-bold gradient-text">Admin Logs</h2>
      <div className="space-y-2">
        {logs.map((log, i) => (
          <motion.div key={log.id || i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }} className="glass rounded-xl p-4">
            <div className="flex items-center gap-3">
              <span className="text-xs px-2 py-0.5 rounded-full bg-nyx-600/20 text-nyx-300">{log.action}</span>
              <span className="text-xs text-gray-500">{log.entity_type} / {log.entity_id || 'N/A'}</span>
              <span className="text-xs text-gray-600 ml-auto">{format(new Date(log.created_at), 'MMM d HH:mm:ss')}</span>
            </div>
            {log.details && <p className="text-xs text-gray-400 mt-2 truncate">{log.details}</p>}
          </motion.div>
        ))}
        {logs.length === 0 && <p className="text-gray-500 text-center py-8">No logs yet</p>}
      </div>
    </div>
  )
}
