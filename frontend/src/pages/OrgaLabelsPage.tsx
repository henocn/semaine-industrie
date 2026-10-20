import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import {
  createLabelRequestOrga,
  deleteLabelRequest,
  formatLabelAddress,
  formatStructureType,
  getLabelRequestQr,
  googleMapsUrl,
  listLabelRequests,
  reviewLabelRequest,
  updateLabelPdf,
  updateLabelRequest,
  type LabelRequest,
  type QrBatchItem,
} from '../api/labels'
import { OrgaShell } from '../components/layout/OrgaShell'
import { LocationPickerMap } from '../components/map/LocationPickerMap'
import { SITE_URL } from '../lib/seo'
import { notifyLabelPendingChanged } from '../lib/labelPending'
import { joinRoom, onRealtime } from '../lib/socket'

/* URL publique d'un fichier uploadé. */
function publicUploadUrl(path: string | null | undefined) {
  if (!path) return null
  if (path.startsWith('http')) return path
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`
}

const field =
  'mt-1 w-full border border-black bg-white px-3 py-2 text-[14px] text-ink focus:outline-none'

type FormMode = 'create' | 'edit'

/* Écran orga : validation et gestion des labels. */
export default function OrgaLabelsPage() {
  const [items, setItems] = useState<LabelRequest[]>([])
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | ''>('')
  const [query, setQuery] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [formMode, setFormMode] = useState<FormMode | null>(null)
  const [editing, setEditing] = useState<LabelRequest | null>(null)
  const [formType, setFormType] = useState<'entreprise' | 'ecole'>('entreprise')
  const [editLat, setEditLat] = useState<number | null>(null)
  const [editLng, setEditLng] = useState<number | null>(null)
  const [approveTarget, setApproveTarget] = useState<LabelRequest | null>(null)
  const [approvePdf, setApprovePdf] = useState<File | null>(null)
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

  /* Ouvre le formulaire d'édition (dossiers non acceptés). */
  function openEdit(item: LabelRequest) {
    if (item.status === 'approved') return
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
        item.label_code,
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

  const selected = useMemo(
    () => filtered.find((x) => x.id === selectedId) || items.find((x) => x.id === selectedId) || null,
    [filtered, items, selectedId],
  )

  /* Charge le QR quand une ligne acceptée est ouverte. */
  useEffect(() => {
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

  /* Approuve avec PDF label obligatoire. */
  async function onConfirmApprove(e: FormEvent) {
    e.preventDefault()
    if (!approveTarget || !approvePdf) {
      setError('Joignez le kit (PDF) pour accepter la demande')
      return
    }
    setBusyId(approveTarget.id)
    setError(null)
    try {
      await reviewLabelRequest(approveTarget.id, 'approved', { labelPdf: approvePdf })
      setApproveTarget(null)
      setApprovePdf(null)
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

  /* Remplace le PDF d'un label accepté. */
  async function onReplacePdf(item: LabelRequest, file: File | null) {
    if (!file) return
    setBusyId(item.id)
    setError(null)
    try {
      await updateLabelPdf(item.id, file)
      setInfo(`Kit mis à jour pour ${item.structure_name}`)
      setSelectedId(item.id)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Mise à jour du kit impossible')
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
      title="Labels et demandes"
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

      <section className="orga-panel !p-0 overflow-x-auto">
        <div className="flex items-center justify-between border-b border-black px-4 py-3">
          <h2 className="text-[15px] font-semibold text-forest">
            {filtered.length} demande{filtered.length > 1 ? 's' : ''} de label
          </h2>
          <p className="text-[12px] text-ink/45">Cliquez une ligne pour le détail</p>
        </div>

        <table className="orga-table min-w-[640px]">
          <thead>
            <tr>
              <th className="w-28">Code</th>
              <th>Structure</th>
              <th className="w-36">Contact</th>
              <th className="w-28">Type</th>
              <th className="w-36">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={5}>Aucune demande pour ce filtre</td></tr>
            )}
            {filtered.map((item) => (
              <tr
                key={item.id}
                className={`${rowClass(item.status)} cursor-pointer ${
                  selectedId === item.id ? 'bg-forest/10' : ''
                }`}
                onClick={() => setSelectedId(item.id === selectedId ? null : item.id)}
              >
                <td className="font-semibold text-forest">
                  {item.label_code || (item.status === 'approved' ? '—' : '…')}
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
                    {item.status !== 'approved' && (
                      <IconButton
                        label="Modifier"
                        disabled={busyId === item.id}
                        onClick={() => openEdit(item)}
                      >
                        <IconEdit />
                      </IconButton>
                    )}
                    {item.status === 'pending' && (
                      <>
                        <IconButton
                          label="Approuver"
                          variant="ok"
                          disabled={busyId === item.id}
                          onClick={() => {
                            setApprovePdf(null)
                            setApproveTarget(item)
                          }}
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
            ))}
          </tbody>
        </table>
      </section>

      {selected && (
        <section className="orga-panel mt-4">
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
              onClick={() => setSelectedId(null)}
            >
              Fermer
            </button>
          </div>

          <div className="mt-4 grid gap-3 text-[13px] sm:grid-cols-2">
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
                <span className="text-ink/45">Capacité · </span>
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

          <div className="mt-5 border-t border-black pt-4">
            <h3 className="text-[14px] font-semibold text-forest">Kit envoyé</h3>
            {selected.status !== 'approved' ? (
              <p className="mt-2 text-[13px] text-ink/50">
                Le kit (PDF) est joint à l&apos;acceptation de la demande de label.
              </p>
            ) : (
              <div className="mt-3 flex flex-wrap items-center gap-3">
                {publicUploadUrl(selected.label_document_url) ? (
                  <a
                    href={publicUploadUrl(selected.label_document_url) || undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="orga-btn-ghost px-3 py-2 text-[13px]"
                  >
                    Voir le kit PDF
                  </a>
                ) : (
                  <p className="text-[13px] text-ink/50">Aucun fichier pour l&apos;instant.</p>
                )}
                <label className={`orga-btn cursor-pointer px-3 py-2 text-[13px] ${busyId === selected.id ? 'opacity-50' : ''}`}>
                  {selected.label_document_url ? 'Mettre à jour le kit' : 'Ajouter le kit'}
                  <input
                    type="file"
                    accept="application/pdf,.pdf"
                    className="hidden"
                    disabled={busyId === selected.id}
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null
                      e.target.value = ''
                      void onReplacePdf(selected, file)
                    }}
                  />
                </label>
              </div>
            )}
          </div>

          {selected.status === 'approved' && (
            <div className="mt-5 border-t border-black pt-4">
              <h3 className="text-[14px] font-semibold text-forest">QR code</h3>
              {selectedQr ? (
                <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <img
                    src={selectedQr.qr_data_url}
                    alt={`QR ${selectedQr.name}`}
                    className="h-36 w-36 border border-black bg-white p-2"
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
                      Télécharger le QR
                    </button>
                  </div>
                </div>
              ) : (
                <p className="mt-2 text-[13px] text-ink/50">Chargement du QR…</p>
              )}
            </div>
          )}
        </section>
      )}

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
                  <option value="ecole">École</option>
                </select>
              </label>
              <label className="text-[13px] font-medium text-forest">
                Capacité / estimation
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
              <label className="text-[13px] font-medium text-forest sm:col-span-2">
                Adresse
                <input
                  name="address"
                  defaultValue={editing ? formatLabelAddress(editing) : ''}
                  className={field}
                  placeholder="Quartier, ville…"
                />
              </label>
              <div className="sm:col-span-2">
                <p className="text-[13px] font-medium text-forest">Emplacement</p>
                <LocationPickerMap
                  className="mt-2"
                  lat={editLat}
                  lng={editLng}
                  onPick={(a, b) => {
                    setEditLat(a)
                    setEditLng(b)
                  }}
                />
              </div>
              <label className="text-[13px] font-medium text-forest">
                Téléphone
                <input
                  required
                  name="contact_phone"
                  defaultValue={editing?.contact_phone || ''}
                  className={field}
                />
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

      {approveTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form
            onSubmit={onConfirmApprove}
            className="w-full max-w-md border border-black bg-white p-5"
          >
            <h3 className="text-[16px] font-semibold text-forest">Accepter et envoyer le kit</h3>
            <p className="mt-2 text-[13px] text-ink/60">
              {approveTarget.structure_name} : joignez le kit (PDF) remis à l&apos;acceptation.
            </p>
            <label className="mt-4 block text-[13px] font-medium text-forest">
              Kit (PDF)
              <input
                required
                type="file"
                accept="application/pdf,.pdf"
                className="mt-1 block w-full text-[13px]"
                onChange={(e) => setApprovePdf(e.target.files?.[0] || null)}
              />
            </label>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                className="orga-btn-ghost"
                onClick={() => {
                  setApproveTarget(null)
                  setApprovePdf(null)
                }}
              >
                Annuler
              </button>
              <button
                type="submit"
                className="orga-btn"
                disabled={busyId === approveTarget.id || !approvePdf}
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

/* Icône corbeille. */
function IconTrash() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  )
}
