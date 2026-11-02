import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { scrollToTopNow } from '../lib/scroll'

/* Remet le scroll en haut à chaque changement de page (sauf ancre #). */
export function ScrollToTop() {
  const { pathname, hash } = useLocation()

  /* Le navigateur ne doit pas rétablir l'ancienne position par-dessus (retour arrière, rechargement). */
  useEffect(() => {
    if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual'
  }, [])

  useEffect(() => {
    if (hash) return
    scrollToTopNow()
  }, [pathname, hash])

  return null
}
