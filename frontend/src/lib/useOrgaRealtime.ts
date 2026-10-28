import { useEffect, useRef } from 'react'
import { joinRoom, onRealtime } from './socket'

/* Rejoint la salle orga et recharge dès qu'un des événements listés arrive. */
export function useOrgaRealtime(events: readonly string[], reload: () => void | Promise<void>) {
  const reloadRef = useRef(reload)
  reloadRef.current = reload
  const key = events.join('|')

  useEffect(() => {
    joinRoom('orga')
    const list = key.split('|').filter(Boolean)
    const offs = list.map((event) =>
      onRealtime(event, () => {
        void reloadRef.current()
      }),
    )
    return () => {
      for (const off of offs) off()
    }
  }, [key])
}
