import { Link } from 'react-router-dom'
import { logout } from '../../api/auth'
import { Mark, WRAP } from './Mark'

/* Barre de navigation de l'espace organisation. */
export function OrgaNav({ email }: { email?: string }) {
  /* Déconnecte et renvoie au login. */
  async function onLogout() {
    await logout()
    window.location.href = '/login'
  }

  return (
    <header className="sticky top-0 z-40 border-b border-forest/10 bg-white/95 backdrop-blur">
      <div className={`${WRAP} flex h-16 items-center justify-between gap-4`}>
        <div className="flex items-center gap-6">
          <Link to="/orga" className="flex items-center gap-2.5 text-forest">
            <Mark className="h-6 w-auto text-leaf" />
            <span className="text-[15px] font-semibold">Espace organisation</span>
          </Link>
          <nav className="hidden gap-1 text-[15px] text-ink/70 md:flex">
            <Link to="/orga" className="rounded-full px-3 py-2 hover:bg-forest hover:text-white">Tableau</Link>
            <Link to="/orga/labels" className="rounded-full px-3 py-2 hover:bg-forest hover:text-white">Labels</Link>
            <Link to="/orga/qr" className="rounded-full px-3 py-2 hover:bg-forest hover:text-white">QR</Link>
          </nav>
        </div>
        <div className="flex items-center gap-4 text-[15px]">
          <span className="hidden text-ink/60 sm:inline">{email}</span>
          <button type="button" onClick={onLogout} className="text-forest hover:underline">
            Déconnexion
          </button>
        </div>
      </div>
    </header>
  )
}
