import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import {
  changePassword,
  getStoredUser,
  logout,
  updateProfile,
  type AuthUser,
} from '../../api/auth'
import { listLabelRequests, type LabelRequest } from '../../api/labels'
import { listParticipations } from '../../api/participations'
import { LABEL_PENDING_EVENT } from '../../lib/labelPending'
import { ensureNotifyPermission, pushNotify } from '../../lib/notifications'
import { joinRoom, onRealtime } from '../../lib/socket'
import { isAdminRole, isStaffRole } from '../../lib/roles'
import { Seo } from '../Seo'
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
      : 'border-transparent text-ink/65 hover:bg-forest/10 hover:text-forest'
  }`

const field =
  'mt-1 w-full border border-black bg-white px-3 py-2 text-[14px] text-ink focus:outline-none'

/* Shell backoffice : sidebar nette + contenu sans coins IA. */
export function OrgaShell({ title, children, actions, searchPlaceholder, onSearch }: OrgaShellProps) {
  const location = useLocation()
  const mainRef = useRef<HTMLElement>(null)
  const [user, setUser] = useState<AuthUser | null>(() => getStoredUser())
  const [open, setOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)
  const [participationCount, setParticipationCount] = useState(0)
  const [banner, setBanner] = useState<string | null>(null)

  /* Dans le backoffice le scroll est sur <main>, pas sur la fenêtre. */
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [location.pathname])
  const [accountError, setAccountError] = useState<string | null>(null)
  const [accountInfo, setAccountInfo] = useState<string | null>(null)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)

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
    try {
      const parts = await listParticipations({ status: 'pending' })
      setParticipationCount(parts.length)
    } catch {
      // ignore
    }
  }

  /* Charge le badge (navigation + focus + événement local + sockets). */
  useEffect(() => {
    if (!user || !isStaffRole(user.role)) return
    void refreshPending()

    const onLocal = () => {
      void refreshPending()
    }
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refreshPending()
    }
    window.addEventListener(LABEL_PENDING_EVENT, onLocal)
    window.addEventListener('focus', onVisible)
    document.addEventListener('visibilitychange', onVisible)

    void ensureNotifyPermission()
    joinRoom('orga')
    const offLabelCreated = onRealtime<LabelRequest>('label:created', (row) => {
      const kind = row.structure_type === 'ecole' ? 'École' : 'Industrie'
      const msg = `${row.structure_name} · ${row.contact_phone || 'sans tél.'}`
      setBanner(`Nouvelle demande (${kind}) : ${msg}`)
      void refreshPending()
      pushNotify('Nouvelle demande de label', msg, {
        tag: `label-${row.id}`,
        href: '/orga/labels',
      })
    })
    const offLabelUpdated = onRealtime<LabelRequest>('label:updated', () => {
      void refreshPending()
    })
    const offParticipation = onRealtime<{
      id: string
      name?: string
      status?: string
      action?: string
    }>('participation:changed', (row) => {
      void refreshPending()
      if (row.action === 'create' && row.status === 'pending') {
        const msg = row.name || 'Nouvelle inscription'
        setBanner(`Nouvelle inscription école : ${msg}`)
        pushNotify('Nouvelle inscription', msg, {
          tag: `participation-${row.id}`,
          href: '/orga/participations',
        })
      }
    })
    const offBusiness = onRealtime<{
      id?: string
      action?: string
      status?: string
      label?: string
    }>('business:changed', (row) => {
      void refreshPending()
      if (row.action === 'create' && row.status === 'pending') {
        const msg = row.label || 'Nouveau profil'
        setBanner(`Nouvelle rencontre d'affaires : ${msg}`)
        pushNotify("Nouvelle inscription d'affaires", msg, {
          tag: `business-${row.id || 'new'}`,
          href: '/orga/affaires',
        })
      }
    })

    return () => {
      window.removeEventListener(LABEL_PENDING_EVENT, onLocal)
      window.removeEventListener('focus', onVisible)
      document.removeEventListener('visibilitychange', onVisible)
      offLabelCreated()
      offLabelUpdated()
      offParticipation()
      offBusiness()
    }
  }, [user?.id, user?.role, location.pathname])

  /* Enregistre le profil. */
  async function onSaveProfile(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setAccountError(null)
    setAccountInfo(null)
    setSavingProfile(true)
    const fd = new FormData(e.currentTarget)
    try {
      const next = await updateProfile(
        String(fd.get('first_name') || ''),
        String(fd.get('last_name') || ''),
      )
      setUser(next)
      setAccountInfo('Profil mis à jour')
    } catch (err) {
      setAccountError(err instanceof Error ? err.message : 'Mise à jour impossible')
    } finally {
      setSavingProfile(false)
    }
  }

  /* Change le mot de passe. */
  async function onSavePassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setAccountError(null)
    setAccountInfo(null)
    const form = e.currentTarget
    const fd = new FormData(form)
    const current_password = String(fd.get('current_password') || '')
    const new_password = String(fd.get('new_password') || '')
    const confirm = String(fd.get('confirm_password') || '')
    if (new_password !== confirm) {
      setAccountError('Les mots de passe ne correspondent pas')
      return
    }
    setSavingPassword(true)
    try {
      await changePassword(current_password, new_password)
      setAccountInfo('Mot de passe modifié')
      form.reset()
    } catch (err) {
      setAccountError(err instanceof Error ? err.message : 'Changement impossible')
    } finally {
      setSavingPassword(false)
    }
  }

  const sidebar = (
    <aside className="flex h-svh w-60 shrink-0 flex-col overflow-hidden border-r border-black bg-white px-3 py-5">
      <a
        href="https://semaineindustrie.tg/"
        target="_blank"
        rel="noopener noreferrer"
        className="mb-6 flex shrink-0 items-center px-2"
        title="Ouvrir le site public"
      >
        <BrandLogo className="h-9 w-auto" />
      </a>

      <nav className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto">
        <NavLink to="/orga" end className={linkClass}>Tableau de bord</NavLink>
        <NavLink to="/orga/visites" className={linkClass}>Planning visites</NavLink>
        <NavLink to="/orga/labels" className={linkClass}>
          <span className="flex w-full items-center justify-between gap-2">
            Demandes de labels
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
        <NavLink to="/orga/participations" className={linkClass}>
          <span className="flex w-full items-center justify-between gap-2">
            Participations
            {participationCount > 0 && (
              <span
                className="min-w-5 bg-sun px-1.5 py-0.5 text-center text-[11px] font-bold text-ink"
                title={`${participationCount} en attente`}
              >
                {participationCount > 99 ? '99+' : participationCount}
              </span>
            )}
          </span>
        </NavLink>
        <NavLink to="/orga/affaires" className={linkClass}>Rencontres d&apos;affaires</NavLink>
        <NavLink to="/orga/enquete" className={linkClass}>Sondage</NavLink>
        <NavLink to="/orga/ressources" className={linkClass}>Ressources</NavLink>
        {isAdminRole(user?.role) && (
          <>
            <NavLink to="/orga/audit" className={linkClass}>Audit et logs</NavLink>
            <NavLink to="/orga/utilisateurs" className={linkClass}>Utilisateurs</NavLink>
          </>
        )}
      </nav>

      <div className="shrink-0 border-t border-black pt-3">
        <button
          type="button"
          onClick={() => {
            setAccountError(null)
            setAccountInfo(null)
            setAccountOpen(true)
          }}
          className="flex w-full items-center gap-3 px-2 py-2 text-left transition-colors hover:bg-forest/10"
        >
          <div className="grid h-9 w-9 shrink-0 place-items-center border border-black bg-forest text-[12px] font-semibold text-white">
            {(user?.first_name?.[0] || 'O').toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold text-forest">
              {user ? `${user.first_name} ${user.last_name}` : 'Organisation'}
            </p>
            <p className="truncate text-[12px] text-ink/45">{user?.email}</p>
          </div>
        </button>
      </div>
    </aside>
  )

  return (
    <div className="h-svh overflow-hidden bg-white text-ink">
      <Seo
        title={title}
        description="Espace organisation : labels, visites, rencontres et pilotage de la Semaine de l’industrie 2026."
        path={location.pathname}
        noIndex
      />
      <div className="flex h-full">
        <div className="sticky top-0 hidden h-svh shrink-0 md:block">{sidebar}</div>

        {open && (
          <div className="fixed inset-0 z-50 md:hidden">
            <button type="button" className="absolute inset-0 bg-black/40" aria-label="Fermer" onClick={() => setOpen(false)} />
            <div className="absolute inset-y-0 left-0 border-r border-black bg-white">{sidebar}</div>
          </div>
        )}

        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <header className="flex shrink-0 items-center gap-4 border-b border-black px-4 py-3 sm:px-8">
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

            <div className="ml-auto flex items-center gap-3">{actions}</div>
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

          <main ref={mainRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-8">{children}</main>
        </div>
      </div>

      {accountOpen && user && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto border border-black bg-white p-5">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-[16px] font-semibold text-forest">Mon compte</h3>
              <button
                type="button"
                className="orga-icon-btn"
                aria-label="Fermer"
                onClick={() => setAccountOpen(false)}
              >
                ×
              </button>
            </div>

            {accountError && <p className="mt-3 text-[13px] text-red-700">{accountError}</p>}
            {accountInfo && <p className="mt-3 text-[13px] text-forest">{accountInfo}</p>}

            <form onSubmit={onSaveProfile} className="mt-4 grid gap-3">
              <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-ink/40">Identité</p>
              <label className="text-[13px] font-medium text-forest">
                E-mail
                <input disabled value={user.email} className={`${field} opacity-60`} />
              </label>
              <label className="text-[13px] font-medium text-forest">
                Prénom
                <input required name="first_name" defaultValue={user.first_name} className={field} />
              </label>
              <label className="text-[13px] font-medium text-forest">
                Nom
                <input required name="last_name" defaultValue={user.last_name} className={field} />
              </label>
              <button type="submit" className="orga-btn" disabled={savingProfile}>
                {savingProfile ? 'Enregistrement…' : 'Enregistrer le profil'}
              </button>
            </form>

            <form onSubmit={onSavePassword} className="mt-8 grid gap-3 border-t border-black pt-5">
              <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-ink/40">Mot de passe</p>
              <label className="text-[13px] font-medium text-forest">
                Mot de passe actuel
                <input required type="password" name="current_password" className={field} autoComplete="current-password" />
              </label>
              <label className="text-[13px] font-medium text-forest">
                Nouveau mot de passe
                <input required type="password" name="new_password" minLength={6} className={field} autoComplete="new-password" />
              </label>
              <label className="text-[13px] font-medium text-forest">
                Confirmer
                <input required type="password" name="confirm_password" minLength={6} className={field} autoComplete="new-password" />
              </label>
              <button type="submit" className="orga-btn" disabled={savingPassword}>
                {savingPassword ? 'Modification…' : 'Changer le mot de passe'}
              </button>
            </form>

            <button
              type="button"
              onClick={() => void onLogout()}
              className="mt-6 w-full border border-black px-4 py-2.5 text-[13px] font-medium text-forest hover:bg-forest/10"
            >
              Se déconnecter
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
