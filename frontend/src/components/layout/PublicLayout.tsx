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
    <div className="relative flex min-h-svh flex-col overflow-x-clip">
      <div className="page-industry-bg" aria-hidden="true" />
      <div className="relative z-10 flex min-h-svh flex-col">
        <SiteHeader />
        <div className="flex flex-1 flex-col [&>main]:flex-1">
          <Outlet />
        </div>
        <SiteFooter />
        <CookieConsent />
      </div>
    </div>
  )
}
