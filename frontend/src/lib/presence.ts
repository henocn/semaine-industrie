/* Formate une présence : En ligne, ou il y a X min / heures / jours. */
export function formatPresence(online: boolean | undefined, lastSeenAt: string | null | undefined) {
  if (online) return { label: 'En ligne', tone: 'online' as const }

  if (!lastSeenAt) return { label: 'Hors ligne', tone: 'offline' as const }

  const then = new Date(lastSeenAt).getTime()
  if (Number.isNaN(then)) return { label: 'Hors ligne', tone: 'offline' as const }

  const diffMs = Math.max(0, Date.now() - then)
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return { label: 'À l\'instant', tone: 'recent' as const }
  if (mins < 60) {
    return { label: `Il y a ${mins} min`, tone: 'recent' as const }
  }
  const hours = Math.floor(mins / 60)
  if (hours < 24) {
    return {
      label: hours === 1 ? 'Il y a 1 heure' : `Il y a ${hours} heures`,
      tone: 'away' as const,
    }
  }
  const days = Math.floor(hours / 24)
  if (days === 1) return { label: 'Il y a 1 jour', tone: 'offline' as const }
  if (days < 30) return { label: `Il y a ${days} jours`, tone: 'offline' as const }
  return { label: 'Hors ligne', tone: 'offline' as const }
}
