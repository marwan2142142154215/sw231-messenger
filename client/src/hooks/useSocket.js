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
      useChatStore.getState().markMessageFailed(tempId)
    }

    const onMessageEdited = ({ messageId, content }) => {
      useChatStore.getState().updateMessage(messageId, { content, is_edited: 1 })
    }

    const onMessageDeleted = ({ messageId }) => {
      useChatStore.getState().removeMessage(messageId)
    }

    const onMessageReaction = ({ messageId, emoji, action, userId }) => {
      const messages = useChatStore.getState().messages
      const msg = messages.find(m => m.id === messageId)
      if (!msg) return
      let reactions = [...(msg.reactions || [])]
      if (action === 'removed') {
        reactions = reactions.filter(r => !(r.emoji === emoji && r.userId === userId))
      } else {
        reactions.push({ emoji, userId })
      }
      useChatStore.getState().updateMessage(messageId, { reactions })
    }

    const onTypingStart = ({ userId, conversationId }) => {
      useChatStore.getState().setTyping(conversationId, userId, true)
    }

    const onTypingStop = ({ userId, conversationId }) => {
      useChatStore.getState().setTyping(conversationId, userId, false)
    }

    const onConnected = () => {
      console.log('[SOCKET] Authenticated, joining conversations...')
    }

    socket.on('message:new', onMessageNew)
    socket.on('message:error', onMessageError)
    socket.on('message:edited', onMessageEdited)
    socket.on('message:deleted', onMessageDeleted)
    socket.on('message:reaction', onMessageReaction)
    socket.on('typing:start', onTypingStart)
    socket.on('typing:stop', onTypingStop)
    socket.on('connected', onConnected)

    return () => {
      socketInitialized = false
      socket.off('message:new', onMessageNew)
      socket.off('message:error', onMessageError)
      socket.off('message:edited', onMessageEdited)
      socket.off('message:deleted', onMessageDeleted)
      socket.off('message:reaction', onMessageReaction)
      socket.off('typing:start', onTypingStart)
      socket.off('typing:stop', onTypingStop)
      socket.off('connected', onConnected)
    }
  }, [user, navigate])

  return { socket: socketRef.current }
}
