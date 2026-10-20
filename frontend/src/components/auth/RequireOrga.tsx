import { useEffect, useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { ensureOrgaSession, peekOrgaUser } from '../../api/auth'

/* Garde centralisée des pages backoffice orga. */
export function RequireOrga() {
  const location = useLocation()
  const [status, setStatus] = useState<'checking' | 'ok' | 'denied'>(() =>
    peekOrgaUser() ? 'ok' : 'checking',
  )

  useEffect(() => {
    let alive = true
    /* Valide la session côté API (refresh inclus via apiFetch). */
    async function check() {
      const user = await ensureOrgaSession()
      if (!alive) return
      setStatus(user ? 'ok' : 'denied')
    }
    void check()
    return () => {
      alive = false
    }
  }, [])

  if (status === 'denied') {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (status === 'checking') {
    return (
      <div className="grid min-h-svh place-items-center bg-white text-[14px] text-ink/50">
        Vérification de la session…
      </div>
    )
  }

  return <Outlet />
}
