import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { getSocket } from '../services/socket'
import { useChatStore } from '../store/chatStore'
import { useAuthStore } from '../store/authStore'
import { showNotification, requestNotifPermission } from '../utils/notifications'

let socketInitialized = false

export function useSocket() {
  const socketRef = useRef(null)
  const navigate = useNavigate()
  const user = useAuthStore(s => s.user)

  useEffect(() => {
    if (!user || socketInitialized) return
    socketInitialized = true
    requestNotifPermission()

    const socket = getSocket()
    socketRef.current = socket

    const onMessageNew = (message) => {
      if (!message || !message.id) return
      const { addMessage } = useChatStore.getState()
      addMessage(message)
      const authUser = useAuthStore.getState().user
      const activeConv = useChatStore.getState().activeConversation
      const isFromMe = message.sender_id === authUser?.id
      const isActiveChat = activeConv?.id === message.conversation_id
      if (!isFromMe && !isActiveChat) {
        showNotification(
          message.display_name || message.username || 'New Message',
          message.content?.substring(0, 100) || '📎 Attachment',
          () => navigate(`/chat/${message.conversation_id}`)
        )
      }
    }

    const onMessageError = ({ error, tempId }) => {
      console.error('[SOCKET] Message error:', error)
      if (tempId) useChatStore.getState().markMessageFailed(tempId)
    }

    const onMessageEdited = ({ messageId, content }) => {
      if (messageId) useChatStore.getState().updateMessage(messageId, { content, is_edited: 1 })
    }

    const onMessageDeleted = ({ messageId }) => {
      if (messageId) useChatStore.getState().removeMessage(messageId)
    }

    const onMessageReaction = ({ messageId, emoji, action, userId, username, display_name }) => {
      if (!messageId || !emoji) return
      const messages = useChatStore.getState().messages
      const msg = messages.find(m => m.id === messageId)
      if (!msg) return
      let reactions = [...(msg.reactions || [])]
      if (action === 'removed') {
        reactions = reactions.filter(r => !(r.emoji === emoji && r.userId === userId))
      } else {
        reactions.push({ emoji, userId, username, display_name })
      }
      useChatStore.getState().updateMessage(messageId, { reactions })
    }

    const onMessageReadReceipt = ({ messageId, userId, username, display_name }) => {
      if (messageId && userId) {
        useChatStore.getState().addReadReceipt(messageId, userId, username, display_name)
      }
    }

    const onTypingStart = ({ userId, conversationId }) => {
      if (userId && conversationId) useChatStore.getState().setTyping(conversationId, userId, true)
    }

    const onTypingStop = ({ userId, conversationId }) => {
      if (userId && conversationId) useChatStore.getState().setTyping(conversationId, userId, false)
    }

    const onUserStatus = ({ userId, status, lastSeen }) => {
      if (!userId) return
      const { onlineUsers, updateLastSeen } = useChatStore.getState()
      const newSet = new Set(onlineUsers)
      if (status === 'online') newSet.add(userId)
      else newSet.delete(userId)
      useChatStore.setState({ onlineUsers: newSet })
      if (lastSeen) updateLastSeen(userId, lastSeen)
    }

    const onUserLastSeen = ({ userId, lastSeen }) => {
      if (userId && lastSeen) useChatStore.getState().updateLastSeen(userId, lastSeen)
    }

    const onConnected = () => {
      console.log('[SOCKET] Authenticated, joining conversations...')
    }

    socket.on('message:new', onMessageNew)
    socket.on('message:error', onMessageError)
    socket.on('message:edited', onMessageEdited)
    socket.on('message:deleted', onMessageDeleted)
    socket.on('message:reaction', onMessageReaction)
    socket.on('message:read:receipt', onMessageReadReceipt)
    socket.on('typing:start', onTypingStart)
    socket.on('typing:stop', onTypingStop)
    socket.on('user:status', onUserStatus)
    socket.on('user:last_seen', onUserLastSeen)
    socket.on('connected', onConnected)

    return () => {
      socketInitialized = false
      socket.off('message:new', onMessageNew)
      socket.off('message:error', onMessageError)
      socket.off('message:edited', onMessageEdited)
      socket.off('message:deleted', onMessageDeleted)
      socket.off('message:reaction', onMessageReaction)
      socket.off('message:read:receipt', onMessageReadReceipt)
      socket.off('typing:start', onTypingStart)
      socket.off('typing:stop', onTypingStop)
      socket.off('user:status', onUserStatus)
      socket.off('user:last_seen', onUserLastSeen)
      socket.off('connected', onConnected)
    }
  }, [user, navigate])

  return { socket: socketRef.current }
}
