import { io } from 'socket.io-client'

let socket = null

export function getSocket() {
  if (!socket) {
    const token = localStorage.getItem('nyx_access_token')
    socket = io('/', {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30000,
      timeout: 20000,
      forceNew: false,
      multiplex: true
    })

    socket.on('connect', () => {
      console.log('[SOCKET] Connected:', socket.id)
    })

    socket.on('disconnect', (reason) => {
      console.log('[SOCKET] Disconnected:', reason)
      if (reason === 'io server disconnect') {
        socket.connect()
      }
    })

    socket.on('connect_error', (err) => {
      console.log('[SOCKET] Connection error:', err.message)
    })
  }
  return socket
}

export function socketEmit(event, data) {
  const s = getSocket()
  if (s?.connected) {
    s.emit(event, data)
  } else {
    console.warn('[SOCKET] Not connected, cannot emit:', event)
  }
}

export function disconnectSocket() {
  if (socket) {
    socket.removeAllListeners()
    socket.disconnect()
    socket = null
  }
}

export function updateSocketToken() {
  if (socket) {
    const token = localStorage.getItem('nyx_access_token')
    socket.auth.token = token
    if (!socket.connected) {
      socket.connect()
    }
  }
}
