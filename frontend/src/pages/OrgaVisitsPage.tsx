import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  createBooking,
  listBookableSites,
  listBookings,
  type BookableSite,
  type VisitBooking,
} from '../api/bookings'
import { OrgaShell } from '../components/layout/OrgaShell'
import { googleMapsUrl } from '../api/labels'

const field =
  'mt-1 w-full border border-black bg-white px-3 py-2 text-[14px] text-ink focus:outline-none'

const iconBtn =
  'grid h-9 w-9 place-items-center border border-black bg-white text-forest hover:bg-forest hover:text-white disabled:opacity-40'

/* Semaine officielle SI 2026 (lundi 16 → dimanche 22 novembre). */
const EVENT_WEEK = [
  { iso: '2026-11-16', weekday: 'Lundi', short: 'Lun' },
  { iso: '2026-11-17', weekday: 'Mardi', short: 'Mar' },
  { iso: '2026-11-18', weekday: 'Mercredi', short: 'Mer' },
  { iso: '2026-11-19', weekday: 'Jeudi', short: 'Jeu' },
  { iso: '2026-11-20', weekday: 'Vendredi', short: 'Ven' },
  { iso: '2026-11-21', weekday: 'Samedi', short: 'Sam' },
  { iso: '2026-11-22', weekday: 'Dimanche', short: 'Dim' },
] as const

const EVENT_WEEK_SET = new Set<string>(EVENT_WEEK.map((d) => d.iso))

/* Jour du mois depuis un ISO. */
function dayNumber(iso: string) {
  return Number(iso.slice(8, 10))
}

/* Vérifie que la date est dans la semaine du 16 au 22 novembre 2026. */
function isEventWeekDay(iso: string) {
  return EVENT_WEEK_SET.has(iso)
}

/* Libellé court d'un jour SI. */
function formatVisitDay(iso: string) {
  const meta = EVENT_WEEK.find((d) => d.iso === iso)
  if (!meta) return iso
  return `${meta.short} ${dayNumber(iso)}`
}

/* Site positionné sur la carte. */
function isOnMap(b: VisitBooking) {
  return (
    b.organization?.lat != null &&
    b.organization?.lng != null &&
    Number.isFinite(Number(b.organization.lat)) &&
    Number.isFinite(Number(b.organization.lng))
  )
}

/* Icône liste. */
function IconTable() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  )
}

/* Icône calendrier. */
function IconCalendar() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="3" y="5" width="18" height="16" rx="1" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  )
}

/* Arrangements de visites : site + établissement + créneau (orga). */
export default function OrgaVisitsPage() {
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
  const [view, setView] = useState<'table' | 'calendar'>('table')
  const [selectedDay, setSelectedDay] = useState<string>(EVENT_WEEK[0].iso)
  const [selectedId, setSelectedId] = useState<string | null>(null)

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
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  const selected = useMemo(
    () => filtered.find((b) => b.id === selectedId) || items.find((b) => b.id === selectedId) || null,
    [filtered, items, selectedId],
  )

  const byDay = useMemo(() => {
    const map = new Map<string, VisitBooking[]>()
    for (const b of filtered) {
      const key = b.visit_day
      const list = map.get(key) || []
      list.push(b)
      map.set(key, list)
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.visit_start.localeCompare(b.visit_start))
    }
    return map
  }, [filtered])

  const dayVisits = byDay.get(selectedDay) || []
  const selectedMeta = EVENT_WEEK.find((d) => d.iso === selectedDay) || EVENT_WEEK[0]

  /* Applique un créneau suggéré du site (uniquement si jour dans la semaine SI). */
  function applySlot(day: string, start: string, end: string) {
    if (!isEventWeekDay(day)) {
      setError('Les visites doivent être entre le 16 et le 22 novembre 2026.')
      return
    }
    setError(null)
    setVisitDay(day)
    setVisitStart(start)
    setVisitEnd(end)
  }

  /* Enregistre la visite. */
  async function onArrange(e: FormEvent) {
    e.preventDefault()
    if (!siteId || !schoolId) return
    if (!isEventWeekDay(visitDay)) {
      setError('Choisissez un jour entre le 16 et le 22 novembre 2026.')
      return
    }
    if (visitEnd <= visitStart) {
      setError('L\'heure de fin doit être après l\'heure de début.')
      return
    }
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
      setError(err instanceof Error ? err.message : 'Ajout impossible')
    } finally {
      setBusy(false)
    }
  }

  /* Sélectionne une visite (détail). */
  function selectVisit(id: string) {
    setSelectedId((prev) => (prev === id ? null : id))
  }

  return (
    <OrgaShell
      title="Planning visites"
      searchPlaceholder="Rechercher une visite…"
      onSearch={setQuery}
      actions={
        <div className="flex items-center gap-2">
          <div className="flex border border-black">
            <button
              type="button"
              title="Tableau"
              aria-label="Vue tableau"
              aria-pressed={view === 'table'}
              onClick={() => setView('table')}
              className={`${iconBtn} border-0 ${view === 'table' ? 'bg-forest text-white' : ''}`}
            >
              <IconTable />
            </button>
            <button
              type="button"
              title="Calendrier"
              aria-label="Vue calendrier"
              aria-pressed={view === 'calendar'}
              onClick={() => setView('calendar')}
              className={`${iconBtn} border-0 border-l border-black ${
                view === 'calendar' ? 'bg-forest text-white' : ''
              }`}
            >
              <IconCalendar />
            </button>
          </div>
          <button type="button" className="orga-btn" onClick={() => setShowForm((v) => !v)}>
            {showForm ? 'Fermer' : 'Ajouter'}
          </button>
        </div>
      }
    >
      {error && <p className="mb-4 text-[14px] text-red-700">{error}</p>}

      {showForm && (
        <section className="orga-panel mb-6">
          <h2 className="text-[15px] font-semibold text-forest">Nouvelle visite</h2>
          <p className="mt-1 text-[13px] text-ink/50">
            Site → établissement → créneau (16 au 22 novembre 2026).
          </p>
          {sites.length === 0 && (
            <p className="mt-3 text-[13px] text-red-700">
              Aucun site positionné. Approuvez une industrie avec emplacement (carte) dans Labels.
            </p>
          )}

          <form onSubmit={onArrange} className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="text-[13px] font-medium text-forest sm:col-span-2">
              Site (industrie)
              <select required value={siteId} onChange={(e) => setSiteId(e.target.value)} className={field}>
                {sites.length === 0 && <option value="">Aucun site labellisé</option>}
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}{s.city ? ` · ${s.city}` : ''}
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
                    {s.name}{s.city ? ` · ${s.city}` : ''}
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
                      {s.day} {s.start}-{s.end}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <label className="text-[13px] font-medium text-forest">
              Jour (16 au 22 novembre)
              <select
                required
                value={visitDay}
                onChange={(e) => {
                  setVisitDay(e.target.value)
                  setError(null)
                }}
                className={field}
              >
                <option value="" disabled>
                  Choisir un jour
                </option>
                {EVENT_WEEK.map((d) => (
                  <option key={d.iso} value={d.iso}>
                    {d.weekday} {dayNumber(d.iso)} novembre
                  </option>
                ))}
              </select>
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
                {busy ? 'Enregistrement…' : 'Confirmer'}
              </button>
            </div>
          </form>
        </section>
      )}

      {view === 'table' ? (
        <section className="orga-panel !p-0 overflow-x-auto">
          <div className="flex items-center justify-between border-b border-black px-4 py-3">
            <h2 className="text-[15px] font-semibold text-forest">
              {filtered.length} visite{filtered.length > 1 ? 's' : ''}
            </h2>
            <p className="text-[12px] text-ink/45">Cliquez une ligne pour le détail</p>
          </div>
          <table className="orga-table min-w-[560px]">
            <thead>
              <tr>
                <th className="w-12">#</th>
                <th>Établissement</th>
                <th>Site</th>
                <th>Jour</th>
                <th className="w-20">Effectif</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-10 text-ink/40">
                    Aucune visite
                  </td>
                </tr>
              )}
              {filtered.map((b, i) => {
                const onMap = isOnMap(b)
                return (
                  <tr
                    key={b.id}
                    className={`${onMap ? '' : 'orga-row-pending'} cursor-pointer ${
                      selectedId === b.id ? 'bg-forest/10' : ''
                    }`}
                    onClick={() => selectVisit(b.id)}
                  >
                    <td className="text-ink/45">{i + 1}</td>
                    <td className="font-medium text-forest">{b.school_name}</td>
                    <td>{b.organization?.name || '—'}</td>
                    <td>
                      {formatVisitDay(b.visit_day)} · {b.visit_start}-{b.visit_end}
                    </td>
                    <td className="font-semibold text-forest">{b.headcount}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </section>
      ) : (
        <section className="orga-panel">
          <div className="mb-4">
            <h2 className="text-[18px] font-semibold text-forest">Semaine du 16 au 22 novembre 2026</h2>
            <p className="mt-1 text-[13px] text-ink/50">
              Cliquez sur un jour, puis une visite pour le détail.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
            {EVENT_WEEK.map((day) => {
              const count = (byDay.get(day.iso) || []).length
              const active = selectedDay === day.iso
              const isToday = day.iso === new Date().toISOString().slice(0, 10)
              return (
                <button
                  key={day.iso}
                  type="button"
                  onClick={() => setSelectedDay(day.iso)}
                  className={`min-h-[120px] border px-3 py-4 text-left transition-colors ${
                    active
                      ? 'border-forest bg-forest text-white'
                      : 'border-black bg-white text-ink hover:bg-forest/5'
                  } ${isToday && !active ? 'ring-2 ring-inset ring-sun' : ''}`}
                >
                  <p className={`text-[12px] font-semibold uppercase tracking-wide ${active ? 'text-white/70' : 'text-ink/45'}`}>
                    {day.short}
                  </p>
                  <p className={`mt-1 text-[28px] font-bold leading-none ${active ? 'text-white' : 'text-forest'}`}>
                    {dayNumber(day.iso)}
                  </p>
                  <p className={`mt-3 text-[13px] font-semibold ${active ? 'text-sun' : 'text-forest'}`}>
                    {count === 0 ? 'Aucune visite' : `${count} visite${count > 1 ? 's' : ''}`}
                  </p>
                </button>
              )
            })}
          </div>

          <div className="mt-6 border-t border-black pt-5">
            <h3 className="text-[16px] font-semibold capitalize text-forest">
              {selectedMeta.weekday} {dayNumber(selectedDay)} novembre
            </h3>
            <p className="mt-1 text-[13px] text-ink/50">
              {dayVisits.length === 0
                ? 'Aucune visite prévue ce jour.'
                : `${dayVisits.length} visite${dayVisits.length > 1 ? 's' : ''}`}
            </p>

            {dayVisits.length > 0 && (
              <ul className="mt-4 space-y-2">
                {dayVisits.map((b) => (
                  <li key={b.id}>
                    <button
                      type="button"
                      onClick={() => selectVisit(b.id)}
                      className={`w-full border border-black px-4 py-3 text-left transition-colors ${
                        selectedId === b.id ? 'bg-forest/10' : 'bg-white hover:bg-forest/5'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-[14px] font-semibold text-forest">
                          {b.visit_start}-{b.visit_end} · {b.school_name}
                        </p>
                        <p className="text-[13px] font-bold text-forest">{b.headcount} pers.</p>
                      </div>
                      <p className="mt-1 text-[13px] text-ink/55">
                        chez {b.organization?.name || 'site non renseigné'}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}

      {selected && (
        <section className="orga-panel mt-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-[16px] font-semibold text-forest">{selected.school_name}</h2>
              <p className="mt-1 text-[13px] text-ink/50">
                {formatVisitDay(selected.visit_day)} · {selected.visit_start}-{selected.visit_end}
                {' · '}
                {selected.headcount} pers.
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
              <span className="text-ink/45">Site · </span>
              <span className="font-medium text-forest">{selected.organization?.name || '—'}</span>
              {selected.organization?.city ? ` · ${selected.organization.city}` : ''}
            </p>
            <p>
              <span className="text-ink/45">Statut · </span>
              {selected.status || '—'}
            </p>
            <p>
              <span className="text-ink/45">Contact · </span>
              {selected.teacher_name || '—'}
            </p>
            <p>
              <span className="text-ink/45">Téléphone · </span>
              {selected.teacher_phone ? (
                <a
                  href={`tel:${selected.teacher_phone}`}
                  className="font-medium text-forest underline underline-offset-2"
                >
                  {selected.teacher_phone}
                </a>
              ) : (
                '—'
              )}
            </p>
            <p className="sm:col-span-2">
              <span className="text-ink/45">E-mail · </span>
              {selected.teacher_email ? (
                <a
                  href={`mailto:${selected.teacher_email}`}
                  className="font-medium text-forest underline underline-offset-2"
                >
                  {selected.teacher_email}
                </a>
              ) : (
                '—'
              )}
            </p>
            <p className="sm:col-span-2">
              <span className="text-ink/45">Carte · </span>
              {isOnMap(selected) ? (
                <a
                  href={
                    googleMapsUrl(selected.organization?.lat, selected.organization?.lng) || undefined
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-forest underline underline-offset-2"
                >
                  Voir l&apos;emplacement
                </a>
              ) : (
                <span className="font-medium text-red-700">
                  Hors carte : ajoutez une position au site
                </span>
              )}
            </p>
          </div>
        </section>
      )}
    </OrgaShell>
  )
}
