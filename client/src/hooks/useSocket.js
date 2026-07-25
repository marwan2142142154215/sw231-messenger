import { useEffect, useRef, useCallback } from 'react'
import { getSocket } from '../services/socket'
import { useChatStore } from '../store/chatStore'
import { useAuthStore } from '../store/authStore'

export function useSocket() {
  const socketRef = useRef(null)
  const user = useAuthStore(s => s.user)
  const addMessage = useChatStore(s => s.addMessage)
  const updateMessage = useChatStore(s => s.updateMessage)
  const removeMessage = useChatStore(s => s.removeMessage)
  const setOnlineUsers = useChatStore(s => s.setOnlineUsers)
  const setTyping = useChatStore(s => s.setTyping)

  useEffect(() => {
    if (!user) return
    const socket = getSocket()
    socketRef.current = socket

    socket.on('connect', () => {
      console.log('[SOCKET] Connected')
    })

    socket.on('new_message', (message) => {
      addMessage(message)
    })

    socket.on('message_edited', (message) => {
      updateMessage(message.id, message)
    })

    socket.on('message_deleted', ({ messageId }) => {
      removeMessage(messageId)
    })

    socket.on('message_reaction', ({ messageId, reactions }) => {
      updateMessage(messageId, { reactions })
    })

    socket.on('online_users', (users) => {
      setOnlineUsers(users)
    })

    socket.on('user_typing', ({ conversationId, userId, isTyping }) => {
      setTyping(conversationId, userId, isTyping)
    })

    socket.on('disconnect', (reason) => {
      console.log('[SOCKET] Disconnected:', reason)
    })

    return () => {
      socket.off('new_message')
      socket.off('message_edited')
      socket.off('message_deleted')
      socket.off('message_reaction')
      socket.off('online_users')
      socket.off('user_typing')
    }
  }, [user, addMessage, updateMessage, removeMessage, setOnlineUsers, setTyping])

  const emit = useCallback((event, data) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data)
    }
  }, [])

  return { socket: socketRef.current, emit }
}
