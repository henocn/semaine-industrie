import { useState, type ReactNode } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { getStoredUser, logout } from '../../api/auth'
import { Mark } from './Mark'

type OrgaShellProps = {
  title: string
  children: ReactNode
  actions?: ReactNode
  searchPlaceholder?: string
  onSearch?: (value: string) => void
}

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium transition-colors ${
    isActive ? 'bg-white text-forest shadow-sm' : 'text-ink/60 hover:bg-white/70 hover:text-forest'
  }`

/* Shell backoffice : sidebar + topbar (inspiré du layout type DataStack). */
export function OrgaShell({ title, children, actions, searchPlaceholder, onSearch }: OrgaShellProps) {
  const user = getStoredUser()
  const [open, setOpen] = useState(false)

  /* Déconnecte et renvoie au login. */
  async function onLogout() {
    await logout()
    window.location.href = '/login'
  }

  const sidebar = (
    <aside className="flex h-full w-64 flex-col border-r border-black/5 bg-[#f3f4f6] px-4 py-5">
      <Link to="/orga" className="mb-8 flex items-center gap-2.5 px-2 text-forest">
        <Mark className="h-6 w-auto text-leaf" />
        <span className="text-[15px] font-semibold tracking-tight">Semaine Industrie</span>
      </Link>

      <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink/35">Pilotage</p>
      <nav className="flex flex-col gap-1">
        <NavLink to="/orga" end className={linkClass}>Tableau de bord</NavLink>
        <NavLink to="/orga/labels" className={linkClass}>Demandes label</NavLink>
        <NavLink to="/orga/visites" className={linkClass}>Visites</NavLink>
        <NavLink to="/orga/affaires" className={linkClass}>Affaires</NavLink>
        <NavLink to="/orga/passeports" className={linkClass}>Passeports</NavLink>
        <NavLink to="/orga/live" className={linkClass}>Live & mesures</NavLink>
        <NavLink to="/orga/qr" className={linkClass}>QR / impression</NavLink>
        <NavLink to="/bilan" className={linkClass}>Bilan</NavLink>
      </nav>

      <p className="mb-2 mt-8 px-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink/35">Public</p>
      <nav className="flex flex-col gap-1">
        <NavLink to="/carte" className={linkClass}>Carte des sites</NavLink>
        <NavLink to="/" className={linkClass}>Site public</NavLink>
      </nav>

      <div className="mt-auto space-y-3 pt-8">
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <p className="text-[13px] font-semibold text-forest">Semaine 16–22 nov.</p>
          <p className="mt-1 text-[12px] leading-relaxed text-ink/50">
            Labels, QR et carte prêts. Réservations ensuite.
          </p>
          <Link
            to="/orga/labels"
            className="mt-3 inline-flex w-full items-center justify-center rounded-xl bg-forest px-3 py-2.5 text-[13px] font-semibold text-white hover:bg-ink"
          >
            Traiter les demandes
          </Link>
        </div>

        <div className="flex items-center gap-3 rounded-2xl px-2 py-2">
          <div className="grid h-10 w-10 place-items-center rounded-full bg-forest text-[13px] font-semibold text-white">
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
            className="rounded-lg px-2 py-1 text-[12px] font-medium text-ink/50 hover:bg-white hover:text-forest"
            title="Déconnexion"
          >
            Exit
          </button>
        </div>
      </div>
    </aside>
  )

  return (
    <div className="min-h-svh bg-[#f3f4f6] text-ink">
      <div className="flex min-h-svh">
        <div className="hidden md:block">{sidebar}</div>

        {open && (
          <div className="fixed inset-0 z-50 md:hidden">
            <button type="button" className="absolute inset-0 bg-black/30" aria-label="Fermer" onClick={() => setOpen(false)} />
            <div className="absolute inset-y-0 left-0 shadow-xl">{sidebar}</div>
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center gap-4 px-4 py-4 sm:px-8">
            <button
              type="button"
              className="rounded-xl bg-white px-3 py-2 text-[13px] font-medium text-forest shadow-sm md:hidden"
              onClick={() => setOpen(true)}
            >
              Menu
            </button>
            <h1 className="text-[22px] font-semibold tracking-tight text-forest">{title}</h1>

            {onSearch && (
              <label className="relative mx-auto hidden w-full max-w-md md:block">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/35">⌕</span>
                <input
                  type="search"
                  placeholder={searchPlaceholder || 'Rechercher…'}
                  onChange={(e) => onSearch(e.target.value)}
                  className="w-full rounded-full border-0 bg-white py-2.5 pl-9 pr-4 text-[14px] text-ink shadow-sm placeholder:text-ink/35 focus:outline-none focus:ring-2 focus:ring-forest/15"
                />
              </label>
            )}

            <div className="ml-auto flex items-center gap-3">
              {actions}
              <div className="hidden h-9 w-9 place-items-center rounded-full bg-white text-[12px] font-semibold text-forest shadow-sm sm:grid">
                {(user?.first_name?.[0] || 'O').toUpperCase()}
              </div>
            </div>
          </header>

          <main className="flex-1 px-4 pb-8 sm:px-8">{children}</main>
        </div>
      </div>
    </div>
  )
}
