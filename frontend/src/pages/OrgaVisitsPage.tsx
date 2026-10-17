import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { getStoredUser } from '../api/auth'
import {
  createBooking,
  listBookableSites,
  listBookings,
  type BookableSite,
  type VisitBooking,
} from '../api/bookings'
import { OrgaShell } from '../components/layout/OrgaShell'

const field =
  'mt-1 w-full border border-black bg-white px-3 py-2 text-[14px] text-ink focus:outline-none'

/* Arrangements de visites : site + établissement + créneau (orga). */
export default function OrgaVisitsPage() {
  const navigate = useNavigate()
  const user = getStoredUser()
  const [items, setItems] = useState<VisitBooking[]>([])
  const [sites, setSites] = useState<BookableSite[]>([])
  const [schools, setSchools] = useState<BookableSite[]>([])
  const [siteId, setSiteId] = useState('')
  const [schoolId, setSchoolId] = useState('')
  const [visitDay, setVisitDay] = useState('')
  const [visitStart, setVisitStart] = useState('09:00')
  const [visitEnd, setVisitEnd] = useState('12:00')
  const [headcount, setHeadcount] = useState('')
  const [notes, setNotes] = useState('')
  const [query, setQuery] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [showForm, setShowForm] = useState(false)

  const selectedSite = useMemo(() => sites.find((s) => s.id === siteId) || null, [sites, siteId])
  const selectedSchool = useMemo(() => schools.find((s) => s.id === schoolId) || null, [schools, schoolId])
  const suggestedSlots = selectedSite?.visit_slots || []

  /* Charge listes. */
  async function load() {
    try {
      setError(null)
      const [bookings, siteList, schoolList] = await Promise.all([
        listBookings(),
        listBookableSites('entreprise'),
        listBookableSites('ecole'),
      ])
      setItems(bookings)
      setSites(siteList)
      setSchools(schoolList)
      if (!siteId && siteList[0]) setSiteId(siteList[0].id)
      if (!schoolId && schoolList[0]) setSchoolId(schoolList[0].id)
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
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate, user?.id, user?.role])

  /* Préremplit l'effectif depuis l'école. */
  useEffect(() => {
    if (selectedSchool?.max_visitors) setHeadcount(String(selectedSchool.max_visitors))
    else setHeadcount('')
  }, [selectedSchool])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter((b) =>
      [b.school_name, b.teacher_name, b.teacher_email, b.organization?.name, b.visit_day]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    )
  }, [items, query])

  /* Applique un créneau suggéré du site. */
  function applySlot(day: string, start: string, end: string) {
    setVisitDay(day)
    setVisitStart(start)
    setVisitEnd(end)
  }

  /* Enregistre l'arrangement. */
  async function onArrange(e: FormEvent) {
    e.preventDefault()
    if (!siteId || !schoolId) return
    setBusy(true)
    setError(null)
    try {
      await createBooking({
        organization_id: siteId,
        school_organization_id: schoolId,
        visit_day: visitDay,
        visit_start: visitStart,
        visit_end: visitEnd,
        headcount: headcount ? Number(headcount) : undefined,
        notes: notes || undefined,
      })
      setNotes('')
      setShowForm(false)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Arrangement impossible')
    } finally {
      setBusy(false)
    }
  }

  return (
    <OrgaShell
      title="Visites"
      searchPlaceholder="Rechercher une visite…"
      onSearch={setQuery}
      actions={
        <button type="button" className="orga-btn" onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Fermer' : 'Arranger +'}
        </button>
      }
    >
      {error && <p className="mb-4 text-[14px] text-red-700">{error}</p>}

      {showForm && (
        <section className="orga-panel mb-6">
          <h2 className="text-[15px] font-semibold text-forest">Nouvel arrangement</h2>
          <p className="mt-1 text-[13px] text-ink/50">
            Site → établissement → créneau. Seuls les sites avec position carte sont proposés.
          </p>
          {sites.length === 0 && (
            <p className="mt-3 text-[13px] text-red-700">
              Aucun site positionné. Approuvez une entreprise avec emplacement (carte) dans Demandes label.
            </p>
          )}

          <form onSubmit={onArrange} className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="text-[13px] font-medium text-forest sm:col-span-2">
              Site (entreprise)
              <select required value={siteId} onChange={(e) => setSiteId(e.target.value)} className={field}>
                {sites.length === 0 && <option value="">Aucun site labellisé</option>}
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}{s.city ? ` — ${s.city}` : ''}
                    {s.max_visitors ? ` · cap. ${s.max_visitors}` : ''}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-[13px] font-medium text-forest sm:col-span-2">
              Établissement (école)
              <select required value={schoolId} onChange={(e) => setSchoolId(e.target.value)} className={field}>
                {schools.length === 0 && <option value="">Aucune école labellisée</option>}
                {schools.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}{s.city ? ` — ${s.city}` : ''}
                  </option>
                ))}
              </select>
            </label>

            {selectedSchool && (
              <div className="border border-black bg-white px-3 py-2.5 text-[13px] sm:col-span-2">
                <p className="font-semibold text-forest">{selectedSchool.name}</p>
                <p className="mt-1 text-ink/60">
                  {selectedSchool.contact_email || '—'}
                  {selectedSchool.contact_phone ? ` · ${selectedSchool.contact_phone}` : ''}
                </p>
              </div>
            )}

            {suggestedSlots.length > 0 && (
              <div className="sm:col-span-2">
                <p className="text-[13px] font-medium text-forest">Créneaux déclarés du site</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {suggestedSlots.map((s) => (
                    <button
                      key={`${s.day}-${s.start}`}
                      type="button"
                      className="orga-btn-ghost px-3 py-1.5 text-[12px]"
                      onClick={() => applySlot(s.day, s.start, s.end)}
                    >
                      {s.day} {s.start}–{s.end}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <label className="text-[13px] font-medium text-forest">
              Jour
              <input required type="date" value={visitDay} onChange={(e) => setVisitDay(e.target.value)} className={field} />
            </label>
            <label className="text-[13px] font-medium text-forest">
              Effectif
              <input
                required
                type="number"
                min={1}
                value={headcount}
                onChange={(e) => setHeadcount(e.target.value)}
                className={field}
              />
            </label>
            <label className="text-[13px] font-medium text-forest">
              Début
              <input required type="time" value={visitStart} onChange={(e) => setVisitStart(e.target.value)} className={field} />
            </label>
            <label className="text-[13px] font-medium text-forest">
              Fin
              <input required type="time" value={visitEnd} onChange={(e) => setVisitEnd(e.target.value)} className={field} />
            </label>

            <label className="text-[13px] font-medium text-forest sm:col-span-2">
              Notes (optionnel)
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={field} />
            </label>

            <div className="sm:col-span-2">
              <button type="submit" disabled={busy || !siteId || !schoolId} className="orga-btn disabled:opacity-50">
                {busy ? 'Enregistrement…' : 'Confirmer l’arrangement'}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="orga-panel !p-0 overflow-x-auto">
        <div className="border-b border-black px-4 py-3">
          <h2 className="text-[15px] font-semibold text-forest">
            {filtered.length} visite{filtered.length > 1 ? 's' : ''}
          </h2>
        </div>
        <table className="orga-table min-w-[780px]">
          <thead>
            <tr>
              <th>#</th>
              <th>Établissement</th>
              <th>Site</th>
              <th>Créneau</th>
              <th>Effectif</th>
              <th>Contact</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={6}>Aucun arrangement</td></tr>
            )}
            {filtered.map((b, i) => {
              const onMap =
                b.organization?.lat != null &&
                b.organization?.lng != null &&
                Number.isFinite(Number(b.organization.lat)) &&
                Number.isFinite(Number(b.organization.lng))
              return (
              <tr key={b.id} className={onMap ? undefined : 'orga-row-pending'}>
                <td className="font-semibold text-forest">{i + 1}</td>
                <td className="font-medium text-forest">{b.school_name}</td>
                <td>
                  <p>{b.organization?.name || '—'}</p>
                  {!onMap && (
                    <p className="mt-1 text-[12px] font-medium text-red-700">
                      Hors carte — ajoutez une position au site
                    </p>
                  )}
                </td>
                <td>{b.visit_day} {b.visit_start}–{b.visit_end}</td>
                <td className="font-semibold text-forest">{b.headcount}</td>
                <td>
                  <a href={`tel:${b.teacher_phone || ''}`} className="block font-semibold text-forest underline underline-offset-2">
                    {b.teacher_phone || '—'}
                  </a>
                  <a href={`mailto:${b.teacher_email}`} className="mt-0.5 block text-ink/55 underline underline-offset-2">
                    {b.teacher_email}
                  </a>
                </td>
              </tr>
              )
            })}
          </tbody>
        </table>
      </section>
    </OrgaShell>
  )
}
