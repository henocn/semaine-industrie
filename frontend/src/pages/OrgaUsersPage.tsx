import { useEffect, useState, type FormEvent } from 'react'
import { createUser, listUsers, updateUser, type OrgaUser } from '../api/users'
import { OrgaShell } from '../components/layout/OrgaShell'

const field =
  'mt-1 w-full border border-black bg-white px-3 py-2 text-[14px] text-ink focus:outline-none'

const ROLE_LABEL: Record<OrgaUser['role'], string> = {
  orga: 'Organisation',
  enseignant: 'Enseignant',
  referent_entreprise: 'Référent entreprise',
  b2b: 'B2B',
}

/* Gestion des comptes backoffice. */
export default function OrgaUsersPage() {
  const [users, setUsers] = useState<OrgaUser[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [showAdd, setShowAdd] = useState(false)

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
        role: String(fd.get('role') || 'orga') as OrgaUser['role'],
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

  /* Active / désactive. */
  async function onToggle(user: OrgaUser) {
    setBusy(true)
    try {
      await updateUser(user.id, { is_active: !user.is_active })
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
              <select name="role" defaultValue="orga" className={field}>
                <option value="orga">Organisation</option>
                <option value="enseignant">Enseignant</option>
                <option value="referent_entreprise">Référent entreprise</option>
                <option value="b2b">B2B</option>
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
              Mot de passe temporaire
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
              <th>Dernière connexion</th>
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
            {users.map((u) => (
              <tr key={u.id} className={u.is_active ? 'orga-row-approved' : 'orga-row-rejected'}>
                <td className="font-semibold text-forest">
                  {u.first_name} {u.last_name}
                </td>
                <td>{u.email}</td>
                <td>{ROLE_LABEL[u.role] || u.role}</td>
                <td>
                  {u.last_login_at
                    ? new Date(u.last_login_at).toLocaleString('fr-FR')
                    : '—'}
                </td>
                <td>{u.is_active ? 'Actif' : 'Inactif'}</td>
                <td>
                  <button
                    type="button"
                    disabled={busy}
                    className="orga-btn-ghost px-3 py-1.5 text-[12px] disabled:opacity-50"
                    onClick={() => void onToggle(u)}
                  >
                    {u.is_active ? 'Désactiver' : 'Activer'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </OrgaShell>
  )
}
