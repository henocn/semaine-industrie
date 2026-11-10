import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'
import { WRAP, BrandLogo } from './Mark'

type NavItem = { label: string; href?: string; to?: string; red?: boolean }

type NavGroup = {
  label: string
  items: NavItem[]
}

const PARTICIPER_ITEMS: NavItem[] = [
  { label: 'Participation au Palais des Congrès', to: '/journees-au-palais/' },
  // Retiré du public : complet. Les inscriptions déjà reçues restent au back-office.
  // { label: 'Visites d’industries : particuliers', to: '/inscription-particulier/' },
  { label: 'Visites d’industries : écoles / universités', to: '/inscription-groupe/' },
  { label: 'Accréditation médias et créateurs de contenu', to: '/accreditation-medias/' },
  { label: 'Demande de labels pour les industries', to: '/label/' },
  // Retiré du public : hors du programme validé. Les inscriptions déjà reçues restent au back-office.
  // { label: 'Rencontres d’affaires', to: '/affaires' },
  { label: 'Mon espace', to: '/mon-espace/', red: true },
]

const GROUPS: NavGroup[] = [
  {
    label: 'Explorer',
    items: [
      { label: 'Industrie', to: '/industrie/' },
      { label: 'Carte & visites', to: '/carte/' },
    ],
  },
  {
    label: 'Défis',
    items: [
      { label: 'L’industrie, vue par vous', to: '/vue-par-vous/' },
      { label: 'Concours vidéo', to: '/concours-video/' },
      // Retiré du public : le vote n'est plus au programme validé.
      // { label: 'Vote coup de cœur', to: '/vote' },
    ],
  },
  {
    label: 'À propos',
    items: [
      { label: 'Questions fréquentes', to: '/faq/' },
      { label: 'Règles de participation', to: '/regles-de-participation/' },
      { label: 'Contact', to: '/#contact' },
    ],
  },
]

/* Lien de sous-menu : fond vert au survol, ou fond rouge permanent. */
function NavLink({ item, onNavigate }: { item: NavItem; onNavigate?: () => void }) {
  const tone = item.red
    ? 'bg-flag/80 font-semibold text-white hover:bg-flag'
    : 'text-ink/80 hover:bg-forest hover:text-white'
  const className = `block px-4 py-2.5 text-[14px] transition-colors ${tone}`
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

/* Groupe desktop : bouton et sous-menu au survol. */
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
      className="relative flex h-full"
      onMouseEnter={onOpen}
      onMouseLeave={onClose}
    >
      <button
        type="button"
        className={`relative z-10 flex h-full w-28 items-center justify-center px-2 text-[15px] font-medium transition-colors ${
          open ? 'bg-forest text-white' : 'text-ink/70 hover:bg-forest hover:text-white'
        }`}
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => (open ? onClose() : onOpen())}
        onFocus={onOpen}
      >
        <span>{group.label}</span>
      </button>
      {open && (
        <div
          className={`absolute top-full z-30 w-56 min-w-full border border-forest/10 bg-white py-1 shadow-lg shadow-forest/10 ${panelPos}`}
        >
          {group.items.map((item) => (
            <NavLink key={item.label} item={item} onNavigate={onClose} />
          ))}
        </div>
      )}
    </div>
  )
}

/* CTA Participer : menu label / affaires. */
function ParticiperMenu({
  open,
  onOpen,
  onClose,
}: {
  open: boolean
  onOpen: () => void
  onClose: () => void
}) {
  return (
    <div
      className="relative hidden h-16 items-center md:flex"
      onMouseEnter={onOpen}
      onMouseLeave={onClose}
    >
      <button
        type="button"
        className="ui-btn-accent inline-flex items-center gap-1.5"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => (open ? onClose() : onOpen())}
      >
        Participer
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} strokeWidth={1.75} aria-hidden="true" />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-30 w-max border border-forest/10 bg-white pt-1 shadow-lg shadow-forest/10">
          {PARTICIPER_ITEMS.map((item) => (
            <NavLink key={item.label} item={item} onNavigate={onClose} />
          ))}
        </div>
      )}
    </div>
  )
}

/* Header public. */
export function SiteHeader() {
  const [open, setOpen] = useState(false)
  const [openGroup, setOpenGroup] = useState<string | null>(null)

  useEffect(() => {
    /* Ferme le sous-menu au clic hors header. */
    function onDocClick(e: MouseEvent) {
      const t = e.target as HTMLElement | null
      if (!t?.closest?.('header')) setOpenGroup(null)
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

        <ParticiperMenu
          open={openGroup === 'Participer'}
          onOpen={() => setOpenGroup('Participer')}
          onClose={() => setOpenGroup(null)}
        />

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
            <div>
              <p className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.14em] text-forest/50">
                Participer
              </p>
              <div className="mt-1">
                {PARTICIPER_ITEMS.map((item) => (
                  <NavLink key={item.label} item={item} onNavigate={() => setOpen(false)} />
                ))}
              </div>
            </div>
            {GROUPS.map((group) => (
              <div key={group.label}>
                <p className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.14em] text-forest/50">
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
