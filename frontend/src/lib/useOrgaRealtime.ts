import { useEffect, useRef } from 'react'
import { joinRoom, onRealtime } from './socket'

/* Rejoint la salle orga et recharge dès qu'un des événements listés arrive. */
export function useOrgaRealtime(events: readonly string[], reload: (payload: unknown) => void | Promise<void>) {
  const reloadRef = useRef(reload)
  reloadRef.current = reload
  const key = events.join('|')

  useEffect(() => {
    joinRoom('orga')
    const list = key.split('|').filter(Boolean)
    const offs = list.map((event) =>
      onRealtime(event, (payload) => {
        void reloadRef.current(payload)
      }),
    )
    return () => {
      for (const off of offs) off()
    }
  }, [key])
}
