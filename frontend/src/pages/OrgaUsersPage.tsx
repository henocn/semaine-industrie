import { useEffect, useState, type FormEvent } from 'react'
import { createUser, listUsers, updateUser, type OrgaUser, type StaffRole } from '../api/users'
import { OrgaShell } from '../components/layout/OrgaShell'
import { formatPresence } from '../lib/presence'
import { joinRoom, onRealtime } from '../lib/socket'

const field =
  'mt-1 w-full border border-black bg-white px-3 py-2 text-[14px] text-ink focus:outline-none'

/* Libellé du rôle. */
function roleLabel(role: string) {
  if (role === 'admin') return 'Admin'
  if (role === 'simple' || role === 'orga') return 'Simple'
  return role
}

/* Gestion des comptes backoffice (admin uniquement). */
export default function OrgaUsersPage() {
  const [users, setUsers] = useState<OrgaUser[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<OrgaUser | null>(null)
  const [, setTick] = useState(0)

  /* Charge la liste. */
  async function load() {
    try {
      setError(null)
      setUsers(await listUsers())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur')
    }
  }

  useEffect(() => {
    void load()
    joinRoom('orga')
    const off = onRealtime<{ online: Record<string, boolean> }>('presence:update', (payload) => {
      const online = payload?.online || {}
      setUsers((prev) =>
        prev.map((u) => ({
          ...u,
          online: Boolean(online[u.id]),
          last_seen_at: online[u.id] ? new Date().toISOString() : u.last_seen_at,
        })),
      )
    })
    /* Rafraîchit les libellés relatifs (min / heures). */
    const timer = window.setInterval(() => setTick((n) => n + 1), 60000)
    return () => {
      off()
      window.clearInterval(timer)
    }
  }, [])

  /* Crée un compte. */
  async function onCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setBusy(true)
    try {
      await createUser({
        email: String(fd.get('email') || ''),
        first_name: String(fd.get('first_name') || ''),
        last_name: String(fd.get('last_name') || ''),
        role: String(fd.get('role') || 'simple') as StaffRole,
        password: String(fd.get('password') || ''),
      })
      e.currentTarget.reset()
      setShowAdd(false)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Création impossible')
    } finally {
      setBusy(false)
    }
  }

  /* Enregistre une modification (mot de passe vide = inchangé). */
  async function onSaveEdit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!editing) return
    const fd = new FormData(e.currentTarget)
    const password = String(fd.get('password') || '')
    setBusy(true)
    try {
      await updateUser(editing.id, {
        first_name: String(fd.get('first_name') || ''),
        last_name: String(fd.get('last_name') || ''),
        role: String(fd.get('role') || 'simple') as StaffRole,
        is_active: fd.get('is_active') === 'on',
        password,
      })
      setEditing(null)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Mise à jour impossible')
    } finally {
      setBusy(false)
    }
  }

  return (
    <OrgaShell
      title="Utilisateurs"
      actions={
        <button type="button" className="orga-btn" onClick={() => setShowAdd((v) => !v)}>
          {showAdd ? 'Fermer' : 'Ajouter'}
        </button>
      }
    >
      {error && <p className="mb-4 text-[14px] text-red-700">{error}</p>}

      {showAdd && (
        <section className="orga-panel mb-4">
          <h2 className="text-[15px] font-semibold text-forest">Nouveau compte</h2>
          <form onSubmit={onCreate} className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="text-[13px] font-medium text-forest">
              E-mail
              <input required type="email" name="email" className={field} />
            </label>
            <label className="text-[13px] font-medium text-forest">
              Rôle
              <select name="role" defaultValue="simple" className={field}>
                <option value="simple">Simple</option>
                <option value="admin">Admin</option>
              </select>
            </label>
            <label className="text-[13px] font-medium text-forest">
              Prénom
              <input required name="first_name" className={field} />
            </label>
            <label className="text-[13px] font-medium text-forest">
              Nom
              <input required name="last_name" className={field} />
            </label>
            <label className="text-[13px] font-medium text-forest sm:col-span-2">
              Mot de passe
              <input required type="password" name="password" minLength={6} className={field} />
            </label>
            <div className="sm:col-span-2">
              <button type="submit" disabled={busy} className="orga-btn disabled:opacity-50">
                Créer
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="orga-panel !p-0 overflow-x-auto">
        <table className="orga-table min-w-[720px]">
          <thead>
            <tr>
              <th>Nom</th>
              <th>E-mail</th>
              <th>Rôle</th>
              <th>Présence</th>
              <th>Statut</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 && (
              <tr>
                <td colSpan={6} className="py-10 text-ink/40">
                  Aucun utilisateur
                </td>
              </tr>
            )}
            {users.map((u) => {
              const presence = formatPresence(u.online, u.last_seen_at || u.last_login_at)
              return (
                <tr key={u.id} className={u.is_active ? 'orga-row-approved' : 'orga-row-rejected'}>
                  <td className="font-semibold text-forest">
                    {u.first_name} {u.last_name}
                  </td>
                  <td>{u.email}</td>
                  <td>{roleLabel(u.role)}</td>
                  <td>
                    <span className="inline-flex items-center gap-2 text-[13px]">
                      <span
                        className={`h-2 w-2 shrink-0 rounded-full ${
                          presence.tone === 'online'
                            ? 'bg-[#00A85A]'
                            : presence.tone === 'recent'
                              ? 'bg-[#F6C800]'
                              : 'bg-ink/25'
                        }`}
                        aria-hidden="true"
                      />
                      <span
                        className={
                          presence.tone === 'online' ? 'font-medium text-forest' : 'text-ink/60'
                        }
                      >
                        {presence.label}
                      </span>
                    </span>
                  </td>
                  <td>{u.is_active ? 'Actif' : 'Inactif'}</td>
                  <td>
                    <button
                      type="button"
                      disabled={busy}
                      className="orga-btn-ghost px-3 py-1.5 text-[12px] disabled:opacity-50"
                      onClick={() => setEditing(u)}
                    >
                      Modifier
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </section>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form
            onSubmit={onSaveEdit}
            className="w-full max-w-md border border-black bg-white p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-[16px] font-semibold text-forest">Modifier</h3>
              <button type="button" className="orga-icon-btn" onClick={() => setEditing(null)}>
                ×
              </button>
            </div>
            <div className="mt-4 grid gap-3">
              <label className="text-[13px] font-medium text-forest">
                E-mail
                <input disabled value={editing.email} className={`${field} opacity-60`} />
              </label>
              <label className="text-[13px] font-medium text-forest">
                Prénom
                <input required name="first_name" defaultValue={editing.first_name} className={field} />
              </label>
              <label className="text-[13px] font-medium text-forest">
                Nom
                <input required name="last_name" defaultValue={editing.last_name} className={field} />
              </label>
              <label className="text-[13px] font-medium text-forest">
                Rôle
                <select
                  name="role"
                  defaultValue={editing.role === 'admin' ? 'admin' : 'simple'}
                  className={field}
                >
                  <option value="simple">Simple</option>
                  <option value="admin">Admin</option>
                </select>
              </label>
              <label className="text-[13px] font-medium text-forest">
                Mot de passe
                <input
                  type="password"
                  name="password"
                  minLength={6}
                  className={field}
                  placeholder="Laisser vide pour ne pas changer"
                />
              </label>
              <label className="flex items-center gap-2 text-[13px] text-ink/70">
                <input type="checkbox" name="is_active" defaultChecked={editing.is_active} />
                Compte actif
              </label>
              <button type="submit" disabled={busy} className="orga-btn disabled:opacity-50">
                Enregistrer
              </button>
            </div>
          </form>
        </div>
      )}
    </OrgaShell>
  )
}
