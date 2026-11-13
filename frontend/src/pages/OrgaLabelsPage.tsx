import { Fragment, useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  addKitFile,
  createLabelRequestOrga,
  deleteKitFile,
  deleteLabelRequest,
  formatLabelAddress,
  formatStructureType,
  getLabelRequestQr,
  googleMapsUrl,
  listLabelRequests,
  reviewLabelRequest,
  updateLabelRequest,
  type LabelRequest,
  type QrBatchItem,
} from '../api/labels'
import { OrgaShell } from '../components/layout/OrgaShell'
import { LocationField } from '../components/map/LocationField'
import { notifyLabelPendingChanged } from '../lib/labelPending'
import { joinRoom, onRealtime } from '../lib/socket'
import { IconButton, IconCheck, IconX, IconEdit, IconTrash } from '../components/ui/IconButton'
import { PhoneField } from '../components/ui/PhoneField'
import { ExportBar, SelectAllHeader, SelectCell } from '../components/orga/RowSelection'
import { useRowSelection } from '../lib/useRowSelection'
import { useConfirm } from '../lib/useConfirm'
import { SortControl } from '../components/orga/SortControl'
import { useTableSort, type SortAccessors } from '../lib/useTableSort'
import { excelDate, statusLabel, type ExcelColumn } from '../lib/excel'

/* Colonnes de l'export Excel des demandes de label. */
const EXPORT_COLUMNS: ExcelColumn<LabelRequest>[] = [
  { header: 'Code de suivi', width: 14, value: (r) => r.label_code || r.tracking_code || '' },
  { header: 'Structure', width: 32, value: (r) => r.structure_name },
  { header: 'Type', width: 14, value: (r) => formatStructureType(r.structure_type) },
  { header: 'Statut', width: 12, value: (r) => statusLabel(r.status) },
  { header: 'Contact', width: 24, value: (r) => r.contact_name },
  { header: 'Téléphone', width: 18, value: (r) => r.contact_phone },
  { header: 'E-mail', width: 28, value: (r) => r.contact_email },
  { header: 'Secteur', width: 20, value: (r) => r.sector },
  { header: 'Adresse', width: 32, value: (r) => r.address || [r.city, r.region].filter(Boolean).join(', ') },
  { header: 'Visiteurs max.', width: 14, value: (r) => r.max_visitors },
  { header: 'Date de demande', width: 18, value: (r) => excelDate(r.createdAt || r.created_at) },
]

/* Kit et carte QR des industries : plus envoyés ni affichés (true pour les remettre). */
const SHOW_KIT_AND_QR = false

const KIT_ACCEPT =
  '.pdf,.doc,.docx,.jpg,.jpeg,.png,.webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png,image/webp'

const field =
  'mt-1 w-full border border-black bg-white px-3 py-2 text-[14px] text-ink focus:outline-none'

/* Extension courte pour la liste kit. */
function kitExtLabel(name: string, mime?: string | null) {
  const fromName = name.includes('.') ? name.split('.').pop() : ''
  if (fromName) return fromName.toUpperCase().slice(0, 5)
  if (mime?.includes('pdf')) return 'PDF'
  if (mime?.includes('word') || mime?.includes('document')) return 'DOC'
  if (mime?.startsWith('image/')) return 'IMG'
  return 'FILE'
}

type FormMode = 'create' | 'edit'

/* Tri : date de la demande, nom de la structure, puis statut (en attente, approuvée, refusée). */
const LABEL_SORT: SortAccessors<LabelRequest> = {
  date: (r) => r.createdAt || r.created_at,
  name: (r) => r.structure_name,
  status: (r) => ({ pending: 0, approved: 1, rejected: 2 } as Record<string, number>)[r.status] ?? 3,
}

/* Écran orga : validation et gestion des labels. */
export default function OrgaLabelsPage() {
  const [items, setItems] = useState<LabelRequest[]>([])
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | ''>('')
  const [query, setQuery] = useState('')
  const [error, setError] = useState<string | null>(null)
  const { confirm, modal } = useConfirm()
  const [info, setInfo] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [formMode, setFormMode] = useState<FormMode | null>(null)
  const [editing, setEditing] = useState<LabelRequest | null>(null)
  const [formType, setFormType] = useState<'entreprise' | 'ecole'>('entreprise')
  const [editLat, setEditLat] = useState<number | null>(null)
  const [editLng, setEditLng] = useState<number | null>(null)
  const [approveTarget, setApproveTarget] = useState<LabelRequest | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<LabelRequest | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedQr, setSelectedQr] = useState<QrBatchItem | null>(null)

  /* Ouvre le formulaire d'ajout. */
  function openCreate() {
    setFormMode('create')
    setEditing(null)
    setFormType('entreprise')
    setEditLat(null)
    setEditLng(null)
  }

  /* Ouvre le formulaire d’édition, y compris après acceptation. */
  function openEdit(item: LabelRequest) {
    const a = Number(item.lat)
    const b = Number(item.lng)
    setEditLat(Number.isFinite(a) ? a : null)
    setEditLng(Number.isFinite(b) ? b : null)
    setFormType(item.structure_type)
    setEditing(item)
    setFormMode('edit')
  }

  /* Ferme le formulaire ajout/édition. */
  function closeForm() {
    setFormMode(null)
    setEditing(null)
  }

  /* Charge les demandes selon le filtre. */
  async function load() {
    try {
      setError(null)
      setItems(await listLabelRequests(filter || undefined))
      notifyLabelPendingChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chargement impossible')
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter])

  /* Ajoute / met à jour en direct. */
  useEffect(() => {
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
    const offDeleted = onRealtime<{ id: string }>('label:deleted', ({ id }) => {
      setItems((prev) => prev.filter((x) => x.id !== id))
      setSelectedId((cur) => (cur === id ? null : cur))
    })
    return () => {
      offCreated()
      offUpdated()
      offDeleted()
    }
  }, [filter])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter((item) =>
      [
        item.label_code || item.tracking_code,
        item.structure_name,
        item.contact_phone,
        item.contact_email,
        formatLabelAddress(item),
        item.sector,
        formatStructureType(item.structure_type),
      ]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    )
  }, [items, query])
  const sort = useTableSort(filtered, LABEL_SORT, filter)
  const picked = useRowSelection(sort.sorted)

  const selected = useMemo(
    () => filtered.find((x) => x.id === selectedId) || items.find((x) => x.id === selectedId) || null,
    [filtered, items, selectedId],
  )

  /* Charge le QR quand une ligne acceptée est ouverte. */
  useEffect(() => {
    if (!SHOW_KIT_AND_QR) return
    if (!selected || selected.status !== 'approved') {
      setSelectedQr(null)
      return
    }
    let cancelled = false
    getLabelRequestQr(selected.id)
      .then((qr) => {
        if (!cancelled) setSelectedQr(qr)
      })
      .catch(() => {
        if (!cancelled) setSelectedQr(null)
      })
    return () => {
      cancelled = true
    }
  }, [selected?.id, selected?.status])

  /* Rejette une demande. */
  async function onReject(id: string) {
    const name = items.find((row) => row.id === id)?.structure_name || 'Cette demande'
    if (!(await confirm({
      title: 'Refuser la demande ?',
      message: `${name} sera prévenu par e-mail et sur WhatsApp. Il ne restera ensuite que la suppression.`,
      confirmLabel: 'Refuser',
      danger: true,
    }))) return
    setBusyId(id)
    try {
      await reviewLabelRequest(id, 'rejected')
      notifyLabelPendingChanged()
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action impossible')
    } finally {
      setBusyId(null)
    }
  }

  /* Approuve la demande, sans fichier à joindre. */
  async function onConfirmApprove(e: FormEvent) {
    e.preventDefault()
    if (!approveTarget) return
    setBusyId(approveTarget.id)
    setError(null)
    try {
      await reviewLabelRequest(approveTarget.id, 'approved')
      setApproveTarget(null)
      notifyLabelPendingChanged()
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Approbation impossible')
    } finally {
      setBusyId(null)
    }
  }

  /* Confirme la suppression. */
  async function onConfirmDelete() {
    if (!deleteTarget) return
    setBusyId(deleteTarget.id)
    setError(null)
    try {
      await deleteLabelRequest(deleteTarget.id)
      setDeleteTarget(null)
      notifyLabelPendingChanged()
      await load()
      setInfo('Dossier supprimé')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Suppression impossible')
    } finally {
      setBusyId(null)
    }
  }

  /* Ajoute un fichier au kit. */
  async function onAddKitFile(item: LabelRequest, file: File | null, title?: string) {
    if (!file) return
    setBusyId(item.id)
    setError(null)
    try {
      await addKitFile(item.id, file, title)
      setInfo(`Fichier ajouté au kit de ${item.structure_name}`)
      setSelectedId(item.id)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ajout au kit impossible')
    } finally {
      setBusyId(null)
    }
  }

  /* Supprime un fichier du kit. */
  async function onDeleteKitFile(item: LabelRequest, fileId: string) {
    if (!window.confirm('Supprimer ce fichier du kit ?')) return
    setBusyId(item.id)
    setError(null)
    try {
      await deleteKitFile(item.id, fileId)
      setInfo('Fichier retiré du kit')
      setSelectedId(item.id)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Suppression impossible')
    } finally {
      setBusyId(null)
    }
  }

  /* Enregistre ajout ou modification. */
  async function onSaveForm(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)
    const structure_type = String(fd.get('structure_type') || formType) as 'entreprise' | 'ecole'
    const productsRaw = String(fd.get('products') || '')
    const payload = {
      structure_name: String(fd.get('structure_name') || ''),
      structure_type,
      sector: structure_type === 'entreprise' ? String(fd.get('sector') || '') || undefined : undefined,
      address: String(fd.get('address') || '') || undefined,
      contact_email: String(fd.get('contact_email') || ''),
      contact_phone: String(fd.get('contact_phone') || ''),
      contact_opt_in: true,
      max_visitors: fd.get('max_visitors') ? Number(fd.get('max_visitors')) : null,
      description: String(fd.get('description') || '') || undefined,
      products:
        structure_type === 'entreprise'
          ? productsRaw.split(',').map((p) => p.trim()).filter(Boolean)
          : [],
      lat: editLat,
      lng: editLng,
    }

    if (formMode === 'create') {
      setBusyId('create')
      try {
        await createLabelRequestOrga(payload)
        closeForm()
        notifyLabelPendingChanged()
        await load()
        setInfo('Label ajouté')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Ajout impossible')
      } finally {
        setBusyId(null)
      }
      return
    }

    if (!editing) return
    setBusyId(editing.id)
    try {
      const updated = await updateLabelRequest(editing.id, payload)
      setItems((prev) => prev.map((x) => (x.id === updated.id ? updated : x)))
      closeForm()
      notifyLabelPendingChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Modification impossible')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <OrgaShell
      title="Demandes de labels"
      searchPlaceholder="Rechercher une structure…"
      onSearch={setQuery}
      actions={
        <>
          <button type="button" className="orga-btn" onClick={openCreate}>
            Ajouter
          </button>
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
        </>
      }
    >
      {error && <p className="mb-4 text-[14px] text-red-700">{error}</p>}
      {info && <p className="mb-4 text-[14px] text-forest">{info}</p>}

      <ExportBar selection={picked} filename="labels" sheet="Demandes de label" columns={EXPORT_COLUMNS} />
      <section className="orga-panel !p-0 overflow-x-auto">
        <div className="flex items-center justify-between border-b border-black px-4 py-3">
          <h2 className="text-[15px] font-semibold text-forest">
            {filtered.length} demande{filtered.length > 1 ? 's' : ''} de label
          </h2>
          <SortControl order={sort.order} onChange={sort.setOrder} />
        </div>

        <table className="orga-table min-w-[640px]">
          <thead>
            <tr>
              <SelectAllHeader selection={picked} />
              <th className="w-32">Code de suivi</th>
              <th>Structure</th>
              <th className="w-36">Contact</th>
              <th className="w-28">Type</th>
              <th className="w-36">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={6}>Aucune demande pour ce filtre</td></tr>
            )}
            {sort.sorted.map((item) => (
              <Fragment key={item.id}>
              <tr
                className={`${rowClass(item.status)} cursor-pointer ${
                  selectedId === item.id ? 'bg-forest/10' : ''
                }`}
                onClick={() => setSelectedId(item.id === selectedId ? null : item.id)}
              >
                <SelectCell selection={picked} id={item.id} />
                <td className="font-semibold text-forest">
                  {item.label_code || item.tracking_code || '—'}
                </td>
                <td className="font-medium text-forest">{item.structure_name}</td>
                <td>
                  <a
                    href={item.contact_phone ? `tel:${item.contact_phone}` : undefined}
                    className="font-semibold text-forest underline underline-offset-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {item.contact_phone || '—'}
                  </a>
                </td>
                <td>{formatStructureType(item.structure_type)}</td>
                <td onClick={(e) => e.stopPropagation()}>
                  <div className="flex flex-wrap gap-1.5">
                    {item.status === 'pending' && (
                      <>
                        <IconButton
                          label="Approuver"
                          variant="ok"
                          disabled={busyId === item.id}
                          onClick={() => setApproveTarget(item)}
                        >
                          <IconCheck />
                        </IconButton>
                        <IconButton
                          label="Refuser"
                          variant="danger"
                          disabled={busyId === item.id}
                          onClick={() => void onReject(item.id)}
                        >
                          <IconX />
                        </IconButton>
                      </>
                    )}
                    {item.status !== 'rejected' && (
                      <IconButton
                        label="Modifier"
                        disabled={busyId === item.id}
                        onClick={() => openEdit(item)}
                      >
                        <IconEdit />
                      </IconButton>
                    )}
                    <IconButton
                      label="Supprimer"
                      variant="danger"
                      disabled={busyId === item.id}
                      onClick={() => setDeleteTarget(item)}
                    >
                      <IconTrash />
                    </IconButton>
                  </div>
                </td>
              </tr>
              {selectedId === item.id && selected && (
                <tr>
                  <td colSpan={6} className="bg-white">
                    <LabelDetail
                      selected={selected}
                      selectedQr={selectedQr}
                      busyId={busyId}
                      onClose={() => setSelectedId(null)}
                      onAddKitFile={onAddKitFile}
                      onDeleteKitFile={onDeleteKitFile}
                    />
                  </td>
                </tr>
              )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </section>


      {formMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form
            onSubmit={onSaveForm}
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto border border-black bg-white p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-[16px] font-semibold text-forest">
                {formMode === 'create' ? 'Ajouter un label' : 'Modifier la demande'}
              </h3>
              <button type="button" className="orga-icon-btn" aria-label="Fermer" onClick={closeForm}>
                <IconX />
              </button>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="text-[13px] font-medium text-forest sm:col-span-2">
                Structure
                <input
                  required
                  name="structure_name"
                  defaultValue={editing?.structure_name || ''}
                  className={field}
                />
              </label>
              <label className="text-[13px] font-medium text-forest">
                Type
                <select
                  name="structure_type"
                  value={formType}
                  onChange={(e) => setFormType(e.target.value as 'entreprise' | 'ecole')}
                  className={field}
                >
                  <option value="entreprise">Industrie</option>
                </select>
              </label>
              <label className="text-[13px] font-medium text-forest">
                Capacité max. visiteurs par créneau
                <input
                  type="number"
                  min={1}
                  name="max_visitors"
                  defaultValue={editing?.max_visitors ?? ''}
                  className={field}
                />
              </label>
              {formType === 'entreprise' && (
                <label className="text-[13px] font-medium text-forest sm:col-span-2">
                  Secteur
                  <input name="sector" defaultValue={editing?.sector || ''} className={field} />
                </label>
              )}
              <div className="sm:col-span-2">
                <LocationField
                  key={editing?.id || 'new'}
                  lat={editLat}
                  lng={editLng}
                  defaultAddress={editing ? formatLabelAddress(editing) : ''}
                  onPick={(a, b) => {
                    setEditLat(a)
                    setEditLng(b)
                  }}
                />
              </div>
              <label className="text-[13px] font-medium text-forest">
                Téléphone
                <PhoneField required name="contact_phone" defaultValue={editing?.contact_phone || ''} className={field} />
              </label>
              <label className="text-[13px] font-medium text-forest">
                E-mail
                <input
                  required
                  type="email"
                  name="contact_email"
                  defaultValue={editing?.contact_email || ''}
                  className={field}
                />
              </label>
              {formType === 'entreprise' && (
                <label className="text-[13px] font-medium text-forest sm:col-span-2">
                  Produits (virgules)
                  <input
                    name="products"
                    defaultValue={(editing?.products || []).join(', ')}
                    className={field}
                  />
                </label>
              )}
              <label className="text-[13px] font-medium text-forest sm:col-span-2">
                Description
                <textarea
                  name="description"
                  rows={3}
                  defaultValue={editing?.description || ''}
                  className={field}
                />
              </label>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button type="button" className="orga-btn-ghost" onClick={closeForm}>
                Annuler
              </button>
              <button
                type="submit"
                className="orga-btn"
                disabled={busyId === 'create' || busyId === editing?.id}
              >
                {formMode === 'create' ? 'Ajouter' : 'Enregistrer'}
              </button>
            </div>
          </form>
        </div>
      )}

      {modal}

      {approveTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form
            onSubmit={onConfirmApprove}
            className="w-full max-w-md border border-black bg-white p-5"
          >
            <h3 className="text-[16px] font-semibold text-forest">Accepter la demande</h3>
            <p className="mt-2 text-[13px] text-ink/60">
              {approveTarget.structure_name}. Un code de suivi sera attribué. Les ressources s&apos;ajoutent ensuite sur la fiche.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                className="orga-btn-ghost"
                onClick={() => setApproveTarget(null)}
              >
                Annuler
              </button>
              <button
                type="submit"
                className="orga-btn disabled:opacity-50"
                disabled={busyId === approveTarget.id}
              >
                Approuver
              </button>
            </div>
          </form>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md border border-black bg-white p-5">
            <h3 className="text-[16px] font-semibold text-forest">Supprimer ce dossier ?</h3>
            <p className="mt-2 text-[13px] text-ink/60">
              {deleteTarget.structure_name} sera retiré. Cette action est définitive.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" className="orga-btn-ghost" onClick={() => setDeleteTarget(null)}>
                Annuler
              </button>
              <button
                type="button"
                className="orga-btn bg-red-700 hover:bg-red-800"
                disabled={busyId === deleteTarget.id}
                onClick={() => void onConfirmDelete()}
              >
                Supprimer
              </button>
            </div>
          </div>
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

/* Détail affiché juste sous la ligne cliquée. */
function LabelDetail({
  selected,
  selectedQr,
  busyId,
  onClose,
  onAddKitFile,
  onDeleteKitFile,
}: {
  selected: LabelRequest
  selectedQr: QrBatchItem | null
  busyId: string | null
  onClose: () => void
  onAddKitFile: (item: LabelRequest, file: File | null, title?: string) => void
  onDeleteKitFile: (item: LabelRequest, fileId: string) => void
}) {
  const [kitTitle, setKitTitle] = useState('')

  return (
    <div>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-[16px] font-semibold text-forest">{selected.structure_name}</h2>
              <p className="mt-1 text-[13px] text-ink/50">
                {formatStructureType(selected.structure_type)}
                {selected.label_code ? ` · ${selected.label_code}` : ''}
                {' · '}
                {selected.status === 'pending'
                  ? 'En attente'
                  : selected.status === 'approved'
                    ? 'Acceptée'
                    : 'Refusée'}
              </p>
            </div>
            <button
              type="button"
              className="orga-btn-ghost px-3 py-1.5 text-[13px]"
              onClick={onClose}
            >
              Fermer
            </button>
          </div>

          <div className="mt-4 grid gap-3 text-[13px] sm:grid-cols-2">
            <p className="sm:col-span-2">
              <span className="text-ink/45">Date de demande · </span>
              {selected.created_at || selected.createdAt
                ? new Date((selected.created_at || selected.createdAt) as string).toLocaleString('fr-FR')
                : '—'}
            </p>
            <p>
              <span className="text-ink/45">E-mail · </span>
              <a href={`mailto:${selected.contact_email}`} className="font-medium text-forest underline underline-offset-2">
                {selected.contact_email}
              </a>
            </p>
            <p>
              <span className="text-ink/45">Téléphone · </span>
              <span className="font-medium text-forest">{selected.contact_phone || '—'}</span>
            </p>
            <p className="sm:col-span-2">
              <span className="text-ink/45">Adresse · </span>
              {formatLabelAddress(selected) || '—'}
              {googleMapsUrl(selected.lat, selected.lng) && (
                <>
                  {' · '}
                  <a
                    href={googleMapsUrl(selected.lat, selected.lng) || undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-forest underline underline-offset-2"
                  >
                    Carte
                  </a>
                </>
              )}
            </p>
            {selected.sector && (
              <p>
                <span className="text-ink/45">Secteur · </span>
                {selected.sector}
              </p>
            )}
            {selected.max_visitors != null && (
              <p>
                <span className="text-ink/45">Capacité / créneau · </span>
                {selected.max_visitors}
              </p>
            )}
            {selected.description && (
              <p className="sm:col-span-2">
                <span className="text-ink/45">Description · </span>
                {selected.description}
              </p>
            )}
            {selected.products?.length > 0 && (
              <p className="sm:col-span-2">
                <span className="text-ink/45">Produits · </span>
                {selected.products.join(', ')}
              </p>
            )}
          </div>

          {SHOW_KIT_AND_QR && (
          <div className="mt-5 border-t border-black pt-4">
            <h3 className="text-[14px] font-semibold text-forest">Kit</h3>
            {selected.status !== 'approved' ? (
              <p className="mt-2 text-[13px] text-ink/50">
                Le kit s&apos;ajoute une fois la demande acceptée.
              </p>
            ) : (
              <div className="mt-3">
                {(selected.kit_files?.length || 0) === 0 && (
                  <p className="mb-3 text-[13px] text-ink/50">Aucun fichier pour l&apos;instant.</p>
                )}
                {(selected.kit_files?.length || 0) > 0 && (
                  <ul className="border border-black">
                    {selected.kit_files!.map((f, i) => (
                      <li
                        key={f.id}
                        className={`flex items-center gap-3 px-3 py-2.5 ${
                          i > 0 ? 'border-t border-black/15' : ''
                        }`}
                      >
                        <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-forest">
                          {f.name}
                        </span>
                        <span className="shrink-0 text-[12px] uppercase tracking-wide text-ink/40">
                          {kitExtLabel(f.name, f.mime)}
                        </span>
                        <IconButton
                          label="Supprimer"
                          variant="danger"
                          disabled={busyId === selected.id}
                          onClick={() => void onDeleteKitFile(selected, f.id)}
                        >
                          <IconTrash />
                        </IconButton>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-3 flex flex-wrap items-end gap-2">
                  <label className="min-w-[180px] flex-1 text-[13px] font-medium text-forest">
                    Titre
                    <input
                      value={kitTitle}
                      onChange={(e) => setKitTitle(e.target.value)}
                      className={field}
                      maxLength={200}
                    />
                  </label>
                  <label
                    className={`orga-btn inline-flex cursor-pointer px-4 py-2.5 text-[13px] ${
                      busyId === selected.id || !kitTitle.trim() ? 'pointer-events-none opacity-50' : ''
                    }`}
                  >
                    Ajouter
                    <input
                      type="file"
                      accept={KIT_ACCEPT}
                      className="hidden"
                      disabled={busyId === selected.id || !kitTitle.trim()}
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null
                        e.target.value = ''
                        const title = kitTitle.trim()
                        setKitTitle('')
                        void onAddKitFile(selected, file, title)
                      }}
                    />
                  </label>
                </div>
              </div>
            )}
          </div>
          )}

          {SHOW_KIT_AND_QR && selected.status === 'approved' && (
            <div className="mt-5 border-t border-black pt-4">
              <h3 className="text-[14px] font-semibold text-forest">Carte QR</h3>
              {selectedQr ? (
                <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <img
                    src={selectedQr.qr_data_url}
                    alt={`Carte QR ${selectedQr.name}`}
                    className="h-auto w-44 border border-black bg-white"
                  />
                  <div>
                    <p className="text-[13px] text-ink/55">Fiche publique</p>
                    <a
                      href={selectedQr.fiche_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 block text-[14px] font-medium text-forest underline underline-offset-2"
                    >
                      {selectedQr.fiche_url}
                    </a>
                    <button
                      type="button"
                      className="orga-btn mt-3 px-3 py-2 text-[13px]"
                      onClick={() => {
                        const link = document.createElement('a')
                        const name = (selectedQr.name || 'institution').replace(/[^\w\-]+/g, '_')
                        const code = (selectedQr.label_code || 'sans-code').replace(/[^\w\-]+/g, '_')
                        link.href = selectedQr.qr_data_url
                        link.download = `${name}-${code}.png`
                        document.body.appendChild(link)
                        link.click()
                        link.remove()
                      }}
                    >
                      Télécharger la carte
                    </button>
                  </div>
                </div>
              ) : (
                <p className="mt-2 text-[13px] text-ink/50">Chargement de la carte…</p>
              )}
            </div>
          )}
    </div>
  )
}
