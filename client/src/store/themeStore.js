import { create } from 'zustand'

const DEFAULT_THEME = {
  name: 'Aurora',
  bg: '',
  bgType: 'gradient',
  bgColor1: '#1a0536',
  bgColor2: '#0f0c29',
  bgColor3: '#302b63',
  bgColor4: '#24243e',
  bgUrl: '',
  chatBg: 'rgba(255,255,255,0.03)',
  sidebarBg: 'rgba(255,255,255,0.08)',
  textPrimary: '#ffffff',
  textSecondary: '#9ca3af',
  accentColor: '#7c3aed',
  bubbleSent: 'linear-gradient(135deg, #6d28d9, #5b21b6)',
  bubbleReceived: 'rgba(255,255,255,0.06)',
  borderRadius: '16px'
}

const THEMES = {
  aurora: DEFAULT_THEME,
  midnight: {
    name: 'Midnight',
    bg: '', bgType: 'gradient',
    bgColor1: '#000000', bgColor2: '#1a1a2e', bgColor3: '#16213e', bgColor4: '#0f3460',
    bgUrl: '', chatBg: 'rgba(255,255,255,0.02)', sidebarBg: 'rgba(255,255,255,0.05)',
    textPrimary: '#e2e8f0', textSecondary: '#94a3b8', accentColor: '#3b82f6',
    bubbleSent: 'linear-gradient(135deg, #1e40af, #1d4ed8)', bubbleReceived: 'rgba(255,255,255,0.04)',
    borderRadius: '12px'
  },
  neon: {
    name: 'Neon',
    bg: '', bgType: 'gradient',
    bgColor1: '#0a0a0a', bgColor2: '#1a0a2e', bgColor3: '#0a1a2e', bgColor4: '#0a0a1a',
    bgUrl: '', chatBg: 'rgba(0,0,0,0.3)', sidebarBg: 'rgba(0,0,0,0.5)',
    textPrimary: '#00ff88', textSecondary: '#00cc6a', accentColor: '#00ff88',
    bubbleSent: 'linear-gradient(135deg, #00cc6a, #00aa55)', bubbleReceived: 'rgba(0,255,136,0.05)',
    borderRadius: '8px'
  },
  sunset: {
    name: 'Sunset',
    bg: '', bgType: 'gradient',
    bgColor1: '#1a0a0a', bgColor2: '#2d1b1b', bgColor3: '#4a1a2e', bgColor4: '#1a0a2e',
    bgUrl: '', chatBg: 'rgba(255,200,200,0.03)', sidebarBg: 'rgba(255,150,150,0.06)',
    textPrimary: '#ffecd2', textSecondary: '#fcb69f', accentColor: '#ff6b6b',
    bubbleSent: 'linear-gradient(135deg, #ee5a24, #e74c3c)', bubbleReceived: 'rgba(255,107,107,0.06)',
    borderRadius: '20px'
  },
  ocean: {
    name: 'Ocean',
    bg: '', bgType: 'gradient',
    bgColor1: '#0a192f', bgColor2: '#112240', bgColor3: '#1d3557', bgColor4: '#0a192f',
    bgUrl: '', chatBg: 'rgba(100,200,255,0.03)', sidebarBg: 'rgba(100,200,255,0.05)',
    textPrimary: '#ccd6f6', textSecondary: '#8892b0', accentColor: '#64ffda',
    bubbleSent: 'linear-gradient(135deg, #064663, #048a81)', bubbleReceived: 'rgba(100,255,218,0.04)',
    borderRadius: '14px'
  },
  dark: {
    name: 'Pure Dark',
    bg: '', bgType: 'solid',
    bgColor1: '#0a0a0a', bgColor2: '#0a0a0a', bgColor3: '#0a0a0a', bgColor4: '#0a0a0a',
    bgUrl: '', chatBg: 'transparent', sidebarBg: 'rgba(255,255,255,0.03)',
    textPrimary: '#ffffff', textSecondary: '#666666', accentColor: '#7c3aed',
    bubbleSent: 'linear-gradient(135deg, #7c3aed, #6d28d9)', bubbleReceived: 'rgba(255,255,255,0.05)',
    borderRadius: '16px'
  }
}

function loadTheme() {
  try {
    const saved = localStorage.getItem('nyxora_theme')
    if (saved) return JSON.parse(saved)
  } catch {}
  return DEFAULT_THEME
}

export const useThemeStore = create((set, get) => ({
  theme: loadTheme(),
  customImage: null,

  setTheme: (theme) => {
    set({ theme })
    localStorage.setItem('nyxora_theme', JSON.stringify(theme))
  },

  setPreset: (key) => {
    const theme = THEMES[key] || DEFAULT_THEME
    set({ theme, customImage: null })
    localStorage.setItem('nyxora_theme', JSON.stringify(theme))
  },

  setBackgroundUrl: (url) => {
    const theme = { ...get().theme, bgUrl: url, bgType: 'image' }
    set({ theme, customImage: url })
    localStorage.setItem('nyxora_theme', JSON.stringify(theme))
  },

  setBackgroundImage: (file) => {
    const url = URL.createObjectURL(file)
    const theme = { ...get().theme, bgUrl: url, bgType: 'image' }
    set({ theme, customImage: url })
    localStorage.setItem('nyxora_theme', JSON.stringify(theme))
  },

  clearBackground: () => {
    const theme = { ...get().theme, bgUrl: '', bgType: 'gradient' }
    set({ theme, customImage: null })
    localStorage.setItem('nyxora_theme', JSON.stringify(theme))
  },

  resetTheme: () => {
    set({ theme: DEFAULT_THEME, customImage: null })
    localStorage.setItem('nyxora_theme', JSON.stringify(DEFAULT_THEME))
  }
}))

export { THEMES }
