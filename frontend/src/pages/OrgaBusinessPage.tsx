import { useEffect, useMemo, useState, type FormEvent } from 'react'
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

/* Backoffice : participants B2B + rendez-vous. */
export default function OrgaBusinessPage() {
  const [participants, setParticipants] = useState<BusinessParticipant[]>([])
  const [approvedPool, setApprovedPool] = useState<BusinessParticipant[]>([])
  const [meetings, setMeetings] = useState<BusinessMeeting[]>([])
  const [tab, setTab] = useState<'participants' | 'meetings'>('participants')
  const [filter, setFilter] = useState<'pending' | 'approved' | ''>('pending')
  const [query, setQuery] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [pickQuery, setPickQuery] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])

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

  return (
    <OrgaShell
      title="Rencontres d'affaires"
      searchPlaceholder="Rechercher un profil…"
      onSearch={setQuery}
      actions={
        <div className="flex items-center gap-2">
          {tab === 'meetings' && (
            <button type="button" className="orga-btn" onClick={() => setShowAdd((v) => !v)}>
              {showAdd ? 'Fermer' : 'Ajouter'}
            </button>
          )}
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as typeof filter)}
            className="orga-input w-auto"
          >
            <option value="pending">En attente</option>
            <option value="approved">Approuvés</option>
            <option value="">Tous</option>
          </select>
          <a
            href="https://semaineindustrie.tg/affaires"
            target="_blank"
            rel="noopener noreferrer"
            className="orga-btn-ghost px-3 py-2 text-[13px]"
          >
            Formulaire public
          </a>
        </div>
      }
    >
      {error && <p className="mb-4 text-[14px] text-red-700">{error}</p>}

      <div className="mb-4 flex gap-0 border border-black">
        {(['participants', 'meetings'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex-1 px-4 py-2.5 text-[14px] font-semibold ${
              tab === t ? 'bg-forest text-white' : 'bg-white text-forest hover:bg-black/[0.03]'
            } ${t === 'meetings' ? 'border-l border-black' : ''}`}
          >
            {t === 'participants' ? 'Participants' : 'Rendez-vous'}
          </button>
        ))}
      </div>

      {tab === 'participants' && (
        <section className="orga-panel">
          <div className="overflow-x-auto">
            <table className="orga-table min-w-[720px]">
              <thead>
                <tr>
                  <th>Organisation</th>
                  <th>Profil</th>
                  <th>Offre / besoin</th>
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredParticipants.length === 0 && (
                  <tr><td colSpan={5} className="py-10 text-ink/40">Aucun participant</td></tr>
                )}
                {filteredParticipants.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <p className="font-semibold text-forest">{p.organization_name}</p>
                      <p className="mt-1 text-ink/50">{p.contact_name} · {p.email}</p>
                    </td>
                    <td>
                      <span className="font-medium text-forest">{p.kind}</span>
                      {p.sector && <p className="mt-2 text-ink/45">{p.sector}</p>}
                    </td>
                    <td>
                      <p><span className="text-ink/35">Offre :</span> {p.offers || '—'}</p>
                      <p className="mt-1"><span className="text-ink/35">Cherche :</span> {p.seeks || '—'}</p>
                    </td>
                    <td>{p.status}</td>
                    <td>
                      {p.status === 'pending' ? (
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={busyId === p.id}
                            onClick={() => void onReview(p.id, 'approved')}
                            className="orga-btn disabled:opacity-50"
                          >
                            Approuver
                          </button>
                          <button
                            type="button"
                            disabled={busyId === p.id}
                            onClick={() => void onReview(p.id, 'rejected')}
                            className="orga-btn-ghost disabled:opacity-50"
                          >
                            Refuser
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
          </div>
        </section>
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

          <section className="orga-panel">
            <h2 className="mb-4 text-[15px] font-semibold text-forest">
              {meetings.length} rendez-vous
            </h2>
            <ul className="space-y-3">
              {meetings.length === 0 && <li className="text-[13px] text-ink/40">Aucun rendez-vous</li>}
              {meetings.map((m) => {
                const ids =
                  Array.isArray(m.attendee_ids) && m.attendee_ids.length
                    ? m.attendee_ids
                    : [m.participantA?.id, m.participantB?.id].filter(Boolean) as string[]
                const names =
                  ids
                    .map((id) => {
                      const p =
                        approvedPool.find((x) => x.id === id) ||
                        participants.find((x) => x.id === id) ||
                        (m.participantA?.id === id ? m.participantA : null) ||
                        (m.participantB?.id === id ? m.participantB : null)
                      return p?.organization_name
                    })
                    .filter(Boolean)
                    .join(' × ') || 'Participants'
                return (
                  <li key={m.id} className="border border-black bg-white p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-forest">{names}</p>
                        <p className="mt-1 text-[13px] text-ink/55">
                          {new Date(m.slot_start).toLocaleString('fr-FR')} →{' '}
                          {new Date(m.slot_end).toLocaleTimeString('fr-FR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                          {m.location ? ` · ${m.location}` : ''}
                          {m.table_label ? ` · Table ${m.table_label}` : ''}
                        </p>
                        <p className="mt-1 text-[12px] uppercase tracking-wide text-ink/35">{m.status}</p>
                      </div>
                    </div>
                    {m.status !== 'done' ? (
                      <div className="mt-3 space-y-3">
                        <form
                          className="grid gap-2 md:grid-cols-4"
                          onSubmit={(e) => void onReschedule(e, m.id)}
                        >
                          <label className="text-[12px] font-medium text-ink/50">
                            Nouveau début
                            <input
                              required
                              type="datetime-local"
                              name="slot_start"
                              defaultValue={toLocalInput(m.slot_start)}
                              className="mt-1 w-full orga-input"
                            />
                          </label>
                          <label className="text-[12px] font-medium text-ink/50">
                            Nouvelle fin
                            <input
                              required
                              type="datetime-local"
                              name="slot_end"
                              defaultValue={toLocalInput(m.slot_end)}
                              className="mt-1 w-full orga-input"
                            />
                          </label>
                          <label className="text-[12px] font-medium text-ink/50">
                            Lieu
                            <input
                              name="location"
                              defaultValue={m.location || ''}
                              className="mt-1 w-full orga-input"
                            />
                          </label>
                          <div className="flex items-end">
                            <button
                              type="submit"
                              disabled={busyId === m.id}
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
                            void onNote(m.id, note)
                          }}
                        >
                          <input
                            name="note"
                            placeholder="Fiche contact (30 sec)…"
                            className="flex-1 border border-black bg-white px-3 py-2.5 text-[13px]"
                          />
                          <button
                            type="submit"
                            disabled={busyId === m.id}
                            className="border border-black bg-forest px-4 py-2.5 text-[12px] font-semibold text-white disabled:opacity-50"
                          >
                            Clôturer + relance 3 mois
                          </button>
                        </form>
                      </div>
                    ) : (
                      <p className="mt-3 text-[13px] text-ink/60">{m.contact_note || 'Échange clôturé'}</p>
                    )}
                  </li>
                )
              })}
            </ul>
          </section>
        </div>
      )}
    </OrgaShell>
  )
}
