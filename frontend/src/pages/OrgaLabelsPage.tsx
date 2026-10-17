import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getStoredUser } from '../api/auth'
import {
  listLabelRequests,
  reviewLabelRequest,
  updateLabelRequest,
  type LabelRequest,
} from '../api/labels'
import { OrgaShell } from '../components/layout/OrgaShell'
import { joinRoom, onRealtime } from '../lib/socket'

const field =
  'mt-1 w-full border border-black bg-white px-3 py-2 text-[14px] text-ink focus:outline-none'

/* Écran orga : validation des demandes. */
export default function OrgaLabelsPage() {
  const navigate = useNavigate()
  const user = getStoredUser()
  const [items, setItems] = useState<LabelRequest[]>([])
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | ''>('')
  const [query, setQuery] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [editing, setEditing] = useState<LabelRequest | null>(null)

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

  /* Ajoute / met à jour en direct. */
  useEffect(() => {
    if (!user || user.role !== 'orga') return
    joinRoom('orga')
    const offCreated = onRealtime<LabelRequest>('label:created', (row) => {
      if (filter && row.status !== filter) return
      setItems((prev) => [row, ...prev.filter((x) => x.id !== row.id)])
    })
    const offUpdated = onRealtime<LabelRequest>('label:updated', (row) => {
      setItems((prev) => {
        if (filter && row.status !== filter) return prev.filter((x) => x.id !== row.id)
        return prev.map((x) => (x.id === row.id ? row : x))
      })
      setEditing((cur) => (cur?.id === row.id ? row : cur))
    })
    return () => {
      offCreated()
      offUpdated()
    }
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

  /* Enregistre les modifications du dossier. */
  async function onSaveEdit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!editing) return
    setBusyId(editing.id)
    setError(null)
    const fd = new FormData(e.currentTarget)
    const structure_type = String(fd.get('structure_type') || editing.structure_type) as 'entreprise' | 'ecole'
    const productsRaw = String(fd.get('products') || '')
    try {
      const updated = await updateLabelRequest(editing.id, {
        structure_name: String(fd.get('structure_name') || ''),
        structure_type,
        sector: structure_type === 'entreprise' ? String(fd.get('sector') || '') || undefined : undefined,
        region: String(fd.get('region') || '') || undefined,
        city: String(fd.get('city') || '') || undefined,
        contact_email: String(fd.get('contact_email') || ''),
        contact_phone: String(fd.get('contact_phone') || ''),
        max_visitors: fd.get('max_visitors') ? Number(fd.get('max_visitors')) : null,
        description: String(fd.get('description') || '') || undefined,
        products:
          structure_type === 'entreprise'
            ? productsRaw.split(',').map((p) => p.trim()).filter(Boolean)
            : [],
        safety_rules:
          structure_type === 'entreprise' ? String(fd.get('safety_rules') || '') || undefined : undefined,
      })
      setItems((prev) => prev.map((x) => (x.id === updated.id ? updated : x)))
      setEditing(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Modification impossible')
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
          <option value="">Toutes</option>
          <option value="pending">En attente</option>
          <option value="approved">Approuvées</option>
          <option value="rejected">Refusées</option>
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

        <table className="orga-table min-w-[820px]">
          <thead>
            <tr>
              <th className="w-12">#</th>
              <th>Structure</th>
              <th>Capacité / estimation</th>
              <th>Contact</th>
              <th>Lieu</th>
              <th className="w-28">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={6}>Aucune demande pour ce filtre</td></tr>
            )}
            {filtered.map((item, index) => (
              <tr key={item.id} className={rowClass(item.status)}>
                <td className="font-semibold text-forest">{index + 1}</td>
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
                  <a
                    href={item.contact_phone ? `tel:${item.contact_phone}` : undefined}
                    className="block font-semibold text-forest underline underline-offset-2"
                  >
                    {item.contact_phone || '—'}
                  </a>
                  <a
                    href={`mailto:${item.contact_email}`}
                    className="mt-1 block text-ink/60 underline underline-offset-2"
                  >
                    {item.contact_email}
                  </a>
                </td>
                <td>{[item.city, item.region].filter(Boolean).join(' · ') || '—'}</td>
                <td>
                  <div className="flex flex-wrap gap-1.5">
                    <IconButton
                      label="Modifier"
                      disabled={busyId === item.id}
                      onClick={() => setEditing(item)}
                    >
                      <IconEdit />
                    </IconButton>
                    {item.status === 'pending' && (
                      <>
                        <IconButton
                          label="Approuver"
                          variant="ok"
                          disabled={busyId === item.id}
                          onClick={() => onReview(item.id, 'approved')}
                        >
                          <IconCheck />
                        </IconButton>
                        <IconButton
                          label="Refuser"
                          variant="danger"
                          disabled={busyId === item.id}
                          onClick={() => onReview(item.id, 'rejected')}
                        >
                          <IconX />
                        </IconButton>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form
            onSubmit={onSaveEdit}
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto border border-black bg-white p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-[16px] font-semibold text-forest">Modifier la demande</h3>
              <button type="button" className="orga-icon-btn" aria-label="Fermer" onClick={() => setEditing(null)}>
                <IconX />
              </button>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="text-[13px] font-medium text-forest sm:col-span-2">
                Structure
                <input required name="structure_name" defaultValue={editing.structure_name} className={field} />
              </label>
              <label className="text-[13px] font-medium text-forest">
                Type
                <select name="structure_type" defaultValue={editing.structure_type} className={field}>
                  <option value="entreprise">Entreprise</option>
                  <option value="ecole">École</option>
                </select>
              </label>
              <label className="text-[13px] font-medium text-forest">
                Capacité / estimation
                <input
                  type="number"
                  min={1}
                  name="max_visitors"
                  defaultValue={editing.max_visitors ?? ''}
                  className={field}
                />
              </label>
              {editing.structure_type === 'entreprise' && (
                <label className="text-[13px] font-medium text-forest sm:col-span-2">
                  Secteur
                  <input name="sector" defaultValue={editing.sector || ''} className={field} />
                </label>
              )}
              <label className="text-[13px] font-medium text-forest">
                Région
                <input name="region" defaultValue={editing.region || ''} className={field} />
              </label>
              <label className="text-[13px] font-medium text-forest">
                Ville
                <input name="city" defaultValue={editing.city || ''} className={field} />
              </label>
              <label className="text-[13px] font-medium text-forest">
                Téléphone
                <input required name="contact_phone" defaultValue={editing.contact_phone || ''} className={field} />
              </label>
              <label className="text-[13px] font-medium text-forest">
                E-mail
                <input required type="email" name="contact_email" defaultValue={editing.contact_email} className={field} />
              </label>
              {editing.structure_type === 'entreprise' && (
                <label className="text-[13px] font-medium text-forest sm:col-span-2">
                  Produits (virgules)
                  <input name="products" defaultValue={(editing.products || []).join(', ')} className={field} />
                </label>
              )}
              <label className="text-[13px] font-medium text-forest sm:col-span-2">
                Description
                <textarea name="description" rows={3} defaultValue={editing.description || ''} className={field} />
              </label>
              {editing.structure_type === 'entreprise' && (
                <label className="text-[13px] font-medium text-forest sm:col-span-2">
                  Règles de sécurité
                  <textarea name="safety_rules" rows={2} defaultValue={editing.safety_rules || ''} className={field} />
                </label>
              )}
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button type="button" className="orga-btn-ghost" onClick={() => setEditing(null)}>
                Annuler
              </button>
              <button type="submit" className="orga-btn" disabled={busyId === editing.id}>
                Enregistrer
              </button>
            </div>
          </form>
        </div>
      )}
    </OrgaShell>
  )
}

/* Classe de fond selon le statut. */
function rowClass(status: LabelRequest['status']) {
  if (status === 'approved') return 'orga-row-approved'
  if (status === 'rejected') return 'orga-row-rejected'
  return 'orga-row-pending'
}

/* Bouton action icône seule. */
function IconButton({
  label,
  children,
  onClick,
  disabled,
  variant,
}: {
  label: string
  children: ReactNode
  onClick: () => void
  disabled?: boolean
  variant?: 'ok' | 'danger'
}) {
  const extra = variant === 'ok' ? 'orga-icon-btn--ok' : variant === 'danger' ? 'orga-icon-btn--danger' : ''
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`orga-icon-btn ${extra}`}
    >
      {children}
    </button>
  )
}

/* Icône crayon. */
function IconEdit() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
    </svg>
  )
}

/* Icône validation. */
function IconCheck() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}

/* Icône fermer / refuser. */
function IconX() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  )
}
