import { useEffect, useMemo, useRef, useState, type FormEvent, type MouseEvent } from 'react'
import {
  createMeeting,
  listMeetings,
  listParticipants,
  rescheduleMeeting,
  reviewParticipant,
  saveContactNote,
  type BusinessMeeting,
  type BusinessParticipant,
} from '../api/business'
import { OrgaShell } from '../components/layout/OrgaShell'

const field =
  'mt-1 w-full border border-black bg-white px-3 py-2 text-[14px] text-ink focus:outline-none'

const iconBtn =
  'grid h-9 w-9 place-items-center border border-black bg-white text-forest hover:bg-forest hover:text-white disabled:opacity-40'

/* Icône crayon. */
function IconEdit() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M4 20h4L19 9l-4-4L4 16v4z" />
      <path d="m13 7 4 4" />
    </svg>
  )
}

/* Icône check. */
function IconCheck() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M5 12.5 10 17l9-10" />
    </svg>
  )
}

/* Icône croix. */
function IconX() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  )
}

/* Résout les participants d'un RDV. */
function meetingAttendees(
  m: BusinessMeeting,
  approvedPool: BusinessParticipant[],
  participants: BusinessParticipant[],
): BusinessParticipant[] {
  const ids =
    Array.isArray(m.attendee_ids) && m.attendee_ids.length
      ? m.attendee_ids
      : ([m.participantA?.id, m.participantB?.id].filter(Boolean) as string[])
  return ids
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
  const names = meetingAttendees(m, approvedPool, participants).map((p) => p.organization_name)
  return names.join(' × ') || 'Participants'
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
  const [showAdd, setShowAdd] = useState(false)
  const [pickQuery, setPickQuery] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [selectedParticipantId, setSelectedParticipantId] = useState<string | null>(null)
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null)
  const [editingMeetingId, setEditingMeetingId] = useState<string | null>(null)
  const detailRef = useRef<HTMLElement | null>(null)

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

  const filteredParticipants = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return participants
    return participants.filter((p) =>
      [p.organization_name, p.contact_name, p.email, p.sector, p.kind]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    )
  }, [participants, query])

  const filteredMeetings = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return meetings
    return meetings.filter((m) => {
      const names = meetingNames(m, approvedPool, participants).toLowerCase()
      return (
        names.includes(q) ||
        (m.location || '').toLowerCase().includes(q) ||
        (m.table_label || '').toLowerCase().includes(q) ||
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

  /* Scrolle jusqu'au panneau détail après sélection. */
  useEffect(() => {
    if (!selectedParticipantId && !selectedMeetingId) return
    detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [selectedParticipantId, selectedMeetingId])

  const pickList = useMemo(() => {
    const q = pickQuery.trim().toLowerCase()
    return approvedPool.filter((p) => {
      if (selectedIds.includes(p.id)) return false
      if (!q) return true
      return [p.organization_name, p.contact_name, p.email, p.kind]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    })
  }, [approvedPool, pickQuery, selectedIds])

  /* Approuve / refuse. */
  async function onReview(id: string, status: 'approved' | 'rejected', e?: MouseEvent) {
    e?.stopPropagation()
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

  /* Crée un RDV (date, heures, lieu, personnes). */
  async function onCreateMeeting(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (selectedIds.length < 1) {
      setError('Sélectionnez au moins une personne')
      return
    }
    const fd = new FormData(e.currentTarget)
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
        table_label: String(fd.get('table_label') || '') || undefined,
      })
      setShowAdd(false)
      setSelectedIds([])
      setPickQuery('')
      e.currentTarget.reset()
      setTab('meetings')
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
      setEditingMeetingId(null)
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
        table_label: String(fd.get('table_label') || '') || undefined,
        location: String(fd.get('location') || '') || undefined,
      })
      setEditingMeetingId(null)
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
    setSelectedParticipantId((prev) => (prev === id ? null : id))
  }

  /* Sélectionne un RDV (détail). */
  function selectMeeting(id: string) {
    setSelectedMeetingId((prev) => (prev === id ? null : id))
    setEditingMeetingId(null)
  }

  /* Ouvre le panneau RDV en mode édition. */
  function openMeetingEdit(id: string, e?: MouseEvent) {
    e?.stopPropagation()
    setSelectedMeetingId(id)
    setEditingMeetingId(id)
  }

  /* Change d'onglet et ferme les détails. */
  function switchTab(next: 'participants' | 'meetings') {
    setTab(next)
    setSelectedParticipantId(null)
    setSelectedMeetingId(null)
    setEditingMeetingId(null)
  }

  return (
    <OrgaShell
      title="Rencontres d'affaires"
      searchPlaceholder="Rechercher…"
      onSearch={setQuery}
      actions={
        <div className="flex items-center gap-2">
          {tab === 'meetings' && (
            <button type="button" className="orga-btn" onClick={() => setShowAdd((v) => !v)}>
              {showAdd ? 'Fermer' : 'Ajouter'}
            </button>
          )}
          {tab === 'participants' && (
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as typeof filter)}
              className="orga-input w-auto"
            >
              <option value="">Tous</option>
              <option value="pending">En attente</option>
              <option value="approved">Approuvés</option>
              <option value="rejected">Refusés</option>
            </select>
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
              tab === t ? 'bg-forest text-white' : 'bg-white text-forest hover:bg-black/[0.03]'
            } ${t === 'meetings' ? 'border-l border-black' : ''}`}
          >
            {t === 'participants' ? 'Participants' : 'Rendez-vous'}
          </button>
        ))}
      </div>

      {tab === 'participants' && (
        <>
          <section className="orga-panel !p-0 overflow-x-auto">
            <div className="flex items-center justify-between border-b border-black px-4 py-3">
              <h2 className="text-[15px] font-semibold text-forest">
                {filteredParticipants.length} participant{filteredParticipants.length > 1 ? 's' : ''}
              </h2>
              <p className="text-[12px] text-ink/45">Cliquez une ligne pour le détail</p>
            </div>
            <table className="orga-table min-w-[640px]">
              <thead>
                <tr>
                  <th className="w-12">#</th>
                  <th>Organisation</th>
                  <th className="w-28">Profil</th>
                  <th className="w-28">Statut</th>
                  <th className="w-28">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredParticipants.length === 0 && (
                  <tr><td colSpan={5} className="py-10 text-ink/40">Aucun participant</td></tr>
                )}
                {filteredParticipants.map((p, i) => (
                  <tr
                    key={p.id}
                    className={`${participantRowClass(p.status)} cursor-pointer ${
                      selectedParticipantId === p.id ? 'bg-forest/10' : ''
                    }`}
                    onClick={() => selectParticipant(p.id)}
                  >
                    <td className="text-ink/45">{i + 1}</td>
                    <td className="font-semibold text-forest">{p.organization_name}</td>
                    <td className="font-medium text-forest">{p.kind}</td>
                    <td>{statusLabel(p.status)}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      {p.status === 'pending' ? (
                        <div className="flex flex-wrap gap-1.5">
                          <button
                            type="button"
                            title="Approuver"
                            aria-label="Approuver"
                            disabled={busyId === p.id}
                            onClick={(e) => void onReview(p.id, 'approved', e)}
                            className={iconBtn}
                          >
                            <IconCheck />
                          </button>
                          <button
                            type="button"
                            title="Refuser"
                            aria-label="Refuser"
                            disabled={busyId === p.id}
                            onClick={(e) => void onReview(p.id, 'rejected', e)}
                            className={iconBtn}
                          >
                            <IconX />
                          </button>
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {selectedParticipant && (
            <section ref={detailRef} className="orga-panel mt-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-[16px] font-semibold text-forest">
                    {selectedParticipant.organization_name}
                  </h2>
                  <p className="mt-1 text-[13px] text-ink/50">
                    {selectedParticipant.kind}
                    {' · '}
                    {statusLabel(selectedParticipant.status)}
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

              <div className="mt-4 grid gap-3 text-[13px] sm:grid-cols-2">
                <p>
                  <span className="text-ink/45">Contact · </span>
                  {selectedParticipant.contact_name}
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
                  <span className="text-ink/45">Pays · </span>
                  {selectedParticipant.country || '—'}
                </p>
                <p>
                  <span className="text-ink/45">Opt-in contact · </span>
                  {selectedParticipant.contact_opt_in ? 'Oui' : 'Non'}
                </p>
                <p className="sm:col-span-2">
                  <span className="text-ink/45">Offre · </span>
                  {selectedParticipant.offers || '—'}
                </p>
                <p className="sm:col-span-2">
                  <span className="text-ink/45">Cherche · </span>
                  {selectedParticipant.seeks || '—'}
                </p>
              </div>

              {selectedParticipant.status === 'pending' && (
                <div className="mt-4 flex flex-wrap gap-2 border-t border-black/10 pt-4">
                  <button
                    type="button"
                    disabled={busyId === selectedParticipant.id}
                    onClick={() => void onReview(selectedParticipant.id, 'approved')}
                    className="orga-btn disabled:opacity-50"
                  >
                    Approuver
                  </button>
                  <button
                    type="button"
                    disabled={busyId === selectedParticipant.id}
                    onClick={() => void onReview(selectedParticipant.id, 'rejected')}
                    className="orga-btn-ghost disabled:opacity-50"
                  >
                    Refuser
                  </button>
                </div>
              )}
            </section>
          )}
        </>
      )}

      {tab === 'meetings' && (
        <div className="space-y-4">
          {showAdd && (
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
                  <input required name="location" placeholder="Palais des congrès, table T12…" className={field} />
                </label>
                <label className="text-[13px] font-medium text-forest">
                  Début
                  <input required type="time" name="start" className={field} />
                </label>
                <label className="text-[13px] font-medium text-forest">
                  Fin
                  <input required type="time" name="end" className={field} />
                </label>
                <label className="text-[13px] font-medium text-forest sm:col-span-2">
                  Table (optionnel)
                  <input name="table_label" placeholder="T12" className={field} />
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
                          {p.organization_name} ×
                        </button>
                      )
                    })}
                    {selectedIds.length === 0 && (
                      <span className="text-[13px] text-ink/40">Aucune sélection</span>
                    )}
                  </div>
                  <input
                    value={pickQuery}
                    onChange={(e) => setPickQuery(e.target.value)}
                    placeholder="Rechercher une organisation ou un contact…"
                    className={`${field} mt-2`}
                  />
                  {pickQuery.trim() && (
                    <ul className="mt-1 max-h-48 overflow-y-auto border border-black bg-white">
                      {pickList.length === 0 && (
                        <li className="px-3 py-2 text-[13px] text-ink/40">Aucun résultat</li>
                      )}
                      {pickList.slice(0, 12).map((p) => (
                        <li key={p.id}>
                          <button
                            type="button"
                            className="block w-full px-3 py-2 text-left text-[13px] hover:bg-forest/5"
                            onClick={() => addPerson(p.id)}
                          >
                            <span className="font-semibold text-forest">{p.organization_name}</span>
                            <span className="text-ink/50"> · {p.contact_name} · {p.kind}</span>
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
                  <th>Participants</th>
                  <th>Lieu</th>
                  <th className="w-28">Statut</th>
                  <th className="w-20">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredMeetings.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-10 text-ink/40">
                      Aucun rendez-vous
                    </td>
                  </tr>
                )}
                {filteredMeetings.map((m, i) => {
                  const names = meetingNames(m, approvedPool, participants)
                  return (
                    <tr
                      key={m.id}
                      className={`cursor-pointer ${selectedMeetingId === m.id ? 'bg-forest/10' : ''}`}
                      onClick={() => selectMeeting(m.id)}
                    >
                      <td className="text-ink/45">{i + 1}</td>
                      <td className="whitespace-nowrap font-medium text-forest">
                        {new Date(m.slot_start).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: 'short',
                        })}
                        {' · '}
                        {new Date(m.slot_start).toLocaleTimeString('fr-FR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="font-medium text-ink">{names}</td>
                      <td>
                        {m.location || '—'}
                        {m.table_label ? ` · ${m.table_label}` : ''}
                      </td>
                      <td className="text-[12px] uppercase tracking-wide text-ink/45">{m.status}</td>
                      <td onClick={(e) => e.stopPropagation()}>
                        {m.status !== 'done' ? (
                          <button
                            type="button"
                            title="Modifier / reporter"
                            aria-label="Modifier"
                            className={iconBtn}
                            onClick={(e) => openMeetingEdit(m.id, e)}
                          >
                            <IconEdit />
                          </button>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </section>

          {selectedMeeting && (
            <section ref={detailRef} className="orga-panel mt-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-[16px] font-semibold text-forest">
                    {meetingNames(selectedMeeting, approvedPool, participants)}
                  </h2>
                  <p className="mt-1 text-[13px] text-ink/50">
                    {new Date(selectedMeeting.slot_start).toLocaleString('fr-FR')} →{' '}
                    {new Date(selectedMeeting.slot_end).toLocaleTimeString('fr-FR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                    {' · '}
                    {selectedMeeting.status}
                  </p>
                </div>
                <button
                  type="button"
                  className="orga-btn-ghost px-3 py-1.5 text-[13px]"
                  onClick={() => {
                    setSelectedMeetingId(null)
                    setEditingMeetingId(null)
                  }}
                >
                  Fermer
                </button>
              </div>

              <div className="mt-4 grid gap-3 text-[13px] sm:grid-cols-2">
                <p>
                  <span className="text-ink/45">Lieu · </span>
                  {selectedMeeting.location || '—'}
                </p>
                <p>
                  <span className="text-ink/45">Table · </span>
                  {selectedMeeting.table_label || '—'}
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
                      <p className="font-semibold text-forest">{p.organization_name}</p>
                      <p className="mt-0.5 text-ink/55">
                        {p.contact_name}
                        {p.kind ? ` · ${p.kind}` : ''}
                      </p>
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
                    key={`reschedule-${selectedMeeting.id}-${editingMeetingId || 'view'}`}
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
            </section>
          )}
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
