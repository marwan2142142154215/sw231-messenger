import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { useThemeStore, THEMES } from '../store/themeStore'
import toast from 'react-hot-toast'

export default function ThemeSettings({ onClose }) {
  const { theme, setPreset, setBackgroundUrl, setBackgroundImage, clearBackground, resetTheme } = useThemeStore()
  const [urlInput, setUrlInput] = useState('')
  const fileRef = useRef(null)
  const [activeTab, setActiveTab] = useState('presets')

  const handleUrlSubmit = () => {
    if (!urlInput.trim()) return
    const url = urlInput.trim()
    const isImage = /\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/i.test(url)
    const isPostimg = /postimg\.cc/i.test(url)
    const isGiphy = /giphy\.com|gph\.to/i.test(url)
    const isImgur = /imgur\.com/i.test(url)

    if (isImage || isPostimg || isGiphy || isImgur) {
      setBackgroundUrl(url)
      toast.success('Background updated!')
      setUrlInput('')
    } else {
      toast.error('Supported: direct image links, postimg.cc, giphy, imgur')
    }
  }

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 50 * 1024 * 1024) { toast.error('Max 50MB'); return }
    if (!file.type.startsWith('image/')) { toast.error('Image only'); return }
    setBackgroundImage(file)
    toast.success('Background updated!')
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="glass-strong rounded-2xl p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center">
          <h2 className="font-display text-lg font-semibold gradient-text">Theme Settings</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">✕</button>
        </div>

        <div className="flex gap-2">
          {['presets', 'custom', 'background'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-2 rounded-xl text-sm font-medium capitalize transition-all ${activeTab === tab ? 'bg-nyx-600/30 text-nyx-300' : 'text-gray-400 hover:text-white'}`}>{tab}</button>
          ))}
        </div>

        {activeTab === 'presets' && (
          <div className="space-y-2">
            {Object.entries(THEMES).map(([key, t]) => (
              <button key={key} onClick={() => { setPreset(key); toast.success(`${t.name} theme applied`) }}
                className={`w-full p-3 rounded-xl flex items-center gap-3 transition-all ${theme.name === t.name ? 'ring-2 ring-nyx-500 bg-white/10' : 'glass hover:bg-white/5'}`}>
                <div className="w-10 h-10 rounded-lg shrink-0" style={{ background: t.bgType === 'gradient' ? `linear-gradient(135deg, ${t.bgColor1}, ${t.bgColor3})` : t.bgColor1 }} />
                <div className="text-left">
                  <p className="text-sm font-medium">{t.name}</p>
                  <p className="text-xs text-gray-500">{t.accentColor}</p>
                </div>
              </button>
            ))}
            <button onClick={() => { resetTheme(); toast.success('Theme reset to Aurora') }} className="w-full py-2 text-sm text-gray-400 hover:text-neon-pink transition-all">Reset to Default</button>
          </div>
        )}

        {activeTab === 'custom' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Accent Color</label>
                <input type="color" value={theme.accentColor} onChange={e => {
                  const t = { ...theme, accentColor: e.target.value }; useThemeStore.getState().setTheme(t)
                }} className="w-full h-10 rounded-xl cursor-pointer bg-transparent" />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Text Color</label>
                <input type="color" value={theme.textPrimary} onChange={e => {
                  const t = { ...theme, textPrimary: e.target.value }; useThemeStore.getState().setTheme(t)
                }} className="w-full h-10 rounded-xl cursor-pointer bg-transparent" />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">BG Color 1</label>
                <input type="color" value={theme.bgColor1} onChange={e => {
                  const t = { ...theme, bgColor1: e.target.value }; useThemeStore.getState().setTheme(t)
                }} className="w-full h-10 rounded-xl cursor-pointer bg-transparent" />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">BG Color 2</label>
                <input type="color" value={theme.bgColor2} onChange={e => {
                  const t = { ...theme, bgColor2: e.target.value }; useThemeStore.getState().setTheme(t)
                }} className="w-full h-10 rounded-xl cursor-pointer bg-transparent" />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'background' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-400">Set a custom background image. Supported: JPG, PNG, GIF, WebP</p>

            <div className="flex gap-2">
              <input type="text" placeholder="Paste image URL (postimg, imgur, giphy...)" value={urlInput} onChange={e => setUrlInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleUrlSubmit()} className="input-field flex-1 text-sm" />
              <button onClick={handleUrlSubmit} className="btn-primary text-sm px-4">Set</button>
            </div>

            <div className="text-center text-gray-500 text-xs">— OR —</div>

            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
            <button onClick={() => fileRef.current?.click()} className="w-full py-3 glass rounded-xl text-sm hover:bg-white/5 transition-all border border-dashed border-white/20">
              Upload from device (max 50MB)
            </button>

            {theme.bgUrl && (
              <div className="relative">
                <img src={theme.bgUrl} alt="" className="w-full h-32 object-cover rounded-xl" />
                <button onClick={clearBackground} className="absolute top-2 right-2 w-6 h-6 glass rounded-full flex items-center justify-center text-xs">✕</button>
              </div>
            )}
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}
