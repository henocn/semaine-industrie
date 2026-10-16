import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getStoredUser } from '../api/auth'
import { listLabelRequests, reviewLabelRequest, type LabelRequest } from '../api/labels'
import { OrgaNav } from '../components/layout/OrgaNav'
import { WRAP } from '../components/layout/Mark'

/* Écran orga : liste et validation des demandes de label. */
export default function OrgaLabelsPage() {
  const navigate = useNavigate()
  const user = getStoredUser()
  const [items, setItems] = useState<LabelRequest[]>([])
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | ''>('pending')
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  /* Charge les demandes selon le filtre. */
  async function load() {
    try {
      setError(null)
      const data = await listLabelRequests(filter || undefined)
      setItems(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chargement impossible')
      if (String(err).includes('Token') || String(err).includes('Non autorisé') || String(err).includes('Session')) {
        navigate('/login')
      }
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
    <>
      <OrgaNav email={user?.email} />

      <main className="py-12 sm:py-16">
        <div className={WRAP}>
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="display text-4xl">Demandes de label</h1>
              <p className="mt-3 text-ink/65">Validez ou refusez les dossiers déposés en ligne.</p>
            </div>
            <label className="text-[15px] font-medium text-forest">
              Filtre
              <select
                className="ml-3 border-0 border-b border-forest/25 bg-transparent py-2 focus:outline-none"
                value={filter}
                onChange={(e) => setFilter(e.target.value as typeof filter)}
              >
                <option value="pending">En attente</option>
                <option value="approved">Approuvées</option>
                <option value="rejected">Refusées</option>
                <option value="">Toutes</option>
              </select>
            </label>
          </div>

          {error && <p className="mt-6 text-[15px] text-red-700">{error}</p>}

          <ul className="mt-10 border-t border-forest/15">
            {items.length === 0 && !error && (
              <li className="py-8 text-ink/55">Aucune demande pour ce filtre.</li>
            )}
            {items.map((item) => (
              <li key={item.id} className="grid gap-4 border-b border-forest/15 py-6 md:grid-cols-[1fr_auto] md:items-start">
                <div>
                  <p className="text-xl font-semibold text-forest">{item.structure_name}</p>
                  <p className="mt-1 text-[15px] text-ink/60">
                    {item.structure_type === 'ecole' ? 'École' : 'Entreprise'}
                    {item.sector ? ` · ${item.sector}` : ''}
                    {item.city ? ` · ${item.city}` : ''}
                  </p>
                  <p className="mt-2 text-[15px] text-ink/70">
                    {item.contact_name} — {item.contact_email}
                    {item.contact_phone ? ` — ${item.contact_phone}` : ''}
                  </p>
                  {item.description && (
                    <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-ink/75">{item.description}</p>
                  )}
                  {item.products?.length > 0 && (
                    <p className="mt-2 text-[15px] text-ink/55">Produits : {item.products.join(', ')}</p>
                  )}
                  <p className="mt-3 text-xs uppercase tracking-wide text-ink/40">{item.status}</p>
                </div>
                {item.status === 'pending' && (
                  <div className="flex gap-3">
                    <button
                      type="button"
                      disabled={busyId === item.id}
                      onClick={() => onReview(item.id, 'approved')}
                      className="bg-forest px-5 py-3 text-[15px] font-semibold text-white hover:bg-ink disabled:opacity-60"
                    >
                      Approuver
                    </button>
                    <button
                      type="button"
                      disabled={busyId === item.id}
                      onClick={() => onReview(item.id, 'rejected')}
                      className="border border-forest/30 px-5 py-3 text-[15px] font-semibold text-forest hover:bg-sage disabled:opacity-60"
                    >
                      Refuser
                    </button>
                  </div>
                )}
                {item.status === 'approved' && (
                  <span className="text-[15px] font-medium text-leaf">Validée</span>
                )}
                {item.status === 'rejected' && (
                  <span className="text-[15px] font-medium text-ink/45">Refusée</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      </main>
    </>
  )
}
