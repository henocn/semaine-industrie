import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

const KEY = 'si26_cookie_ok'

/* Bannière cookies (consentement simple, stockage local). */
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
    <div className="fixed inset-x-0 bottom-0 z-[80] border-t border-black bg-white p-4 shadow-[0_-8px_24px_rgba(0,0,0,0.08)]">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[13px] leading-relaxed text-ink/70">
          Ce site utilise des cookies techniques nécessaires au fonctionnement (session, préférences).
          En continuant, vous acceptez notre{' '}
          <Link to="/confidentialite" className="font-semibold text-forest underline underline-offset-2">
            politique de confidentialité
          </Link>
          .
        </p>
        <button type="button" className="orga-btn shrink-0 px-5 py-2.5 text-[13px]" onClick={accept}>
          Accepter
        </button>
      </div>
    </div>
  )
}
