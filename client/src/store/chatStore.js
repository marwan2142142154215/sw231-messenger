import { create } from 'zustand'
import api from '../services/api'

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
      set({ conversations: data.conversations || [] })
    } catch {}
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
      } catch {}
    }
  },

  addMessage: (message) => {
    const { messages, conversations } = get()
    const exists = messages.find(m => m.id === message.id)
    if (!exists) {
      set({ messages: [...messages, message] })
    }
    set({
      conversations: conversations.map(c =>
        c.id === message.conversation_id
          ? { ...c, lastMessage: message.content, lastMessageTime: message.created_at }
          : c
      )
    })
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
      if (!conversations.find(c => c.id === conversationId)) {
        await get().loadConversations()
      }
      return conversationId
    } catch (err) {
      throw new Error(err.response?.data?.error || 'Failed to create conversation')
    }
  },

  clearSearchResults: () => {}
}))
