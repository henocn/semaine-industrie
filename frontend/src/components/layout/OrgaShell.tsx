import { useEffect, useState, type ReactNode } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { getStoredUser, logout } from '../../api/auth'
import { listLabelRequests, type LabelRequest } from '../../api/labels'
import { LABEL_PENDING_EVENT } from '../../lib/labelPending'
import { ensureNotifyPermission, pushNotify } from '../../lib/notifications'
import { joinRoom, onRealtime } from '../../lib/socket'
import { BrandLogo } from './Mark'

type OrgaShellProps = {
  title: string
  children: ReactNode
  actions?: ReactNode
  searchPlaceholder?: string
  onSearch?: (value: string) => void
}

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center border-l-2 px-3 py-2 text-[14px] font-medium transition-colors ${
    isActive
      ? 'border-forest bg-forest/5 text-forest'
      : 'border-transparent text-ink/65 hover:bg-black/[0.03] hover:text-forest'
  }`

/* Shell backoffice : sidebar nette + contenu sans coins IA. */
export function OrgaShell({ title, children, actions, searchPlaceholder, onSearch }: OrgaShellProps) {
  const user = getStoredUser()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)
  const [banner, setBanner] = useState<string | null>(null)

  /* Déconnecte et renvoie au login. */
  async function onLogout() {
    await logout()
    window.location.href = '/login'
  }

  /* Compte les demandes encore en attente. */
  async function refreshPending() {
    try {
      const rows = await listLabelRequests('pending')
      setPendingCount(rows.length)
    } catch {
      // ignore (session expirée gérée ailleurs)
    }
  }

  /* Charge le badge (navigation + focus + événement local + sockets). */
  useEffect(() => {
    if (!user || user.role !== 'orga') return
    void refreshPending()

    const onLocal = () => {
      void refreshPending()
    }
    /* Au retour sur l'onglet admin après une demande publique. */
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refreshPending()
    }
    window.addEventListener(LABEL_PENDING_EVENT, onLocal)
    window.addEventListener('focus', onVisible)
    document.addEventListener('visibilitychange', onVisible)

    void ensureNotifyPermission()
    joinRoom('orga')
    const offCreated = onRealtime<LabelRequest>('label:created', (row) => {
      const kind = row.structure_type === 'ecole' ? 'École' : 'Entreprise'
      const msg = `${row.structure_name} · ${row.contact_phone || 'sans tél.'}`
      setBanner(`Nouvelle demande (${kind}) : ${msg}`)
      void refreshPending()
      pushNotify('Nouvelle demande de label', msg, {
        tag: `label-${row.id}`,
        href: '/orga/labels',
      })
    })
    const offUpdated = onRealtime<LabelRequest>('label:updated', () => {
      void refreshPending()
    })

    return () => {
      window.removeEventListener(LABEL_PENDING_EVENT, onLocal)
      window.removeEventListener('focus', onVisible)
      document.removeEventListener('visibilitychange', onVisible)
      offCreated()
      offUpdated()
    }
  }, [user?.id, user?.role, location.pathname])

  const sidebar = (
    <aside className="flex h-full w-60 flex-col border-r border-black bg-white px-3 py-5">
      <Link to="/orga" className="mb-8 flex items-center px-2">
        <BrandLogo className="h-9 w-auto" />
      </Link>

      <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink/40">Pilotage</p>
      <nav className="flex flex-col gap-0.5">
        <NavLink to="/orga" end className={linkClass}>Tableau de bord</NavLink>
        <NavLink to="/orga/labels" className={linkClass}>
          <span className="flex w-full items-center justify-between gap-2">
            Demandes label
            {pendingCount > 0 && (
              <span
                className="min-w-5 bg-sun px-1.5 py-0.5 text-center text-[11px] font-bold text-ink"
                title={`${pendingCount} en attente`}
              >
                {pendingCount > 99 ? '99+' : pendingCount}
              </span>
            )}
          </span>
        </NavLink>
        <NavLink to="/orga/visites" className={linkClass}>Visites</NavLink>
        <NavLink to="/orga/affaires" className={linkClass}>Affaires</NavLink>
        <NavLink to="/orga/passeports" className={linkClass}>Passeports</NavLink>
        <NavLink to="/orga/live" className={linkClass}>Live & mesures</NavLink>
        <NavLink to="/orga/qr" className={linkClass}>QR / impression</NavLink>
        <NavLink to="/bilan" className={linkClass}>Bilan</NavLink>
      </nav>

      <p className="mb-2 mt-8 px-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink/40">Public</p>
      <nav className="flex flex-col gap-0.5">
        <NavLink to="/carte" className={linkClass}>Carte des sites</NavLink>
        <NavLink to="/" className={linkClass}>Site public</NavLink>
      </nav>

      <div className="mt-auto space-y-4 border-t border-black pt-4">
        <div className="px-2">
          <p className="text-[13px] font-semibold text-forest">Semaine 16–22 nov.</p>
          <p className="mt-1 text-[12px] leading-relaxed text-ink/50">
            Labels, QR et carte. Réservations ensuite.
          </p>
          <Link
            to="/orga/labels"
            className="mt-3 inline-flex w-full items-center justify-center bg-forest px-3 py-2.5 text-[13px] font-semibold text-white hover:bg-ink"
          >
            Traiter les demandes
          </Link>
        </div>

        <div className="flex items-center gap-3 px-2">
          <div className="grid h-9 w-9 place-items-center border border-black bg-forest text-[12px] font-semibold text-white">
            {(user?.first_name?.[0] || 'O').toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold text-forest">
              {user ? `${user.first_name} ${user.last_name}` : 'Organisation'}
            </p>
            <p className="truncate text-[12px] text-ink/45">{user?.email}</p>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="px-2 py-1 text-[12px] font-medium text-ink/50 hover:text-forest"
            title="Déconnexion"
          >
            Exit
          </button>
        </div>
      </div>
    </aside>
  )

  return (
    <div className="min-h-svh bg-white text-ink">
      <div className="flex min-h-svh">
        <div className="hidden md:block">{sidebar}</div>

        {open && (
          <div className="fixed inset-0 z-50 md:hidden">
            <button type="button" className="absolute inset-0 bg-black/40" aria-label="Fermer" onClick={() => setOpen(false)} />
            <div className="absolute inset-y-0 left-0 border-r border-black bg-white">{sidebar}</div>
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center gap-4 border-b border-black px-4 py-3 sm:px-8">
            <button
              type="button"
              className="border border-black px-3 py-2 text-[13px] font-medium text-forest md:hidden"
              onClick={() => setOpen(true)}
            >
              Menu
            </button>
            <h1 className="text-[20px] font-semibold tracking-tight text-forest">{title}</h1>

            {onSearch && (
              <label className="relative mx-auto hidden w-full max-w-md md:block">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/35">⌕</span>
                <input
                  type="search"
                  placeholder={searchPlaceholder || 'Rechercher…'}
                  onChange={(e) => onSearch(e.target.value)}
                  className="w-full border border-black bg-white py-2 pl-9 pr-3 text-[14px] text-ink placeholder:text-ink/35 focus:outline-none"
                />
              </label>
            )}

            <div className="ml-auto flex items-center gap-3">
              {actions}
              <div className="hidden h-9 w-9 place-items-center border border-black text-[12px] font-semibold text-forest sm:grid">
                {(user?.first_name?.[0] || 'O').toUpperCase()}
              </div>
            </div>
          </header>

          {banner && (
            <div className="flex items-center justify-between gap-3 border-b border-black bg-sun/40 px-4 py-2.5 text-[13px] text-ink sm:px-8">
              <p>
                <span className="font-semibold">Alerte · </span>
                {banner}
              </p>
              <div className="flex shrink-0 items-center gap-3">
                <Link to="/orga/labels" className="font-semibold text-forest underline underline-offset-2" onClick={() => setBanner(null)}>
                  Voir
                </Link>
                <button type="button" className="text-ink/50 hover:text-forest" onClick={() => setBanner(null)}>
                  Fermer
                </button>
              </div>
            </div>
          )}

          <main className="flex-1 px-4 py-6 sm:px-8">{children}</main>
        </div>
      </div>
    </div>
  )
}
