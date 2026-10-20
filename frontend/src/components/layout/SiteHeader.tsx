import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  ClipboardList,
  Factory,
  Handshake,
  Mail,
  MapPin,
  Vote,
} from 'lucide-react'
import { Button } from '../ui/Button'
import { BrandLogo, WRAP } from './Mark'

type NavItem = { label: string; href?: string; to?: string; icon: ReactNode }

type NavGroup = {
  label: string
  items: NavItem[]
}

/* Icônes lucide du menu (trait fin, taille unique). */
const ICON_PROPS = { strokeWidth: 1.75, className: 'h-4 w-4', 'aria-hidden': true } as const

const Icon = {
  mail: <Mail {...ICON_PROPS} />,
  factory: <Factory {...ICON_PROPS} />,
  handshake: <Handshake {...ICON_PROPS} />,
  map: <MapPin {...ICON_PROPS} />,
  vote: <Vote {...ICON_PROPS} />,
  clipboard: <ClipboardList {...ICON_PROPS} />,
}

const GROUPS: NavGroup[] = [
  {
    label: 'Explorer',
    items: [
      { label: 'Industrie', to: '/industrie', icon: Icon.factory },
      { label: 'Carte & visites', to: '/carte', icon: Icon.map },
      { label: 'Rencontres d’affaires', to: '/affaires', icon: Icon.handshake },
    ],
  },
  {
    label: 'Défis',
    items: [
      { label: 'Vote coup de cœur', to: '/vote', icon: Icon.vote },
      { label: 'Questionnaire', to: '/questionnaire', icon: Icon.clipboard },
    ],
  },
  {
    label: 'À propos',
    items: [
      { label: 'Ressources', to: '/ressources', icon: Icon.clipboard },
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

/* Groupe desktop : un seul dropdown ouvert à la fois. */
function DesktopGroup({
  group,
  align = 'left',
  open,
  onOpen,
  onClose,
}: {
  group: NavGroup
  align?: 'left' | 'right'
  open: boolean
  onOpen: () => void
  onClose: () => void
}) {
  const panelPos = align === 'right' ? 'right-0 left-auto' : 'left-0'
  return (
    <div
      className="nav-group relative flex h-full"
      data-open={open ? 'true' : 'false'}
      onMouseEnter={onOpen}
      onMouseLeave={onClose}
    >
      <button
        type="button"
        className="nav-group-label relative z-10 flex h-full items-center px-5 text-[15px] font-medium text-ink/70"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => (open ? onClose() : onOpen())}
        onFocus={onOpen}
      >
        <span className="nav-group-bg" aria-hidden="true" />
        <span className="relative z-10">{group.label}</span>
      </button>
      <div
        className={`nav-group-panel absolute top-full z-30 w-60 min-w-full bg-white shadow-lg shadow-forest/10 ${panelPos}`}
      >
        {group.items.map((item) => (
          <NavLink key={item.label} item={item} onNavigate={onClose} />
        ))}
      </div>
    </div>
  )
}

/* Header public : CTA Participer à la place de Label, sans lien Programme ni menu Participer. */
export function SiteHeader() {
  const [open, setOpen] = useState(false)
  const [openGroup, setOpenGroup] = useState<string | null>(null)

  useEffect(() => {
    /* Ferme le sous-menu au clic hors nav. */
    function onDocClick(e: MouseEvent) {
      const t = e.target as HTMLElement | null
      if (!t?.closest?.('nav[aria-label="Navigation principale"]')) {
        setOpenGroup(null)
      }
    }
    document.addEventListener('click', onDocClick)
    return () => document.removeEventListener('click', onDocClick)
  }, [])

  return (
    <header className="sticky top-0 z-40 border-b border-forest/10 bg-white/95 backdrop-blur">
      <div className={`${WRAP} flex h-16 items-center justify-between gap-4`}>
        <Link to="/" className="relative z-10 flex items-center">
          <BrandLogo className="h-10 w-auto" />
        </Link>

        <nav className="ml-auto hidden h-16 items-stretch md:flex" aria-label="Navigation principale">
          {GROUPS.map((group, i) => (
            <DesktopGroup
              key={group.label}
              group={group}
              align={i === GROUPS.length - 1 ? 'right' : 'left'}
              open={openGroup === group.label}
              onOpen={() => setOpenGroup(group.label)}
              onClose={() => setOpenGroup(null)}
            />
          ))}
        </nav>

        <Button to="/label" variant="accent" className="hidden md:inline-flex">
          Participer
        </Button>

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
            <Button to="/label" variant="accent" onClick={() => setOpen(false)} className="w-full">
              Participer
            </Button>
          </div>
        </div>
      )}
    </header>
  )
}
