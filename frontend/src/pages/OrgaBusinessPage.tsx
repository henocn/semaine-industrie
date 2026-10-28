import { Fragment, useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  businessKindLabel,
  businessParticipantLabel,
  createMeeting,
  createParticipantOrga,
  deleteParticipant,
  listMeetings,
  listParticipants,
  rescheduleMeeting,
  reviewParticipant,
  saveContactNote,
  updateParticipant,
  type BusinessMeeting,
  type BusinessParticipant,
} from '../api/business'
import { OrgaShell } from '../components/layout/OrgaShell'
import { IconButton, IconCheck, IconX, IconEdit, IconTrash } from '../components/ui/IconButton'
import { useOrgaRealtime } from '../lib/useOrgaRealtime'

const field =
  'mt-1 w-full border border-black bg-white px-3 py-2 text-[14px] text-ink focus:outline-none'

/* Résout les participants d'un RDV. */
function meetingAttendees(
  m: BusinessMeeting,
  approvedPool: BusinessParticipant[],
  participants: BusinessParticipant[],
): BusinessParticipant[] {
  return meetingParticipantIds(m)
    .map((id) => {
      return (
        approvedPool.find((x) => x.id === id) ||
        participants.find((x) => x.id === id) ||
        (m.participantA?.id === id ? m.participantA : null) ||
        (m.participantB?.id === id ? m.participantB : null) ||
        null
      )
    })
    .filter((p): p is BusinessParticipant => Boolean(p))
}

/* Noms d'organisations d'un RDV. */
function meetingNames(
  m: BusinessMeeting,
  approvedPool: BusinessParticipant[],
  participants: BusinessParticipant[],
) {
  const names = meetingAttendees(m, approvedPool, participants).map((p) => businessParticipantLabel(p))
  return names.join(' × ') || 'Participants'
}

/* Identifiants des participants d'un RDV (attendee_ids, sinon A / B). */
function meetingParticipantIds(m: BusinessMeeting) {
  return Array.isArray(m.attendee_ids) && m.attendee_ids.length
    ? m.attendee_ids
    : ([m.participantA?.id, m.participantB?.id].filter(Boolean) as string[])
}

/* Backoffice : participants B2B + rendez-vous. */
export default function OrgaBusinessPage() {
  const [participants, setParticipants] = useState<BusinessParticipant[]>([])
  const [approvedPool, setApprovedPool] = useState<BusinessParticipant[]>([])
  const [meetings, setMeetings] = useState<BusinessMeeting[]>([])
  const [tab, setTab] = useState<'participants' | 'meetings'>('participants')
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | ''>('')
  const [query, setQuery] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [showAddMeeting, setShowAddMeeting] = useState(false)
  const [showAddPerson, setShowAddPerson] = useState(false)
  const [pickQuery, setPickQuery] = useState('')
  const [pickOpen, setPickOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [selectedParticipantId, setSelectedParticipantId] = useState<string | null>(null)
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null)
  const [editingParticipantId, setEditingParticipantId] = useState<string | null>(null)

  /* Recharge listes. */
  async function load() {
    try {
      setError(null)
      const [p, approved, m] = await Promise.all([
        listParticipants(filter ? { status: filter } : undefined),
        listParticipants({ status: 'approved' }),
        listMeetings(),
      ])
      setParticipants(p)
      setApprovedPool(approved)
      setMeetings(m)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur')
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter])

  useOrgaRealtime(['business:changed'], () => void load())

  const filteredParticipants = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return participants
    return participants.filter((p) =>
      [
        p.organization_name,
        p.contact_name,
        p.email,
        p.phone,
        p.sector,
        businessKindLabel(p.kind),
        p.status === 'approved' ? p.tracking_code : null,
      ]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    )
  }, [participants, query])

  /* Nombre de rendez-vous (hors annulés) par participant. */
  const visitsByParticipant = useMemo(() => {
    const counts = new Map<string, number>()
    meetings
      .filter((m) => m.status !== 'cancelled')
      .forEach((m) => {
        meetingParticipantIds(m).forEach((id) => counts.set(id, (counts.get(id) || 0) + 1))
      })
    return counts
  }, [meetings])

  const filteredMeetings = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return meetings
    return meetings.filter((m) => {
      const names = meetingNames(m, approvedPool, participants).toLowerCase()
      return (
        names.includes(q) ||
        (m.location || '').toLowerCase().includes(q) ||
        m.status.toLowerCase().includes(q)
      )
    })
  }, [meetings, query, approvedPool, participants])

  const selectedParticipant = useMemo(
    () =>
      filteredParticipants.find((p) => p.id === selectedParticipantId) ||
      participants.find((p) => p.id === selectedParticipantId) ||
      null,
    [filteredParticipants, participants, selectedParticipantId],
  )

  const selectedMeeting = useMemo(
    () =>
      filteredMeetings.find((m) => m.id === selectedMeetingId) ||
      meetings.find((m) => m.id === selectedMeetingId) ||
      null,
    [filteredMeetings, meetings, selectedMeetingId],
  )

  const pickList = useMemo(() => {
    const q = pickQuery.trim().toLowerCase()
    return approvedPool.filter((p) => {
      if (selectedIds.includes(p.id)) return false
      if (!q) return true
      return [p.organization_name, p.contact_name, p.email, businessKindLabel(p.kind)]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    })
  }, [approvedPool, pickQuery, selectedIds])

  /* Approuve / refuse. */
  async function onReview(id: string, status: 'approved' | 'rejected') {
    setBusyId(id)
    try {
      await reviewParticipant(id, status)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action impossible')
    } finally {
      setBusyId(null)
    }
  }

  /* Enregistre la fiche modifiée d'un participant. */
  async function onUpdatePerson(e: FormEvent<HTMLFormElement>, id: string) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setBusyId(id)
    setError(null)
    try {
      await updateParticipant(id, {
        kind: String(fd.get('kind') || 'entreprise') as BusinessParticipant['kind'],
        contact_name: String(fd.get('contact_name') || ''),
        email: String(fd.get('email') || ''),
        phone: String(fd.get('phone') || ''),
        sector: String(fd.get('sector') || ''),
        notes: String(fd.get('notes') || ''),
      })
      setEditingParticipantId(null)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Modification impossible')
    } finally {
      setBusyId(null)
    }
  }

  /* Supprime un participant (refusé côté serveur s'il a des rendez-vous). */
  async function onDeletePerson(p: BusinessParticipant) {
    if (!window.confirm(`Supprimer ${businessParticipantLabel(p)} ?`)) return
    setBusyId(p.id)
    setError(null)
    try {
      await deleteParticipant(p.id)
      if (selectedParticipantId === p.id) setSelectedParticipantId(null)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Suppression impossible')
    } finally {
      setBusyId(null)
    }
  }

  /* Ajoute une personne manuellement. */
  async function onCreatePerson(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const fd = new FormData(form)
    setBusyId('create-person')
    setError(null)
    try {
      await createParticipantOrga({
        kind: String(fd.get('kind') || 'entreprise'),
        contact_name: String(fd.get('contact_name') || ''),
        email: String(fd.get('email') || ''),
        phone: String(fd.get('phone') || '') || undefined,
        sector: String(fd.get('sector') || '') || undefined,
        notes: String(fd.get('notes') || '') || undefined,
        contact_opt_in: true,
        status: 'approved',
      })
      form.reset()
      setShowAddPerson(false)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ajout impossible')
    } finally {
      setBusyId(null)
    }
  }

  /* Crée un RDV (date, heures, lieu, personnes). */
  async function onCreateMeeting(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (selectedIds.length < 1) {
      setError('Sélectionnez au moins une personne')
      return
    }
    const form = e.currentTarget
    const fd = new FormData(form)
    const day = String(fd.get('day') || '')
    const start = String(fd.get('start') || '')
    const end = String(fd.get('end') || '')
    if (!day || !start || !end) return
    setBusyId('create')
    try {
      await createMeeting({
        participant_ids: selectedIds,
        slot_start: new Date(`${day}T${start}:00`).toISOString(),
        slot_end: new Date(`${day}T${end}:00`).toISOString(),
        location: String(fd.get('location') || '') || undefined,
      })
      form.reset()
      setSelectedIds([])
      setPickQuery('')
      setShowAddMeeting(false)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Création impossible')
    } finally {
      setBusyId(null)
    }
  }

  /* Enregistre fiche contact. */
  async function onNote(id: string, note: string) {
    setBusyId(id)
    try {
      await saveContactNote(id, note)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enregistrement impossible')
    } finally {
      setBusyId(null)
    }
  }

  /* Reporte un rendez-vous. */
  async function onReschedule(e: FormEvent<HTMLFormElement>, id: string) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setBusyId(id)
    try {
      await rescheduleMeeting(id, {
        slot_start: new Date(String(fd.get('slot_start') || '')).toISOString(),
        slot_end: new Date(String(fd.get('slot_end') || '')).toISOString(),
        location: String(fd.get('location') || '') || undefined,
      })
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Report impossible')
    } finally {
      setBusyId(null)
    }
  }

  /* Valeur datetime-local depuis ISO. */
  function toLocalInput(iso: string) {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return ''
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  /* Ajoute un participant à la sélection. */
  function addPerson(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev : [...prev, id]))
    setPickQuery('')
  }

  /* Sélectionne un participant (détail). */
  function selectParticipant(id: string) {
    setEditingParticipantId(null)
    setSelectedParticipantId((prev) => (prev === id ? null : id))
  }

  /* Ouvre la fiche d'un participant en mode modification. */
  function editParticipant(id: string) {
    setSelectedParticipantId(id)
    setEditingParticipantId(id)
  }

  /* Sélectionne un RDV (détail). */
  function selectMeeting(id: string) {
    setSelectedMeetingId((prev) => (prev === id ? null : id))
  }

  /* Change d'onglet et ferme les détails. */
  function switchTab(next: 'participants' | 'meetings') {
    setTab(next)
    setSelectedParticipantId(null)
    setSelectedMeetingId(null)
    setEditingParticipantId(null)
    setShowAddPerson(false)
    setShowAddMeeting(false)
  }

  return (
    <OrgaShell
      title="Rencontres d'affaires"
      searchPlaceholder="Rechercher…"
      onSearch={setQuery}
      actions={
        <div className="flex items-center gap-2">
          {tab === 'participants' && (
            <>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as typeof filter)}
                className="orga-input w-auto min-w-[9rem]"
              >
                <option value="">Tous</option>
                <option value="pending">En attente</option>
                <option value="approved">Approuvés</option>
                <option value="rejected">Refusés</option>
              </select>
              <button
                type="button"
                className="orga-btn"
                onClick={() => setShowAddPerson((v) => !v)}
              >
                {showAddPerson ? 'Fermer' : 'Ajouter'}
              </button>
            </>
          )}
          {tab === 'meetings' && (
            <button type="button" className="orga-btn" onClick={() => setShowAddMeeting((v) => !v)}>
              {showAddMeeting ? 'Fermer' : 'Ajouter'}
            </button>
          )}
        </div>
      }
    >
      {error && <p className="mb-4 text-[14px] text-red-700">{error}</p>}

      <div className="mb-4 flex gap-0 border border-black">
        {(['participants', 'meetings'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => switchTab(t)}
            className={`flex-1 px-4 py-2.5 text-[14px] font-semibold ${
              tab === t ? 'bg-forest text-white' : 'bg-white text-forest hover:bg-forest/10'
            } ${t === 'meetings' ? 'border-l border-black' : ''}`}
          >
            {t === 'participants' ? 'Participants' : 'Rendez-vous'}
          </button>
        ))}
      </div>

      {tab === 'participants' && (
        <>
          {showAddPerson && (
            <section className="orga-panel mb-4">
              <h2 className="text-[15px] font-semibold text-forest">Nouvelle personne</h2>
              <p className="mt-1 text-[13px] text-ink/50">
                Ajout manuel, validé directement pour les rendez-vous.
              </p>
              <form onSubmit={onCreatePerson} className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="text-[13px] font-medium text-forest">
                  Nom et prénom
                  <input required minLength={2} name="contact_name" className={field} />
                </label>
                <label className="text-[13px] font-medium text-forest">
                  Profil
                  <select name="kind" className={field} defaultValue="entreprise">
                    <option value="entreprise">Entreprise</option>
                    <option value="particulier">Particulier</option>
                  </select>
                </label>
                <label className="text-[13px] font-medium text-forest">
                  Secteur
                  <input name="sector" className={field} />
                </label>
                <label className="text-[13px] font-medium text-forest">
                  E-mail
                  <input required type="email" name="email" className={field} />
                </label>
                <label className="text-[13px] font-medium text-forest">
                  Téléphone
                  <input name="phone" className={field} />
                </label>
                <label className="text-[13px] font-medium text-forest sm:col-span-2">
                  Notes
                  <textarea name="notes" rows={3} className={field} />
                </label>
                <div className="sm:col-span-2">
                  <button
                    type="submit"
                    disabled={busyId === 'create-person'}
                    className="orga-btn disabled:opacity-50"
                  >
                    {busyId === 'create-person' ? 'Ajout…' : 'Enregistrer'}
                  </button>
                </div>
              </form>
            </section>
          )}

          <section className="orga-panel !p-0 overflow-x-auto">
            <div className="flex items-center justify-between border-b border-black px-4 py-3">
              <h2 className="text-[15px] font-semibold text-forest">
                {filteredParticipants.length} personne{filteredParticipants.length > 1 ? 's' : ''}
              </h2>
              <p className="text-[12px] text-ink/45">Cliquez une ligne pour le détail</p>
            </div>
            <table className="orga-table min-w-[720px]">
              <thead>
                <tr>
                  <th className="w-32">Code de suivi</th>
                  <th>Nom et prénom</th>
                  <th>Contact</th>
                  <th className="w-28">Rendez-vous</th>
                  <th className="w-28">Profil</th>
                  <th className="w-40">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredParticipants.length === 0 && (
                  <tr><td colSpan={6} className="py-10 text-ink/40">Aucune personne</td></tr>
                )}
                {filteredParticipants.map((p) => {
                  const busy = busyId === p.id
                  return (
                    <Fragment key={p.id}>
                      <tr
                        className={`${participantRowClass(p.status)} cursor-pointer ${
                          selectedParticipantId === p.id ? 'bg-forest/10' : ''
                        }`}
                        onClick={() => selectParticipant(p.id)}
                      >
                        <td className="font-semibold text-forest">
                          {p.status === 'approved' && p.tracking_code ? p.tracking_code : '—'}
                        </td>
                        <td className="font-semibold text-forest">{p.contact_name || p.organization_name || '—'}</td>
                        <td>
                          {p.phone ? (
                            <a
                              href={`tel:${p.phone}`}
                              className="font-medium text-forest underline underline-offset-2"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {p.phone}
                            </a>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="font-semibold text-forest">{visitsByParticipant.get(p.id) || 0}</td>
                        <td className="font-medium text-forest">{businessKindLabel(p.kind)}</td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <div className="flex gap-1">
                            {p.status === 'pending' && (
                              <>
                                <IconButton label="Accepter" variant="ok" disabled={busy} onClick={() => void onReview(p.id, 'approved')}>
                                  <IconCheck />
                                </IconButton>
                                <IconButton label="Refuser" variant="danger" disabled={busy} onClick={() => void onReview(p.id, 'rejected')}>
                                  <IconX />
                                </IconButton>
                              </>
                            )}
                            <IconButton label="Modifier" disabled={busy} onClick={() => editParticipant(p.id)}>
                              <IconEdit />
                            </IconButton>
                            <IconButton label="Supprimer" variant="danger" disabled={busy} onClick={() => void onDeletePerson(p)}>
                              <IconTrash />
                            </IconButton>
                          </div>
                        </td>
                      </tr>
                      {selectedParticipantId === p.id && selectedParticipant && (
                        <tr>
                          <td colSpan={6} className="bg-white">
                            <div className="p-4">
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                  <h2 className="text-[16px] font-semibold text-forest">
                                    {businessParticipantLabel(selectedParticipant)}
                                  </h2>
                                  <p className="mt-1 text-[13px] text-ink/50">
                                    {businessKindLabel(selectedParticipant.kind)}
                                    {' · '}
                                    {statusLabel(selectedParticipant.status)}
                                    {selectedParticipant.tracking_code ? ` · ${selectedParticipant.tracking_code}` : ''}
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  className="orga-btn-ghost px-3 py-1.5 text-[13px]"
                                  onClick={() => setSelectedParticipantId(null)}
                                >
                                  Fermer
                                </button>
                              </div>

                              {editingParticipantId === selectedParticipant.id ? (
                                <form
                                  onSubmit={(e) => void onUpdatePerson(e, selectedParticipant.id)}
                                  className="mt-4 grid gap-4 sm:grid-cols-2"
                                >
                                  <label className="text-[13px] font-medium text-forest">
                                    Nom et prénom
                                    <input
                                      required
                                      minLength={2}
                                      name="contact_name"
                                      defaultValue={selectedParticipant.contact_name || ''}
                                      className={field}
                                    />
                                  </label>
                                  <label className="text-[13px] font-medium text-forest">
                                    Profil
                                    <select name="kind" className={field} defaultValue={selectedParticipant.kind === 'particulier' ? 'particulier' : 'entreprise'}>
                                      <option value="entreprise">Entreprise</option>
                                      <option value="particulier">Particulier</option>
                                    </select>
                                  </label>
                                  <label className="text-[13px] font-medium text-forest">
                                    Secteur
                                    <input name="sector" defaultValue={selectedParticipant.sector || ''} className={field} />
                                  </label>
                                  <label className="text-[13px] font-medium text-forest">
                                    E-mail
                                    <input required type="email" name="email" defaultValue={selectedParticipant.email} className={field} />
                                  </label>
                                  <label className="text-[13px] font-medium text-forest">
                                    Téléphone
                                    <input name="phone" defaultValue={selectedParticipant.phone || ''} className={field} />
                                  </label>
                                  <label className="text-[13px] font-medium text-forest sm:col-span-2">
                                    Notes
                                    <textarea name="notes" rows={3} defaultValue={selectedParticipant.notes || ''} className={field} />
                                  </label>
                                  <div className="flex gap-2 sm:col-span-2">
                                    <button type="submit" disabled={busyId === selectedParticipant.id} className="orga-btn disabled:opacity-50">
                                      {busyId === selectedParticipant.id ? 'Enregistrement…' : 'Enregistrer'}
                                    </button>
                                    <button type="button" className="orga-btn-ghost" onClick={() => setEditingParticipantId(null)}>
                                      Annuler
                                    </button>
                                  </div>
                                </form>
                              ) : (
                              <div className="mt-4 grid gap-3 text-[13px] sm:grid-cols-2">
                                <p>
                                  <span className="text-ink/45">Date de demande · </span>
                                  {selectedParticipant.createdAt
                                    ? new Date(selectedParticipant.createdAt).toLocaleString('fr-FR')
                                    : '—'}
                                </p>
                                <p>
                                  <span className="text-ink/45">E-mail · </span>
                                  <a
                                    href={`mailto:${selectedParticipant.email}`}
                                    className="font-medium text-forest underline underline-offset-2"
                                  >
                                    {selectedParticipant.email}
                                  </a>
                                </p>
                                <p>
                                  <span className="text-ink/45">Téléphone · </span>
                                  {selectedParticipant.phone ? (
                                    <a
                                      href={`tel:${selectedParticipant.phone}`}
                                      className="font-medium text-forest underline underline-offset-2"
                                    >
                                      {selectedParticipant.phone}
                                    </a>
                                  ) : (
                                    '—'
                                  )}
                                </p>
                                <p>
                                  <span className="text-ink/45">Secteur · </span>
                                  {selectedParticipant.sector || '—'}
                                </p>
                                <p>
                                  <span className="text-ink/45">Rendez-vous · </span>
                                  {visitsByParticipant.get(selectedParticipant.id) || 0}
                                </p>
                                <p className="whitespace-pre-wrap sm:col-span-2">
                                  <span className="text-ink/45">Notes · </span>
                                  {selectedParticipant.notes || '—'}
                                </p>
                              </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </section>

        </>
      )}

      {tab === 'meetings' && (
        <div className="space-y-4">
          {showAddMeeting && (
            <section className="orga-panel">
              <h2 className="text-[15px] font-semibold text-forest">Nouveau rendez-vous</h2>
              <p className="mt-1 text-[13px] text-ink/50">
                Les personnes sélectionnées reçoivent un e-mail et un WhatsApp (si numéro + opt-in).
              </p>
              <form onSubmit={onCreateMeeting} className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="text-[13px] font-medium text-forest">
                  Date
                  <input required type="date" name="day" className={field} />
                </label>
                <label className="text-[13px] font-medium text-forest">
                  Lieu
                  <input required name="location" placeholder="Palais des congrès…" className={field} />
                </label>
                <label className="text-[13px] font-medium text-forest">
                  Début
                  <input required type="time" name="start" className={field} />
                </label>
                <label className="text-[13px] font-medium text-forest">
                  Fin
                  <input required type="time" name="end" className={field} />
                </label>

                <div className="sm:col-span-2">
                  <p className="text-[13px] font-medium text-forest">Personnes</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedIds.map((id) => {
                      const p = approvedPool.find((x) => x.id === id)
                      if (!p) return null
                      return (
                        <button
                          key={id}
                          type="button"
                          className="border border-forest bg-forest/10 px-2 py-1 text-[12px] font-medium text-forest"
                          onClick={() => setSelectedIds((prev) => prev.filter((x) => x !== id))}
                        >
                          {businessParticipantLabel(p)} ×
                        </button>
                      )
                    })}
                    {selectedIds.length === 0 && (
                      <span className="text-[13px] text-ink/40">Aucune sélection</span>
                    )}
                  </div>
                  <input
                    value={pickQuery}
                    onChange={(e) => {
                      setPickQuery(e.target.value)
                      setPickOpen(true)
                    }}
                    onFocus={() => setPickOpen(true)}
                    onBlur={() => setPickOpen(false)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') setPickOpen(false)
                    }}
                    placeholder="Cliquez pour choisir, ou tapez pour filtrer…"
                    className={`${field} mt-2`}
                  />
                  {pickOpen && (
                    <ul className="mt-1 max-h-60 overflow-y-auto border border-black bg-white">
                      {pickList.length === 0 && (
                        <li className="px-3 py-2 text-[13px] text-ink/40">
                          {pickQuery.trim() ? 'Aucun résultat' : 'Aucune personne approuvée à ajouter'}
                        </li>
                      )}
                      {pickList.map((p) => (
                        <li key={p.id}>
                          <button
                            type="button"
                            className="block w-full px-3 py-2 text-left text-[13px] hover:bg-forest/5"
                            /* Garde le focus dans le champ : la liste reste ouverte pour en ajouter d'autres. */
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => addPerson(p.id)}
                          >
                            <span className="font-semibold text-forest">{businessParticipantLabel(p)}</span>
                            <span className="text-ink/50"> · {businessKindLabel(p.kind)}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <button
                    type="submit"
                    disabled={busyId === 'create' || selectedIds.length < 1}
                    className="orga-btn disabled:opacity-50"
                  >
                    {busyId === 'create' ? 'Création…' : 'Créer et notifier'}
                  </button>
                </div>
              </form>
            </section>
          )}

          <section className="orga-panel !p-0 overflow-x-auto">
            <div className="flex items-center justify-between border-b border-black px-4 py-3">
              <h2 className="text-[15px] font-semibold text-forest">
                {filteredMeetings.length} rendez-vous
              </h2>
              <p className="text-[12px] text-ink/45">Cliquez une ligne pour le détail</p>
            </div>
            <table className="orga-table min-w-[640px]">
              <thead>
                <tr>
                  <th className="w-12">#</th>
                  <th>Date</th>
                  <th>Horaire</th>
                  <th>Lieu</th>
                  <th>Participants</th>
                </tr>
              </thead>
              <tbody>
                {filteredMeetings.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-10 text-ink/40">
                      Aucun rendez-vous
                    </td>
                  </tr>
                )}
                {filteredMeetings.map((m, i) => {
                  const names = meetingNames(m, approvedPool, participants)
                  return (
                    <Fragment key={m.id}>
                      <tr
                        className={`cursor-pointer ${selectedMeetingId === m.id ? 'bg-forest/10' : ''}`}
                        onClick={() => selectMeeting(m.id)}
                      >
                        <td className="text-ink/45">{i + 1}</td>
                        <td className="whitespace-nowrap font-medium text-forest">
                          {new Date(m.slot_start).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="whitespace-nowrap">
                          {new Date(m.slot_start).toLocaleTimeString('fr-FR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                          {' à '}
                          {new Date(m.slot_end).toLocaleTimeString('fr-FR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td>{m.location || '—'}</td>
                        <td className="font-medium text-ink">{names}</td>
                      </tr>
                      {selectedMeetingId === m.id && selectedMeeting && (
                        <tr>
                          <td colSpan={5} className="bg-white">
                            <div className="p-4">
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                  <h2 className="text-[16px] font-semibold text-forest">
                                    {meetingNames(selectedMeeting, approvedPool, participants)}
                                  </h2>
                                  <p className="mt-1 text-[13px] text-ink/50">
                                    {selectedMeeting.status === 'done' ? 'Terminé' : 'Confirmé'}
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  className="orga-btn-ghost px-3 py-1.5 text-[13px]"
                                  onClick={() => setSelectedMeetingId(null)}
                                >
                                  Fermer
                                </button>
                              </div>

                              <div className="mt-4 grid gap-3 text-[13px] sm:grid-cols-2">
                                <p>
                                  <span className="text-ink/45">Date · </span>
                                  {new Date(selectedMeeting.slot_start).toLocaleDateString('fr-FR')}
                                </p>
                                <p>
                                  <span className="text-ink/45">Horaire · </span>
                                  {new Date(selectedMeeting.slot_start).toLocaleTimeString('fr-FR', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                  {' à '}
                                  {new Date(selectedMeeting.slot_end).toLocaleTimeString('fr-FR', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </p>
                                <p className="sm:col-span-2">
                                  <span className="text-ink/45">Lieu · </span>
                                  {selectedMeeting.location || '—'}
                                </p>
                                {selectedMeeting.follow_up_at && (
                                  <p>
                                    <span className="text-ink/45">Relance · </span>
                                    {new Date(selectedMeeting.follow_up_at).toLocaleDateString('fr-FR')}
                                  </p>
                                )}
                                {selectedMeeting.contact_note && (
                                  <p className="sm:col-span-2">
                                    <span className="text-ink/45">Note · </span>
                                    {selectedMeeting.contact_note}
                                  </p>
                                )}
                              </div>

                              <div className="mt-4 border-t border-black/10 pt-4">
                                <h3 className="text-[13px] font-semibold text-forest">Personnes</h3>
                                <ul className="mt-2 space-y-2">
                                  {meetingAttendees(selectedMeeting, approvedPool, participants).map((p) => (
                                    <li key={p.id} className="border border-black/10 px-3 py-2 text-[13px]">
                                      <p className="font-semibold text-forest">{businessParticipantLabel(p)}</p>
                                      <p className="mt-0.5 text-ink/55">{businessKindLabel(p.kind)}</p>
                                      <p className="mt-0.5">
                                        <a
                                          href={`mailto:${p.email}`}
                                          className="text-forest underline underline-offset-2"
                                        >
                                          {p.email}
                                        </a>
                                        {p.phone ? (
                                          <>
                                            {' · '}
                                            <a
                                              href={`tel:${p.phone}`}
                                              className="text-forest underline underline-offset-2"
                                            >
                                              {p.phone}
                                            </a>
                                          </>
                                        ) : null}
                                      </p>
                                    </li>
                                  ))}
                                  {meetingAttendees(selectedMeeting, approvedPool, participants).length === 0 && (
                                    <li className="text-ink/40">Aucun participant résolu</li>
                                  )}
                                </ul>
                              </div>

                              {selectedMeeting.status !== 'done' && (
                                <div className="mt-4 space-y-4 border-t border-black/10 pt-4">
                                  <form
                                    key={`reschedule-${selectedMeeting.id}`}
                                    className="grid gap-2 md:grid-cols-4"
                                    onSubmit={(e) => void onReschedule(e, selectedMeeting.id)}
                                  >
                                    <label className="text-[12px] font-medium text-ink/50">
                                      Nouveau début
                                      <input
                                        required
                                        type="datetime-local"
                                        name="slot_start"
                                        defaultValue={toLocalInput(selectedMeeting.slot_start)}
                                        className="mt-1 w-full orga-input"
                                      />
                                    </label>
                                    <label className="text-[12px] font-medium text-ink/50">
                                      Nouvelle fin
                                      <input
                                        required
                                        type="datetime-local"
                                        name="slot_end"
                                        defaultValue={toLocalInput(selectedMeeting.slot_end)}
                                        className="mt-1 w-full orga-input"
                                      />
                                    </label>
                                    <label className="text-[12px] font-medium text-ink/50">
                                      Lieu
                                      <input
                                        name="location"
                                        defaultValue={selectedMeeting.location || ''}
                                        className="mt-1 w-full orga-input"
                                      />
                                    </label>
                                    <div className="flex items-end">
                                      <button
                                        type="submit"
                                        disabled={busyId === selectedMeeting.id}
                                        className="orga-btn-ghost w-full px-3 py-2.5 text-[12px] disabled:opacity-50"
                                      >
                                        Reporter + notifier
                                      </button>
                                    </div>
                                  </form>
                                  <form
                                    className="flex flex-col gap-2 sm:flex-row"
                                    onSubmit={(e) => {
                                      e.preventDefault()
                                      const note = String(new FormData(e.currentTarget).get('note') || '')
                                      void onNote(selectedMeeting.id, note)
                                    }}
                                  >
                                    <input
                                      name="note"
                                      placeholder="Fiche contact (30 sec)…"
                                      className="flex-1 border border-black bg-white px-3 py-2.5 text-[13px]"
                                    />
                                    <button
                                      type="submit"
                                      disabled={busyId === selectedMeeting.id}
                                      className="border border-black bg-forest px-4 py-2.5 text-[12px] font-semibold text-white disabled:opacity-50"
                                    >
                                      Clôturer + relance 3 mois
                                    </button>
                                  </form>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </section>

        </div>
      )}
    </OrgaShell>
  )
}

/* Fond de ligne selon le statut (comme Labels). */
function participantRowClass(status: BusinessParticipant['status']) {
  if (status === 'approved') return 'orga-row-approved'
  if (status === 'rejected') return 'orga-row-rejected'
  return 'orga-row-pending'
}

/* Libellé FR du statut. */
function statusLabel(status: BusinessParticipant['status']) {
  if (status === 'approved') return 'Approuvé'
  if (status === 'rejected') return 'Refusé'
  return 'En attente'
}
