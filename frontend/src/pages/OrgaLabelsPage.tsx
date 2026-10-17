import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getStoredUser } from '../api/auth'
import { listLabelRequests, reviewLabelRequest, type LabelRequest } from '../api/labels'
import { OrgaShell } from '../components/layout/OrgaShell'
import { joinRoom, onRealtime } from '../lib/socket'

/* Écran orga : validation des demandes. */
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
  }, [filter, navigate, user?.id, user?.role])

  /* Ajoute en direct une nouvelle demande si elle matche le filtre. */
  useEffect(() => {
    if (!user || user.role !== 'orga') return
    joinRoom('orga')
    return onRealtime<LabelRequest>('label:created', (row) => {
      if (filter && row.status !== filter) return
      setItems((prev) => [row, ...prev.filter((x) => x.id !== row.id)])
    })
  }, [filter, user?.id, user?.role])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter((item) =>
      [
        item.structure_name,
        item.contact_phone,
        item.contact_email,
        item.city,
        item.sector,
        item.max_visitors != null ? String(item.max_visitors) : '',
      ]
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
          className="orga-input w-auto"
        >
          <option value="pending">En attente</option>
          <option value="approved">Approuvées</option>
          <option value="rejected">Refusées</option>
          <option value="">Toutes</option>
        </select>
      }
    >
      {error && <p className="mb-4 text-[14px] text-red-700">{error}</p>}

      <section className="orga-panel !p-0 overflow-x-auto">
        <div className="flex items-center justify-between border-b border-black px-4 py-3">
          <h2 className="text-[15px] font-semibold text-forest">
            {filtered.length} dossier{filtered.length > 1 ? 's' : ''}
          </h2>
          <Link to="/label" className="text-[13px] font-medium text-forest underline underline-offset-2">
            Formulaire public
          </Link>
        </div>

        <table className="orga-table min-w-[880px]">
          <thead>
            <tr>
              <th>Téléphone</th>
              <th>Structure</th>
              <th>Capacité / estimation</th>
              <th>E-mail</th>
              <th>Lieu</th>
              <th>Statut</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={7}>Aucune demande pour ce filtre</td></tr>
            )}
            {filtered.map((item) => (
              <tr key={item.id}>
                <td>
                  <a href={`tel:${item.contact_phone || ''}`} className="font-semibold text-forest underline underline-offset-2">
                    {item.contact_phone || '—'}
                  </a>
                </td>
                <td>
                  <p className="font-semibold text-forest">{item.structure_name}</p>
                  <p className="mt-1 text-ink/50">
                    {item.structure_type === 'ecole' ? 'École' : 'Entreprise'}
                    {item.sector ? ` · ${item.sector}` : ''}
                  </p>
                  {item.products?.length > 0 && (
                    <p className="mt-1 text-ink/40">Produits : {item.products.join(', ')}</p>
                  )}
                </td>
                <td>
                  {item.max_visitors != null ? (
                    <span className="font-semibold text-forest">{item.max_visitors}</span>
                  ) : (
                    '—'
                  )}
                  <p className="mt-1 text-[12px] text-ink/40">
                    {item.structure_type === 'ecole' ? 'élèves / étudiants' : 'visiteurs max.'}
                  </p>
                </td>
                <td>
                  <a href={`mailto:${item.contact_email}`} className="text-ink/70 underline underline-offset-2">
                    {item.contact_email}
                  </a>
                </td>
                <td>{[item.city, item.region].filter(Boolean).join(' · ') || '—'}</td>
                <td><StatusText status={item.status} /></td>
                <td>
                  {item.status === 'pending' ? (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={busyId === item.id}
                        onClick={() => onReview(item.id, 'approved')}
                        className="orga-btn disabled:opacity-50"
                      >
                        Approuver
                      </button>
                      <button
                        type="button"
                        disabled={busyId === item.id}
                        onClick={() => onReview(item.id, 'rejected')}
                        className="orga-btn-ghost disabled:opacity-50"
                      >
                        Refuser
                      </button>
                    </div>
                  ) : (
                    <span className="text-ink/40">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </OrgaShell>
  )
}

/* Libellé de statut sans pastille. */
function StatusText({ status }: { status: LabelRequest['status'] }) {
  const label = { pending: 'En attente', approved: 'Validée', rejected: 'Refusée' } as const
  return <span className="font-medium text-forest">{label[status]}</span>
}
