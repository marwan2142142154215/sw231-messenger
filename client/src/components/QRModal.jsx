import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { QRCodeSVG } from 'qrcode.react'
import { Html5QrcodeScanner } from 'html5-qrcode'
import api from '../services/api'
import toast from 'react-hot-toast'

export default function QRModal({ onClose }) {
  const [tab, setTab] = useState('show')
  const [qrToken, setQrToken] = useState(null)

  useEffect(() => {
    if (tab === 'show') {
      api.get('/friends/qr').then(({ data }) => setQrToken(data)).catch(() => toast.error('Failed to generate QR'))
    }
  }, [tab])

  useEffect(() => {
    if (tab === 'scan') {
      const scanner = new Html5QrcodeScanner('qr-reader', { fps: 10, qrbox: { width: 250, height: 250 } }, false)
      scanner.render(
        async (decodedText) => {
          scanner.clear().catch(() => {})
          try {
            await api.post('/friends/scan', { qrToken: decodedText })
            toast.success('Friend added!')
            onClose()
          } catch (err) {
            toast.error(err.response?.data?.error || 'Invalid QR code')
          }
        },
        () => {}
      )
      return () => scanner.clear().catch(() => {})
    }
  }, [tab, onClose])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="glass-strong rounded-2xl p-6 max-w-sm w-full space-y-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center">
          <h2 className="font-display text-lg font-semibold gradient-text">Add Friend</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">✕</button>
        </div>

        <div className="flex gap-2">
          <button onClick={() => setTab('show')} className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${tab === 'show' ? 'bg-nyx-600/30 text-nyx-300' : 'text-gray-400 hover:text-white'}`}>My QR</button>
          <button onClick={() => setTab('scan')} className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${tab === 'scan' ? 'bg-nyx-600/30 text-nyx-300' : 'text-gray-400 hover:text-white'}`}>Scan</button>
        </div>

        {tab === 'show' && qrToken && (
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="bg-white p-4 rounded-2xl">
              <QRCodeSVG value={qrToken.token || qrToken.id || 'NYXORA'} size={200} />
            </div>
            <p className="text-xs text-gray-400 text-center">Show this QR code to your friend to add them</p>
            <p className="text-[10px] text-gray-500">Expires in 5 minutes</p>
          </div>
        )}

        {tab === 'scan' && (
          <div className="py-4">
            <div id="qr-reader" className="rounded-xl overflow-hidden" />
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}
