import { create } from 'zustand'
import api from '../services/api'
import { v4 as uuidv4 } from 'uuid'
import toast from 'react-hot-toast'

export const useChatStore = create((set, get) => ({
  conversations: [],
  activeConversation: null,
  messages: [],
  onlineUsers: new Set(),
  typingUsers: {},
  friends: [],

  loadConversations: async () => {
    try {
      const { data } = await api.get('/conversations')
      console.log('[CHAT] Loaded conversations:', (data.conversations || []).length)
      set({ conversations: data.conversations || [] })
    } catch (err) {
      console.error('[CHAT] Failed to load conversations:', err.response?.data || err.message)
    }
  },

  loadFriends: async () => {
    try {
      const { data } = await api.get('/friends')
      set({ friends: data.friends || [] })
    } catch {}
  },

  searchUsers: async (query) => {
    try {
      const { data } = await api.get(`/users/search?q=${encodeURIComponent(query)}`)
      return data.users || []
    } catch {
      return []
    }
  },

  setActiveConversation: async (conversation) => {
    set({ activeConversation: conversation, messages: [] })
    if (conversation) {
      try {
        const { data } = await api.get(`/messages/${conversation.id}`)
        set({ messages: data.messages || [] })
      } catch (err) {
        console.error('[CHAT] Failed to load messages:', err.response?.data || err.message)
        toast.error('Failed to load messages: ' + (err.response?.data?.error || err.message))
      }
    }
  },

  sendMessage: (conversationId, content, replyTo, user, emit) => {
    const tempId = uuidv4()
    const now = new Date().toISOString()
    const optimisticMsg = {
      id: tempId, conversation_id: conversationId, sender_id: user.id,
      content, type: 'text', reply_to: replyTo?.id || null,
      username: user.username, display_name: user.display_name,
      avatar_url: user.avatar_url, is_edited: 0, is_deleted: 0,
      created_at: now, reactions: [], replyTo: replyTo || null,
      _sending: true
    }
    const { messages, conversations } = get()
    set({
      messages: [...messages, optimisticMsg],
      conversations: conversations.map(c =>
        c.id === conversationId
          ? { ...c, lastMessage: content, lastMessageTime: now }
          : c
      )
    })
    emit('message:send', { conversationId, content, replyTo: replyTo?.id || null, tempId })
    return tempId
  },

  addMessage: (message) => {
    const { messages, conversations } = get()
    const exists = messages.find(m => m.id === message.id)
    if (exists) {
      if (exists._sending) {
        set({ messages: messages.map(m => m.id === message.id ? { ...message, _sending: false, _failed: false } : m) })
      }
      return
    }
    set({
      messages: [...messages, message],
      conversations: conversations.map(c =>
        c.id === message.conversation_id
          ? { ...c, lastMessage: message.content, lastMessageTime: message.created_at }
          : c
      )
    })
  },

  markMessageFailed: (tempId) => {
    const { messages } = get()
    set({ messages: messages.map(m => m.id === tempId ? { ...m, _sending: false, _failed: true } : m) })
  },

  retryMessage: (tempId, conversationId, content, replyTo, user, emit) => {
    const { messages } = get()
    const msg = messages.find(m => m.id === tempId)
    if (!msg) return
    const newTempId = uuidv4()
    set({
      messages: messages.filter(m => m.id !== tempId).concat([{
        ...msg, id: newTempId, _sending: true, _failed: false, created_at: new Date().toISOString()
      }]).sort((a, b) => a.created_at < b.created_at ? -1 : 1)
    })
    emit('message:send', { conversationId, content, replyTo: replyTo?.id || null, tempId: newTempId })
  },

  updateMessage: (messageId, updates) => {
    set({ messages: get().messages.map(m => m.id === messageId ? { ...m, ...updates } : m) })
  },

  removeMessage: (messageId) => {
    set({ messages: get().messages.filter(m => m.id !== messageId) })
  },

  setOnlineUsers: (users) => set({ onlineUsers: new Set(users) }),

  setTyping: (conversationId, userId, isTyping) => {
    const { typingUsers } = get()
    const convTyping = typingUsers[conversationId] || new Set()
    if (isTyping) convTyping.add(userId)
    else convTyping.delete(userId)
    set({ typingUsers: { ...typingUsers, [conversationId]: convTyping } })
  },

  createConversation: async (participantId) => {
    try {
      const { data } = await api.post('/conversations/private', { userId: participantId })
      const conversationId = data.conversationId
      const { conversations } = get()
      let conv = conversations.find(c => c.id === conversationId)
      if (!conv) {
        await get().loadConversations()
        const refreshed = get().conversations
        conv = refreshed.find(c => c.id === conversationId)
      }
      if (!conv) {
        conv = { id: conversationId, type: 'private', members: data.members || [], name: null }
      }
      return conv
    } catch (err) {
      throw new Error(err.response?.data?.error || 'Failed to create conversation')
    }
  },

  clearSearchResults: () => {}
}))
