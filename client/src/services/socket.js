import { io } from 'socket.io-client'

let socket = null

export function getSocket() {
  if (!socket) {
    const token = localStorage.getItem('nyx_access_token')
    socket = io('/', {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000
    })
  }
  return socket
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}

export function updateSocketToken() {
  if (socket) {
    const token = localStorage.getItem('nyx_access_token')
    socket.auth.token = token
    socket.connect()
  }
}
