import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { CookieConsent } from '../CookieConsent'
import { SiteFooter } from './SiteFooter'
import { SiteHeader } from './SiteHeader'

/* Layout commun des pages publiques (même en-tête partout). */
export function PublicLayout() {
  const { pathname, hash } = useLocation()

  useEffect(() => {
    if (!hash) return
    const id = hash.replace('#', '')
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [pathname, hash])

  return (
    <div className="min-h-svh overflow-x-clip">
      <SiteHeader />
      <Outlet />
      <SiteFooter />
      <CookieConsent />
    </div>
  )
}
