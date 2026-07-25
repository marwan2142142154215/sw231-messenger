import { useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getSocket } from '../services/socket'
import { useChatStore } from '../store/chatStore'
import { useAuthStore } from '../store/authStore'
import { showNotification, requestNotifPermission } from '../utils/notifications'

export function useSocket() {
  const socketRef = useRef(null)
  const navigate = useNavigate()
  const user = useAuthStore(s => s.user)
  const addMessage = useChatStore(s => s.addMessage)
  const updateMessage = useChatStore(s => s.updateMessage)
  const removeMessage = useChatStore(s => s.removeMessage)
  const setOnlineUsers = useChatStore(s => s.setOnlineUsers)
  const setTyping = useChatStore(s => s.setTyping)
  const activeConversation = useChatStore(s => s.activeConversation)

  useEffect(() => {
    if (!user) return
    requestNotifPermission()

    const socket = getSocket()
    socketRef.current = socket

    socket.on('connect', () => {
      console.log('[SOCKET] Connected')
    })

    socket.on('new_message', (message) => {
      addMessage(message)

      const isFromMe = message.sender_id === user.id
      const isActiveChat = activeConversation?.id === message.conversation_id

      if (!isFromMe && !isActiveChat) {
        showNotification(
          message.sender_name || 'New Message',
          message.content?.substring(0, 100) || '📎 Attachment',
          () => navigate(`/chat/${message.conversation_id}`)
        )
      }
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
  }, [user, addMessage, updateMessage, removeMessage, setOnlineUsers, setTyping, activeConversation, navigate])

  const emit = useCallback((event, data) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data)
    }
  }, [])

  return { socket: socketRef.current, emit }
}
