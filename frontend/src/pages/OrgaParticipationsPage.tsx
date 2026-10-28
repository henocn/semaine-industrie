import { Fragment, useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  approveParticipation,
  createParticipation,
  deleteParticipation,
  getParticipation,
  listParticipations,
  rejectParticipation,
  updateParticipation,
  type Participation,
  type ParticipationKind,
} from '../api/participations'
import { OrgaShell } from '../components/layout/OrgaShell'
import { IconButton, IconCheck, IconX, IconEdit, IconTrash } from '../components/ui/IconButton'
import { useOrgaRealtime } from '../lib/useOrgaRealtime'

const field = 'mt-1 w-full border border-black bg-white px-3 py-2 text-[14px] text-ink focus:outline-none'

/* Libellé court du statut. */
function statusLabel(status: Participation['status']) {
  if (status === 'approved') return 'Acceptée'
  if (status === 'rejected') return 'Refusée'
  return 'En attente'
}

/* Nombre de passages (0 tant qu'aucun scan). */
function passageCount(item: Participation) {
  return item.passport?.passages ?? 0
}

/* Classe de ligne selon le statut. */
function rowClass(status: Participation['status']) {
  if (status === 'approved') return 'orga-row-approved'
  if (status === 'rejected') return 'orga-row-rejected'
  return 'orga-row-pending'
}

/* Télécharge l'image du QR. */
function downloadQr(dataUrl: string, code: string) {
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = `qr-${code}.png`
  a.click()
}

/* Lit le formulaire d'une participation. */
function readForm(fd: FormData, kind: ParticipationKind) {
  const headcountRaw = String(fd.get('headcount') || '').trim()
  return {
    name: String(fd.get('name') || '').trim(),
    email: String(fd.get('email') || '').trim() || null,
    phone: String(fd.get('phone') || '').trim() || null,
    description: String(fd.get('description') || '').trim() || null,
    headcount: kind === 'ecole' && headcountRaw ? Number(headcountRaw) : null,
  }
}

/* Backoffice : écoles / centres / univ, avec QR à l'acceptation. */
export default function OrgaParticipationsPage() {
  const kind = 'ecole' as const
  const [rows, setRows] = useState<Participation[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<Participation | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /* Recharge la liste des écoles. */
  async function load() {
    const data = await listParticipations({ kind })
    setRows(data)
  }

  useEffect(() => {
    setRows([])
    setSelectedId(null)
    setDetail(null)
    setEditingId(null)
    setShowAdd(false)
    setError(null)
    void load().catch((err) => setError(err instanceof Error ? err.message : 'Chargement impossible'))
  }, [])

  useOrgaRealtime(
    ['participation:changed'],
    () => load().catch((err) => setError(err instanceof Error ? err.message : 'Chargement impossible')),
  )

  /* Ouvre le détail juste sous la ligne, avec le QR s'il existe. */
  async function openRow(id: string) {
    if (selectedId === id) {
      setSelectedId(null)
      setDetail(null)
      setEditingId(null)
      return
    }
    setSelectedId(id)
    setEditingId(null)
    setError(null)
    try {
      setDetail(await getParticipation(id))
    } catch (err) {
      setDetail(rows.find((row) => row.id === id) || null)
      setError(err instanceof Error ? err.message : 'Détail indisponible')
    }
  }

  /* Enregistre une nouvelle participation dans l'onglet ouvert. */
  async function onCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    setBusy(true)
    setError(null)
    try {
      await createParticipation({ kind, ...readForm(new FormData(form), kind) })
      form.reset()
      setShowAdd(false)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enregistrement impossible')
    } finally {
      setBusy(false)
    }
  }

  /* Enregistre les corrections d'une ligne. */
  async function onUpdate(e: FormEvent<HTMLFormElement>, id: string) {
    e.preventDefault()
    const form = e.currentTarget
    setBusy(true)
    setError(null)
    try {
      const updated = await updateParticipation(id, readForm(new FormData(form), kind))
      setDetail(updated)
      setEditingId(null)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Mise à jour impossible')
    } finally {
      setBusy(false)
    }
  }

  /* Accepte et affiche le QR. */
  async function onApprove(id: string) {
    setBusy(true)
    setError(null)
    try {
      const updated = await approveParticipation(id)
      setSelectedId(id)
      setDetail(updated)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Acceptation impossible')
    } finally {
      setBusy(false)
    }
  }

  /* Refuse la participation. */
  async function onReject(id: string) {
    setBusy(true)
    setError(null)
    try {
      const updated = await rejectParticipation(id)
      setDetail(updated)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Refus impossible')
    } finally {
      setBusy(false)
    }
  }

  /* Supprime la participation. */
  async function onDelete(id: string) {
    if (!window.confirm('Supprimer cette participation ?')) return
    setBusy(true)
    setError(null)
    try {
      await deleteParticipation(id)
      if (selectedId === id) {
        setSelectedId(null)
        setDetail(null)
      }
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Suppression impossible')
    } finally {
      setBusy(false)
    }
  }

  /* Filtre nom, contact et code de suivi. */
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((item) =>
      [
        item.name,
        item.email,
        item.phone,
        item.city,
        item.description,
        item.status === 'approved' ? item.passport?.code : null,
      ]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    )
  }, [rows, query])

  const noun = filtered.length > 1 ? 'écoles' : 'école'

  return (
    <OrgaShell
      title="Participations"
      searchPlaceholder="Rechercher…"
      onSearch={setQuery}
      actions={
        <button type="button" className="orga-btn" onClick={() => setShowAdd((v) => !v)}>
          {showAdd ? 'Fermer' : 'Ajouter une école'}
        </button>
      }
    >
      {error && <p className="mb-4 text-[14px] text-red-700">{error}</p>}

      {showAdd && (
        <form onSubmit={(e) => void onCreate(e)} className="orga-panel mb-4 grid gap-3 sm:grid-cols-2">
          <label className="text-[13px] font-medium text-forest sm:col-span-2">
            Nom
            <input required name="name" className={field} />
          </label>
          <label className="text-[13px] font-medium text-forest">
            E-mail
            <input type="email" name="email" className={field} />
          </label>
          <label className="text-[13px] font-medium text-forest">
            Téléphone
            <input name="phone" type="tel" className={field} />
            <span className="mt-1 block text-[12px] font-normal text-ink/50">De préférence un numéro WhatsApp.</span>
          </label>
          <label className="text-[13px] font-medium text-forest">
            Effectif souhaité
            <input name="headcount" type="number" min={1} className={field} />
          </label>
          <label className="text-[13px] font-medium text-forest sm:col-span-2">
            Spécialités / séries ou filières
            <textarea name="description" rows={3} className={`${field} resize-none`} />
          </label>
          <div className="sm:col-span-2">
            <button type="submit" className="orga-btn" disabled={busy}>
              Enregistrer
            </button>
          </div>
        </form>
      )}

      <section className="orga-panel !p-0 overflow-x-auto">
        <div className="flex items-center justify-between border-b border-black px-4 py-3">
          <h2 className="text-[15px] font-semibold text-forest">
            {filtered.length} {noun}
          </h2>
          <p className="text-[12px] text-ink/45">Cliquez une ligne pour le détail</p>
        </div>
        <table className="orga-table min-w-[720px]">
          <thead>
            <tr>
              <th className="w-32">Code de suivi</th>
              <th>Nom</th>
              <th className="w-40">Contact</th>
              <th className="w-28">Statut</th>
              <th className="w-24">Passage</th>
              <th className="w-40">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6}>Aucune participation</td>
              </tr>
            )}
            {filtered.map((item) => {
              const open = selectedId === item.id
              const shown = open && detail?.id === item.id ? detail : item
              return (
                <Fragment key={item.id}>
                  <tr
                    className={`${rowClass(item.status)} cursor-pointer ${open ? 'bg-forest/10' : ''}`}
                    onClick={() => void openRow(item.id)}
                  >
                    <td className="font-semibold text-forest">
                      {item.status === 'approved' && item.passport?.code ? item.passport.code : '—'}
                    </td>
                    <td className="font-medium text-forest">{item.name}</td>
                    <td>{item.phone || item.email || '…'}</td>
                    <td>{statusLabel(item.status)}</td>
                    <td className={passageCount(item) > 0 ? 'font-semibold text-forest' : 'text-ink/45'}>
                      {passageCount(item)}
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-1">
                        {item.status !== 'approved' && (
                          <IconButton label="Accepter" variant="ok" disabled={busy} onClick={() => void onApprove(item.id)}>
                            <IconCheck />
                          </IconButton>
                        )}
                        {item.status === 'pending' && (
                          <IconButton label="Refuser" variant="danger" disabled={busy} onClick={() => void onReject(item.id)}>
                            <IconX />
                          </IconButton>
                        )}
                        <IconButton
                          label="Modifier"
                          disabled={busy}
                          onClick={() => {
                            setSelectedId(item.id)
                            setEditingId(item.id)
                            void getParticipation(item.id).then(setDetail).catch(() => setDetail(item))
                          }}
                        >
                          <IconEdit />
                        </IconButton>
                        <IconButton label="Supprimer" variant="danger" disabled={busy} onClick={() => void onDelete(item.id)}>
                          <IconTrash />
                        </IconButton>
                      </div>
                    </td>
                  </tr>
                  {open && (
                    <tr>
                      <td colSpan={6} className="bg-white">
                        {editingId === item.id ? (
                          <form onSubmit={(e) => void onUpdate(e, item.id)} className="grid gap-3 p-4 sm:grid-cols-2">
                            <label className="text-[13px] font-medium text-forest sm:col-span-2">
                              Nom
                              <input required name="name" defaultValue={shown.name} className={field} />
                            </label>
                            <label className="text-[13px] font-medium text-forest">
                              E-mail
                              <input type="email" name="email" defaultValue={shown.email || ''} className={field} />
                            </label>
                            <label className="text-[13px] font-medium text-forest">
                              Téléphone
                              <input name="phone" defaultValue={shown.phone || ''} className={field} />
                            </label>
                            <label className="text-[13px] font-medium text-forest">
                              Effectif souhaité
                              <input name="headcount" type="number" min={1} defaultValue={shown.headcount ?? ''} className={field} />
                            </label>
                            <label className="text-[13px] font-medium text-forest sm:col-span-2">
                              Spécialités / séries ou filières
                              <textarea name="description" rows={3} defaultValue={shown.description || ''} className={`${field} resize-none`} />
                            </label>
                            <div className="sm:col-span-2 flex gap-2">
                              <button type="submit" className="orga-btn" disabled={busy}>Enregistrer</button>
                              <button type="button" className="orga-btn" onClick={() => setEditingId(null)}>Annuler</button>
                            </div>
                          </form>
                        ) : (
                          <div className="flex flex-wrap items-start gap-6 p-4">
                            <div className="min-w-0 flex-1 text-[14px] text-ink">
                              {shown.createdAt && (
                                <p className="mb-1 text-[13px] text-ink/60">
                                  Date de demande · {new Date(shown.createdAt).toLocaleString('fr-FR')}
                                </p>
                              )}
                              {shown.city && <p>{shown.city}</p>}
                              {shown.email && <p>{shown.email}</p>}
                              {shown.phone && <p>{shown.phone}</p>}
                              {shown.headcount ? <p>{shown.headcount} personnes</p> : null}
                              {shown.description && <p className="mt-2 whitespace-pre-wrap text-ink/80">{shown.description}</p>}
                              {!shown.description && !shown.email && !shown.phone && !shown.city && (
                                <p className="text-ink/50">Complétez la fiche avant le jour J.</p>
                              )}
                            </div>
                            {shown.status === 'approved' && shown.passport?.qr_data_url && (
                              <div className="text-center">
                                <img src={shown.passport.qr_data_url} alt="" className="h-36 w-36 border border-black bg-white" />
                                <p className="mt-2 text-[13px] font-semibold text-forest">{shown.passport.code}</p>
                                <button
                                  type="button"
                                  className="mt-2 text-[13px] font-semibold text-forest underline"
                                  onClick={() => downloadQr(shown.passport!.qr_data_url!, shown.passport!.code)}
                                >
                                  Télécharger le QR
                                </button>
                              </div>
                            )}
                            {shown.status === 'approved' && !shown.passport?.qr_data_url && (
                              <button type="button" className="orga-btn" disabled={busy} onClick={() => void onApprove(item.id)}>
                                Créer le QR
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </section>
    </OrgaShell>
  )
}
