/* Demande l'autorisation des notifications navigateur. */
export async function ensureNotifyPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  const result = await Notification.requestPermission()
  return result === 'granted'
}

/* Affiche une notification système (si autorisée). */
export function pushNotify(title: string, body: string, options?: { tag?: string; href?: string }) {
  if (typeof window === 'undefined' || !('Notification' in window)) return
  if (Notification.permission !== 'granted') return

  const n = new Notification(title, {
    body,
    tag: options?.tag,
    icon: '/favicon.svg',
  })
  if (options?.href) {
    n.onclick = () => {
      window.focus()
      window.location.href = options.href!
      n.close()
    }
  }
}
