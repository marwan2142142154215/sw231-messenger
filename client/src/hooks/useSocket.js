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
  const markMessageFailed = useChatStore(s => s.markMessageFailed)
  const setOnlineUsers = useChatStore(s => s.setOnlineUsers)
  const setTyping = useChatStore(s => s.setTyping)
  const activeConversation = useChatStore(s => s.activeConversation)

  useEffect(() => {
    if (!user) return
    requestNotifPermission()

    const socket = getSocket()
    socketRef.current = socket

    socket.on('message:new', (message) => {
      addMessage(message)
      const isFromMe = message.sender_id === user.id
      const isActiveChat = activeConversation?.id === message.conversation_id
      if (!isFromMe && !isActiveChat) {
        showNotification(
          message.display_name || message.username || 'New Message',
          message.content?.substring(0, 100) || '📎 Attachment',
          () => navigate(`/chat/${message.conversation_id}`)
        )
      }
    })

    socket.on('message:error', ({ error, tempId }) => {
      if (tempId) markMessageFailed(tempId)
    })

    socket.on('message:edited', ({ messageId, content }) => {
      updateMessage(messageId, { content, is_edited: 1 })
    })

    socket.on('message:deleted', ({ messageId }) => {
      removeMessage(messageId)
    })

    socket.on('message:reaction', ({ messageId, emoji, action, userId }) => {
      const messages = useChatStore.getState().messages
      const msg = messages.find(m => m.id === messageId)
      if (!msg) return
      let reactions = [...(msg.reactions || [])]
      if (action === 'removed') {
        reactions = reactions.filter(r => !(r.emoji === emoji && r.userId === userId))
      } else {
        reactions.push({ emoji, userId })
      }
      updateMessage(messageId, { reactions })
    })

    socket.on('user:status', ({ userId, status }) => {})

    socket.on('typing:start', ({ userId, conversationId }) => {
      setTyping(conversationId, userId, true)
    })

    socket.on('typing:stop', ({ userId, conversationId }) => {
      setTyping(conversationId, userId, false)
    })

    return () => {
      socket.off('message:new')
      socket.off('message:error')
      socket.off('message:edited')
      socket.off('message:deleted')
      socket.off('message:reaction')
      socket.off('user:status')
      socket.off('typing:start')
      socket.off('typing:stop')
    }
  }, [user, addMessage, updateMessage, removeMessage, markMessageFailed, setOnlineUsers, setTyping, activeConversation, navigate])

  const emit = useCallback((event, data) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data)
    }
  }, [])

  return { socket: socketRef.current, emit }
}
