import { io, type Socket } from 'socket.io-client'
import { getAccessToken } from '../api/session'

let socket: Socket | null = null
const joinedRooms = new Set<'live' | 'votes' | 'orga'>()

/* URL Socket.IO : même origine (proxy Vite / Nginx) sauf override. */
function socketUrl() {
  return import.meta.env.VITE_SOCKET_URL || undefined
}

/* Annonce la présence staff (JWT). */
function announcePresence(s: Socket) {
  const token = getAccessToken()
  if (token) s.emit('presence:auth', { token })
}

/* Rejoint toutes les salles mémorisées (après connect / reconnect). */
function rejoinAll(s: Socket) {
  for (const room of joinedRooms) {
    s.emit('join', room)
  }
  if (joinedRooms.has('orga')) announcePresence(s)
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
    socket.on('connect', () => {
      rejoinAll(socket!)
    })
  }
  return socket
}

/* Rejoint une salle métier (live / votes / orga). */
export function joinRoom(room: 'live' | 'votes' | 'orga') {
  joinedRooms.add(room)
  const s = getSocket()
  if (!s.connected) s.connect()
  else {
    s.emit('join', room)
    if (room === 'orga') announcePresence(s)
  }
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
