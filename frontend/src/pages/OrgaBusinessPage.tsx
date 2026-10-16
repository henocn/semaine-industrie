import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getStoredUser } from '../api/auth'
import {
  createMeeting,
  listMeetings,
  listParticipants,
  reviewParticipant,
  saveContactNote,
  type BusinessMeeting,
  type BusinessParticipant,
} from '../api/business'
import { OrgaShell } from '../components/layout/OrgaShell'

/* Backoffice : participants B2B + matching + fiches contact. */
export default function OrgaBusinessPage() {
  const navigate = useNavigate()
  const user = getStoredUser()
  const [participants, setParticipants] = useState<BusinessParticipant[]>([])
  const [approvedPool, setApprovedPool] = useState<BusinessParticipant[]>([])
  const [meetings, setMeetings] = useState<BusinessMeeting[]>([])
  const [tab, setTab] = useState<'participants' | 'meetings'>('participants')
  const [filter, setFilter] = useState<'pending' | 'approved' | ''>('pending')
  const [query, setQuery] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

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

  const filteredParticipants = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return participants
    return participants.filter((p) =>
      [p.organization_name, p.contact_name, p.email, p.sector, p.kind]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    )
  }, [participants, query])

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

  /* Crée un RDV. */
  async function onCreateMeeting(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const start = String(fd.get('slot_start') || '')
    const end = String(fd.get('slot_end') || '')
    try {
      await createMeeting({
        participant_a_id: String(fd.get('participant_a_id') || ''),
        participant_b_id: String(fd.get('participant_b_id') || ''),
        slot_start: new Date(start).toISOString(),
        slot_end: new Date(end).toISOString(),
        table_label: String(fd.get('table_label') || '') || undefined,
      })
      e.currentTarget.reset()
      setTab('meetings')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Création impossible')
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

  return (
    <OrgaShell
      title="Affaires"
      searchPlaceholder="Rechercher un profil…"
      onSearch={setQuery}
      actions={
        <div className="flex items-center gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as typeof filter)}
            className="rounded-xl border-0 bg-white px-3 py-2.5 text-[13px] font-medium text-forest shadow-sm"
          >
            <option value="pending">En attente</option>
            <option value="approved">Approuvés</option>
            <option value="">Tous</option>
          </select>
          <Link
            to="/affaires"
            className="rounded-xl bg-forest px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-ink"
          >
            Formulaire +
          </Link>
        </div>
      }
    >
      {error && <p className="mb-4 text-[14px] text-red-700">{error}</p>}

      <div className="mb-4 flex gap-2">
        {(['participants', 'meetings'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-xl px-4 py-2 text-[13px] font-semibold ${
              tab === t ? 'bg-white text-forest shadow-sm' : 'text-ink/50 hover:bg-white/60'
            }`}
          >
            {t === 'participants' ? 'Participants' : 'Rendez-vous'}
          </button>
        ))}
      </div>

      {tab === 'participants' && (
        <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-black/5 text-ink/40">
                  <th className="pb-3 font-medium">Organisation</th>
                  <th className="pb-3 font-medium">Profil</th>
                  <th className="pb-3 font-medium">Offre / besoin</th>
                  <th className="pb-3 font-medium">Statut</th>
                  <th className="pb-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredParticipants.length === 0 && (
                  <tr><td colSpan={5} className="py-10 text-ink/40">Aucun participant</td></tr>
                )}
                {filteredParticipants.map((p) => (
                  <tr key={p.id} className="border-b border-black/[0.04] align-top last:border-0">
                    <td className="py-4">
                      <p className="font-semibold text-forest">{p.organization_name}</p>
                      <p className="mt-1 text-ink/50">{p.contact_name} — {p.email}</p>
                    </td>
                    <td className="py-4">
                      <span className="rounded-full bg-[#e8f1ee] px-2.5 py-1 text-[12px] font-medium text-forest">
                        {p.kind}
                      </span>
                      {p.sector && <p className="mt-2 text-ink/45">{p.sector}</p>}
                    </td>
                    <td className="py-4 text-ink/55">
                      <p><span className="text-ink/35">Offre :</span> {p.offers || '—'}</p>
                      <p className="mt-1"><span className="text-ink/35">Cherche :</span> {p.seeks || '—'}</p>
                    </td>
                    <td className="py-4 text-ink/55">{p.status}</td>
                    <td className="py-4">
                      {p.status === 'pending' ? (
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={busyId === p.id}
                            onClick={() => onReview(p.id, 'approved')}
                            className="rounded-lg bg-forest px-3 py-2 text-[12px] font-semibold text-white disabled:opacity-50"
                          >
                            Approuver
                          </button>
                          <button
                            type="button"
                            disabled={busyId === p.id}
                            onClick={() => onReview(p.id, 'rejected')}
                            className="rounded-lg bg-[#f3f4f6] px-3 py-2 text-[12px] font-semibold text-ink/70 disabled:opacity-50"
                          >
                            Refuser
                          </button>
                        </div>
                      ) : '—'}
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
          <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-[15px] font-semibold text-forest">Créer un rendez-vous</h2>
            <form onSubmit={onCreateMeeting} className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <label className="text-[12px] font-medium text-ink/50">
                Participant A
                <select required name="participant_a_id" className="mt-1 w-full rounded-xl bg-[#f3f4f6] px-3 py-2.5 text-[13px] text-forest">
                  <option value="">Choisir…</option>
                  {approvedPool.map((p) => (
                    <option key={p.id} value={p.id}>{p.organization_name} ({p.kind})</option>
                  ))}
                </select>
              </label>
              <label className="text-[12px] font-medium text-ink/50">
                Participant B
                <select required name="participant_b_id" className="mt-1 w-full rounded-xl bg-[#f3f4f6] px-3 py-2.5 text-[13px] text-forest">
                  <option value="">Choisir…</option>
                  {approvedPool.map((p) => (
                    <option key={p.id} value={p.id}>{p.organization_name} ({p.kind})</option>
                  ))}
                </select>
              </label>
              <label className="text-[12px] font-medium text-ink/50">
                Début
                <input required type="datetime-local" name="slot_start" className="mt-1 w-full rounded-xl bg-[#f3f4f6] px-3 py-2.5 text-[13px]" />
              </label>
              <label className="text-[12px] font-medium text-ink/50">
                Fin
                <input required type="datetime-local" name="slot_end" className="mt-1 w-full rounded-xl bg-[#f3f4f6] px-3 py-2.5 text-[13px]" />
              </label>
              <label className="text-[12px] font-medium text-ink/50">
                Table
                <div className="mt-1 flex gap-2">
                  <input name="table_label" placeholder="T12" className="w-full rounded-xl bg-[#f3f4f6] px-3 py-2.5 text-[13px]" />
                  <button type="submit" className="rounded-xl bg-forest px-4 text-[13px] font-semibold text-white">OK</button>
                </div>
              </label>
            </form>
          </section>

          <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
            <h2 className="mb-4 text-[15px] font-semibold text-forest">{meetings.length} rendez-vous</h2>
            <ul className="space-y-3">
              {meetings.length === 0 && <li className="text-[13px] text-ink/40">Aucun rendez-vous</li>}
              {meetings.map((m) => (
                <li key={m.id} className="rounded-2xl bg-[#f7f8f9] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-forest">
                        {m.participantA?.organization_name} × {m.participantB?.organization_name}
                      </p>
                      <p className="mt-1 text-[13px] text-ink/55">
                        {new Date(m.slot_start).toLocaleString('fr-FR')} → {new Date(m.slot_end).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        {m.table_label ? ` · Table ${m.table_label}` : ''}
                      </p>
                      <p className="mt-1 text-[12px] uppercase tracking-wide text-ink/35">{m.status}</p>
                    </div>
                  </div>
                  {m.status !== 'done' ? (
                    <form
                      className="mt-3 flex flex-col gap-2 sm:flex-row"
                      onSubmit={(e) => {
                        e.preventDefault()
                        const note = String(new FormData(e.currentTarget).get('note') || '')
                        onNote(m.id, note)
                      }}
                    >
                      <input
                        name="note"
                        placeholder="Fiche contact (30 sec)…"
                        className="flex-1 rounded-xl bg-white px-3 py-2.5 text-[13px]"
                      />
                      <button
                        type="submit"
                        disabled={busyId === m.id}
                        className="rounded-xl bg-forest px-4 py-2.5 text-[12px] font-semibold text-white disabled:opacity-50"
                      >
                        Clôturer + relance 3 mois
                      </button>
                    </form>
                  ) : (
                    <p className="mt-3 text-[13px] text-ink/60">{m.contact_note || 'Échange clôturé'}</p>
                  )}
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </OrgaShell>
  )
}
