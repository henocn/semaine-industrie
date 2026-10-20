import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from './ui/Button'

const KEY = 'si26_cookie_ok'

/* Bannière cookies (consentement simple, stockage local), aux couleurs de la charte. */
export function CookieConsent() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) setVisible(true)
    } catch {
      setVisible(true)
    }
  }, [])

  /* Enregistre l'acceptation. */
  function accept() {
    try {
      localStorage.setItem(KEY, '1')
    } catch {
      // ignore
    }
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      role="region"
      aria-label="Cookies"
      className="fixed inset-x-0 bottom-0 z-[80] border-t-4 border-sun bg-forest p-4 shadow-[0_-8px_24px_rgba(2,77,62,0.25)]"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[14px] leading-relaxed text-white/90">
          Ce site utilise des cookies techniques nécessaires au fonctionnement (session, préférences).
          En continuant, vous acceptez notre{' '}
          <Link to="/confidentialite" className="font-semibold text-sun underline underline-offset-2 hover:text-white">
            politique de confidentialité
          </Link>
          .
        </p>
        <Button variant="accent" className="shrink-0 !px-6 !py-2.5 text-[14px]" onClick={accept}>
          Accepter
        </Button>
      </div>
    </div>
  )
}
