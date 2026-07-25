import { create } from 'zustand'
import api from '../services/api'
import { disconnectSocket, updateSocketToken } from '../services/socket'

export const useAuthStore = create((set, get) => ({
  user: null,
  loading: true,
  error: null,

  init: async () => {
    const token = localStorage.getItem('nyx_access_token')
    if (!token) { set({ loading: false }); return }
    try {
      const { data } = await api.get('/auth/me')
      set({ user: data.user, loading: false })
    } catch {
      localStorage.removeItem('nyx_access_token')
      set({ user: null, loading: false })
    }
  },

  login: async (email, password) => {
    set({ error: null })
    try {
      const { data } = await api.post('/auth/login', { email, password })
      localStorage.setItem('nyx_access_token', data.accessToken)
      set({ user: data.user })
      updateSocketToken()
      return data.user
    } catch (err) {
      const msg = err.response?.data?.error || 'Login failed'
      set({ error: msg })
      throw new Error(msg)
    }
  },

  register: async (username, email, password) => {
    set({ error: null })
    try {
      const { data } = await api.post('/auth/register', { username, email, password })
      if (data.pending) return { pending: true }
      localStorage.setItem('nyx_access_token', data.accessToken)
      set({ user: data.user })
      updateSocketToken()
      return data.user
    } catch (err) {
      const msg = err.response?.data?.error || 'Registration failed'
      set({ error: msg })
      throw new Error(msg)
    }
  },

  logout: async () => {
    try { await api.post('/auth/logout') } catch {}
    localStorage.removeItem('nyx_access_token')
    disconnectSocket()
    set({ user: null })
  },

  updateProfile: async (updates) => {
    try {
      const { data } = await api.put('/users/profile', updates)
      set({ user: { ...get().user, ...data.user } })
      return data.user
    } catch (err) {
      throw new Error(err.response?.data?.error || 'Update failed')
    }
  }
}))
