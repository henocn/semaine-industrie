import { io, type Socket } from 'socket.io-client'

let socket: Socket | null = null

/* URL Socket.IO : même origine (proxy Vite / Nginx) sauf override. */
function socketUrl() {
  return import.meta.env.VITE_SOCKET_URL || undefined
}

/* Singleton client Socket.IO. */
export function getSocket(): Socket {
  if (!socket) {
    socket = io(socketUrl(), {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      autoConnect: true,
    })
  }
  return socket
}

/* Rejoint une salle métier (live / votes). */
export function joinRoom(room: 'live' | 'votes') {
  const s = getSocket()
  const join = () => s.emit('join', room)
  if (s.connected) join()
  else s.once('connect', join)
}

/* Écoute un événement et renvoie une fonction de nettoyage. */
export function onRealtime<T>(event: string, handler: (payload: T) => void) {
  const s = getSocket()
  s.on(event, handler)
  return () => {
    s.off(event, handler)
  }
}
