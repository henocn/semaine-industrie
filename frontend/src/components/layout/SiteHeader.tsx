import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BrandLogo, WRAP } from './Mark'

type NavItem = { label: string; href?: string; to?: string }

type NavGroup = {
  label: string
  items: NavItem[]
}

const GROUPS: NavGroup[] = [
  {
    label: 'La semaine',
    items: [
      { label: 'Programme', to: '/#programme' },
      { label: 'Vendredi 20', to: '/#vendredi' },
      { label: 'Contact', to: '/#contact' },
    ],
  },
  {
    label: 'Participer',
    items: [
      { label: 'Demander le label', to: '/label' },
      { label: 'Visites d’usines', to: '/visites' },
      { label: 'Rencontres d’affaires', to: '/affaires' },
    ],
  },
  {
    label: 'Explorer',
    items: [
      { label: 'Industrie', to: '/industrie' },
      { label: 'Carte & visites', to: '/carte' },
      { label: 'Questions live', to: '/questions' },
      { label: 'Vote', to: '/vote' },
      { label: 'Questionnaire', to: '/questionnaire' },
    ],
  },
]

/* Lien d’un sous-menu. */
function NavLink({ item, onNavigate }: { item: NavItem; onNavigate?: () => void }) {
  const className =
    'block px-4 py-2.5 text-[14px] text-ink/75 transition-colors hover:bg-sage hover:text-forest'
  if (item.to) {
    return (
      <Link to={item.to} className={className} onClick={onNavigate}>
        {item.label}
      </Link>
    )
  }
  return (
    <a href={item.href} className={className} onClick={onNavigate}>
      {item.label}
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
      <div className={`nav-group-panel absolute top-full z-20 w-52 min-w-full bg-white shadow-lg shadow-forest/10 ${panelPos}`}>
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
