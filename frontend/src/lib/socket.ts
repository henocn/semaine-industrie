import { io, type Socket } from 'socket.io-client'

let socket: Socket | null = null

/* URL Socket.IO : même origine (proxy Vite / Nginx) sauf override. */
function socketUrl() {
  return import.meta.env.VITE_SOCKET_URL || undefined
}

/* Singleton client Socket.IO (connexion paresseuse). */
export function getSocket(): Socket {
  if (!socket) {
    socket = io(socketUrl(), {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 8,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
    })
  }
  return socket
}

/* Rejoint une salle métier (live / votes). */
export function joinRoom(room: 'live' | 'votes') {
  const s = getSocket()
  if (!s.connected) s.connect()
  const join = () => s.emit('join', room)
  if (s.connected) join()
  else s.once('connect', join)
}

/* Écoute un événement et renvoie une fonction de nettoyage. */
export function onRealtime<T>(event: string, handler: (payload: T) => void) {
  const s = getSocket()
  if (!s.connected) s.connect()
  s.on(event, handler)
  return () => {
    s.off(event, handler)
  }
}
