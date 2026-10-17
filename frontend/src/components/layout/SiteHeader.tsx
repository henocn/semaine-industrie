import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { BrandLogo, WRAP } from './Mark'

type NavItem = { label: string; href?: string; to?: string; icon: ReactNode }

type NavGroup = {
  label: string
  items: NavItem[]
}

/* Icônes SVG légères pour le menu. */
const Icon = {
  calendar: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  ),
  mail: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  ),
  badge: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M12 3 14.5 8.5 20.5 9.5 16 13.5 17.2 19.5 12 16.8 6.8 19.5 8 13.5 3.5 9.5 9.5 8.5 12 3z" />
    </svg>
  ),
  factory: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M3 21V9l6 3V9l6 3V5h6v16H3z" />
    </svg>
  ),
  handshake: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M8 13 4.5 9.5a2 2 0 0 1 0-3L7 4l4 4M16 13l3.5-3.5a2 2 0 0 0 0-3L17 4l-4 4" />
      <path d="M8 13c1.5 1.5 3 2 4 2s2.5-.5 4-2M9 21l1.5-3.5M15 21l-1.5-3.5" />
    </svg>
  ),
  map: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M12 21s6-5.2 6-10a6 6 0 1 0-12 0c0 4.8 6 10 6 10z" />
      <circle cx="12" cy="11" r="2" />
    </svg>
  ),
  chat: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M5 18v-1.5A3.5 3.5 0 0 1 8.5 13H18a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H7a3 3 0 0 0-3 3v11l3-2.5H8" />
    </svg>
  ),
  vote: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="m9 12 2.2 2.2L16 9.5" />
      <circle cx="12" cy="12" r="9" />
    </svg>
  ),
  clipboard: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="6" y="4" width="12" height="17" rx="2" />
      <path d="M9 4.5h6V3a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v1.5zM9 10h6M9 14h4" />
    </svg>
  ),
}

const GROUPS: NavGroup[] = [
  {
    label: 'Participer',
    items: [
      { label: 'Demander le label', to: '/label', icon: Icon.badge },
      { label: 'Rencontres d’affaires', to: '/affaires', icon: Icon.handshake },
    ],
  },
  {
    label: 'Explorer',
    items: [
      { label: 'Industrie', to: '/industrie', icon: Icon.factory },
      { label: 'Carte & visites', to: '/carte', icon: Icon.map },
    ],
  },
  {
    label: 'Défis',
    items: [
      { label: 'Questions live', to: '/questions', icon: Icon.chat },
      { label: 'Vote coup de cœur', to: '/vote', icon: Icon.vote },
      { label: 'Questionnaire', to: '/questionnaire', icon: Icon.clipboard },
    ],
  },
  {
    label: 'À propos',
    items: [
      { label: 'Programme', to: '/programme', icon: Icon.calendar },
      { label: 'Contact', to: '/#contact', icon: Icon.mail },
    ],
  },
]

/* Lien d’un sous-menu avec icône. */
function NavLink({ item, onNavigate }: { item: NavItem; onNavigate?: () => void }) {
  const className =
    'flex items-center gap-3 px-4 py-2.5 text-[14px] text-ink/75 transition-colors hover:bg-sage hover:text-forest'
  const content = (
    <>
      <span className="shrink-0 text-forest/70">{item.icon}</span>
      <span>{item.label}</span>
    </>
  )
  if (item.to) {
    return (
      <Link to={item.to} className={className} onClick={onNavigate}>
        {content}
      </Link>
    )
  }
  return (
    <a href={item.href} className={className} onClick={onNavigate}>
      {content}
    </a>
  )
}

/* Groupe desktop : fond vert descendant + dropdown collé. */
function DesktopGroup({ group, align = 'left' }: { group: NavGroup; align?: 'left' | 'right' }) {
  const panelPos = align === 'right' ? 'right-0 left-auto' : 'left-0'
  return (
    <div className="nav-group relative flex h-full">
      <button
        type="button"
        className="nav-group-label relative z-10 flex h-full items-center px-5 text-[15px] font-medium text-ink/70"
      >
        <span className="nav-group-bg" aria-hidden="true" />
        <span className="relative z-10">{group.label}</span>
      </button>
      <div className={`nav-group-panel absolute top-full z-20 w-60 min-w-full bg-white shadow-lg shadow-forest/10 ${panelPos}`}>
        {group.items.map((item) => (
          <NavLink key={item.label} item={item} />
        ))}
      </div>
    </div>
  )
}

/* Header public unique pour tout le site. */
export function SiteHeader() {
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-40 border-b border-forest/10 bg-white/95 backdrop-blur">
      <div className={`${WRAP} flex h-16 items-center justify-between`}>
        <Link to="/" className="relative z-10 flex items-center">
          <BrandLogo className="h-10 w-auto" />
        </Link>

        <nav className="hidden h-16 items-stretch md:flex" aria-label="Navigation principale">
          {GROUPS.map((group, i) => (
            <DesktopGroup
              key={group.label}
              group={group}
              align={i === GROUPS.length - 1 ? 'right' : 'left'}
            />
          ))}
        </nav>

        <button
          type="button"
          className="relative z-10 grid h-10 w-10 place-items-center text-forest md:hidden"
          aria-expanded={open}
          aria-controls="nav-mobile"
          onClick={() => setOpen((v) => !v)}
        >
          <span className="sr-only">{open ? 'Fermer le menu' : 'Ouvrir le menu'}</span>
          <span className="flex w-5 flex-col gap-1.5" aria-hidden="true">
            <span className={`h-0.5 bg-forest transition ${open ? 'translate-y-2 rotate-45' : ''}`} />
            <span className={`h-0.5 bg-forest transition ${open ? 'opacity-0' : ''}`} />
            <span className={`h-0.5 bg-forest transition ${open ? '-translate-y-2 -rotate-45' : ''}`} />
          </span>
        </button>
      </div>

      {open && (
        <div id="nav-mobile" className="border-t border-forest/10 bg-white md:hidden">
          <div className={`${WRAP} space-y-4 py-4`}>
            {GROUPS.map((group) => (
              <div key={group.label}>
                <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-forest/50">
                  {group.label}
                </p>
                <div className="mt-1">
                  {group.items.map((item) => (
                    <NavLink key={item.label} item={item} onNavigate={() => setOpen(false)} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </header>
  )
}
