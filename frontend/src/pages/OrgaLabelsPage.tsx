import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getStoredUser } from '../api/auth'
import { listLabelRequests, reviewLabelRequest, type LabelRequest } from '../api/labels'
import { OrgaShell } from '../components/layout/OrgaShell'

/* Écran orga : validation des demandes — shell backoffice. */
export default function OrgaLabelsPage() {
  const navigate = useNavigate()
  const user = getStoredUser()
  const [items, setItems] = useState<LabelRequest[]>([])
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | ''>('pending')
  const [query, setQuery] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  /* Charge les demandes selon le filtre. */
  async function load() {
    try {
      setError(null)
      setItems(await listLabelRequests(filter || undefined))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chargement impossible')
      navigate('/login')
    }
  }

  useEffect(() => {
    if (!user || user.role !== 'orga') {
      navigate('/login')
      return
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter((item) =>
      [item.structure_name, item.contact_name, item.contact_email, item.city, item.sector]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    )
  }, [items, query])

  /* Approuve ou rejette une demande. */
  async function onReview(id: string, status: 'approved' | 'rejected') {
    setBusyId(id)
    try {
      await reviewLabelRequest(id, status)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action impossible')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <OrgaShell
      title="Demandes label"
      searchPlaceholder="Rechercher une structure…"
      onSearch={setQuery}
      actions={
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as typeof filter)}
          className="rounded-xl border-0 bg-white px-3 py-2.5 text-[13px] font-medium text-forest shadow-sm focus:outline-none"
        >
          <option value="pending">En attente</option>
          <option value="approved">Approuvées</option>
          <option value="rejected">Refusées</option>
          <option value="">Toutes</option>
        </select>
      }
    >
      {error && <p className="mb-4 text-[14px] text-red-700">{error}</p>}

      <section className="rounded-2xl bg-white p-4 shadow-sm sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-forest">
            {filtered.length} dossier{filtered.length > 1 ? 's' : ''}
          </h2>
          <Link to="/label" className="text-[13px] font-medium text-forest hover:underline">
            Formulaire public
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-[13px]">
            <thead>
              <tr className="border-b border-black/5 text-ink/40">
                <th className="pb-3 font-medium">Structure</th>
                <th className="pb-3 font-medium">Contact</th>
                <th className="pb-3 font-medium">Lieu</th>
                <th className="pb-3 font-medium">Statut</th>
                <th className="pb-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="py-10 text-ink/40">Aucune demande pour ce filtre</td></tr>
              )}
              {filtered.map((item) => (
                <tr key={item.id} className="border-b border-black/[0.04] align-top last:border-0">
                  <td className="py-4">
                    <p className="font-semibold text-forest">{item.structure_name}</p>
                    <p className="mt-1 text-ink/45">
                      {item.structure_type === 'ecole' ? 'École' : 'Entreprise'}
                      {item.sector ? ` · ${item.sector}` : ''}
                    </p>
                    {item.products?.length > 0 && (
                      <p className="mt-1 text-ink/40">Produits : {item.products.join(', ')}</p>
                    )}
                  </td>
                  <td className="py-4 text-ink/60">
                    <p>{item.contact_name}</p>
                    <p className="mt-1">{item.contact_email}</p>
                  </td>
                  <td className="py-4 text-ink/55">{[item.city, item.region].filter(Boolean).join(' · ') || '—'}</td>
                  <td className="py-4">
                    <StatusPill status={item.status} />
                  </td>
                  <td className="py-4">
                    {item.status === 'pending' ? (
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={busyId === item.id}
                          onClick={() => onReview(item.id, 'approved')}
                          className="rounded-lg bg-forest px-3 py-2 text-[12px] font-semibold text-white hover:bg-ink disabled:opacity-50"
                        >
                          Approuver
                        </button>
                        <button
                          type="button"
                          disabled={busyId === item.id}
                          onClick={() => onReview(item.id, 'rejected')}
                          className="rounded-lg bg-[#f3f4f6] px-3 py-2 text-[12px] font-semibold text-ink/70 hover:bg-[#e5e7eb] disabled:opacity-50"
                        >
                          Refuser
                        </button>
                      </div>
                    ) : (
                      <span className="text-ink/35">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </OrgaShell>
  )
}

/* Pastille de statut colorée. */
function StatusPill({ status }: { status: LabelRequest['status'] }) {
  const map = {
    pending: 'bg-[#fff8e6] text-[#b8860b]',
    approved: 'bg-[#eef7e8] text-leaf',
    rejected: 'bg-[#f3f4f6] text-ink/45',
  } as const
  const label = { pending: 'En attente', approved: 'Validée', rejected: 'Refusée' } as const
  return (
    <span className={`rounded-full px-2.5 py-1 text-[12px] font-medium ${map[status]}`}>
      {label[status]}
    </span>
  )
}
