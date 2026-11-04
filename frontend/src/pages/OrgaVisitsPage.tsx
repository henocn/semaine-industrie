import { useEffect, useMemo, useState, type FormEvent, type MouseEvent } from 'react'
import {
  createBooking,
  deleteBooking,
  listBookableSites,
  listBookings,
  updateBooking,
  type BookableSite,
  type VisitBooking,
} from '../api/bookings'
import { listMapPoints, type MapPoint } from '../api/labels'
import { OrgaShell } from '../components/layout/OrgaShell'
import { SitesMap } from '../components/map/SitesMap'
import { IconEdit, IconTrash } from '../components/ui/IconButton'
import { useOrgaRealtime } from '../lib/useOrgaRealtime'
import { ExportBar, SelectAllHeader, SelectCell } from '../components/orga/RowSelection'
import { useRowSelection } from '../lib/useRowSelection'
import type { ExcelColumn } from '../lib/excel'

/* Colonnes de l'export Excel des visites. */
const EXPORT_COLUMNS: ExcelColumn<VisitBooking>[] = [
  { header: 'Établissement', width: 30, value: (b) => b.school_name },
  { header: 'Site visité', width: 30, value: (b) => b.organization?.name },
  { header: 'Jour', width: 12, value: (b) => (b.visit_day || '').split('-').reverse().join('/') },
  { header: 'Horaire', width: 14, value: (b) => `${b.visit_start} à ${b.visit_end}` },
  { header: 'Effectif', width: 10, value: (b) => b.headcount },
  { header: 'Passages', width: 10, value: (b) => b.passage ?? 0 },
  { header: 'Contact', width: 24, value: (b) => b.teacher_name },
  { header: 'Téléphone', width: 18, value: (b) => b.teacher_phone },
  { header: 'E-mail', width: 28, value: (b) => b.teacher_email },
]

const field =
  'mt-1 w-full border border-black bg-white px-3 py-2 text-[14px] text-ink focus:outline-none'

const iconBtn =
  'grid h-9 w-9 place-items-center border border-black bg-white text-forest hover:bg-forest hover:text-white disabled:opacity-40'

const iconBtnDanger =
  'grid h-9 w-9 place-items-center border border-black bg-white text-red-700 hover:bg-red-700 hover:text-white disabled:opacity-40'

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

/* Site positionné sur la carte. */
function isOnMap(b: VisitBooking) {
  return (
    b.organization?.lat != null &&
    b.organization?.lng != null &&
    Number.isFinite(Number(b.organization.lat)) &&
    Number.isFinite(Number(b.organization.lng))
  )
}

/* Arrangements de visites : site + établissement + créneau (orga). */
export default function OrgaVisitsPage() {
  const [items, setItems] = useState<VisitBooking[]>([])
  const [sites, setSites] = useState<BookableSite[]>([])
  const [schools, setSchools] = useState<BookableSite[]>([])
  const [siteId, setSiteId] = useState('')
  const [schoolId, setSchoolId] = useState('')
  const [schoolIds, setSchoolIds] = useState<string[]>([])
  const [visitDay, setVisitDay] = useState('')
  const [visitStart, setVisitStart] = useState('09:00')
  const [visitEnd, setVisitEnd] = useState('12:00')
  const [query, setQuery] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [view, setView] = useState<'table' | 'calendar' | 'map'>('table')
  const [selectedDay, setSelectedDay] = useState<string>(EVENT_WEEK[0].iso)
  const [mapPoints, setMapPoints] = useState<MapPoint[]>([])
  const [mapSelected, setMapSelected] = useState<string | null>(null)
  const [mapError, setMapError] = useState<string | null>(null)

  const selectedSite = useMemo(() => sites.find((s) => s.id === siteId) || null, [sites, siteId])
  const addedSchools = useMemo(
    () => schoolIds.map((id) => schools.find((s) => s.id === id)).filter((s): s is BookableSite => Boolean(s)),
    [schoolIds, schools],
  )
  const availableSchools = useMemo(
    () => (editingId ? schools : schools.filter((s) => !schoolIds.includes(s.id))),
    [editingId, schools, schoolIds],
  )
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

  useOrgaRealtime(['booking:changed', 'label:updated', 'label:created'], () => void load())

  /* Charge les points carte (sites avec visites) pour la vue Carte. */
  useEffect(() => {
    if (view !== 'map') return
    let cancelled = false
    async function loadMap() {
      try {
        setMapError(null)
        const data = await listMapPoints({ type: 'entreprise' })
        const withVisits = data.filter((p) => (p.visits?.groups ?? 0) > 0)
        if (cancelled) return
        setMapPoints(withVisits)
        setMapSelected((prev) =>
          prev && withVisits.some((p) => p.id === prev) ? prev : withVisits[0]?.id || null,
        )
      } catch (err) {
        if (!cancelled) setMapError(err instanceof Error ? err.message : 'Carte indisponible')
      }
    }
    void loadMap()
    return () => {
      cancelled = true
    }
  }, [view, items])

  const activeMapPoint = useMemo(
    () => mapPoints.find((p) => p.id === mapSelected) || null,
    [mapPoints, mapSelected],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter((b) =>
      [b.school_name, b.teacher_name, b.teacher_email, b.organization?.name, b.visit_day]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    )
  }, [items, query])
  const picked = useRowSelection(filtered)

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

  /* Remet le formulaire à vide. */
  function resetForm() {
    setEditingId(null)
    setSchoolIds([])
    setVisitDay('')
    setVisitStart('09:00')
    setVisitEnd('12:00')
    if (sites[0]) setSiteId(sites[0].id)
    if (schools[0]) setSchoolId(schools[0].id)
  }

  /* Ajoute l'école sélectionnée au cadre. */
  function addSelectedSchool() {
    if (!schoolId) return
    const nextIds = schoolIds.includes(schoolId) ? schoolIds : [...schoolIds, schoolId]
    setSchoolIds(nextIds)
    const remaining = schools.filter((s) => !nextIds.includes(s.id))
    setSchoolId(remaining[0]?.id || '')
  }

  /* Retire une école du cadre. */
  function removeSchool(id: string) {
    setSchoolIds((prev) => prev.filter((x) => x !== id))
    if (!schoolId) setSchoolId(id)
  }

  /* Ouvre le formulaire en création. */
  function openCreate() {
    resetForm()
    setShowForm(true)
  }

  /* Préremplit le formulaire pour modification. */
  function openEdit(b: VisitBooking, e?: MouseEvent) {
    e?.stopPropagation()
    setEditingId(b.id)
    setSiteId(b.organization?.id || '')
    setSchoolId(b.school?.id || '')
    setVisitDay(b.visit_day)
    setVisitStart(b.visit_start.slice(0, 5))
    setVisitEnd(b.visit_end.slice(0, 5))
    setSchoolIds(b.school?.id ? [b.school.id] : [])
    setShowForm(true)
    setError(null)
  }

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

  /* Enregistre ou met à jour la visite. */
  async function onArrange(e: FormEvent) {
    e.preventDefault()
    const ids = editingId ? (schoolId ? [schoolId] : []) : schoolIds
    if (!siteId || ids.length === 0) {
      setError('Ajoutez au moins un établissement avec +.')
      return
    }
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
      if (editingId) {
        await updateBooking(editingId, {
          organization_id: siteId,
          school_organization_id: ids[0],
          visit_day: visitDay,
          visit_start: visitStart,
          visit_end: visitEnd,
        })
      } else {
        await createBooking({
          organization_id: siteId,
          school_organization_ids: ids,
          visit_day: visitDay,
          visit_start: visitStart,
          visit_end: visitEnd,
        })
      }
      resetForm()
      setShowForm(false)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enregistrement impossible')
    } finally {
      setBusy(false)
    }
  }

  /* Supprime une visite après confirmation. */
  async function onDelete(id: string, e?: MouseEvent) {
    e?.stopPropagation()
    if (!window.confirm('Supprimer cette visite ?')) return
    setBusy(true)
    setError(null)
    try {
      await deleteBooking(id)
      if (editingId === id) {
        resetForm()
        setShowForm(false)
      }
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Suppression impossible')
    } finally {
      setBusy(false)
    }
  }

  return (
    <OrgaShell
      title="Planning visites"
      searchPlaceholder="Rechercher une visite…"
      onSearch={setQuery}
      actions={
        <button
          type="button"
          className="orga-btn"
          onClick={() => {
            if (showForm) {
              setShowForm(false)
              resetForm()
            } else {
              openCreate()
            }
          }}
        >
          {showForm ? 'Fermer' : 'Ajouter'}
        </button>
      }
    >
      {error && <p className="mb-4 text-[14px] text-red-700">{error}</p>}

      {showForm && (
        <section className="orga-panel mb-6">
          <h2 className="text-[15px] font-semibold text-forest">
            {editingId ? 'Modifier la visite' : 'Nouvelle visite'}
          </h2>
          {sites.length === 0 && (
            <p className="mt-3 text-[13px] text-red-700">
              Aucun site labellisé. Approuvez une industrie dans Labels.
            </p>
          )}

          <form onSubmit={onArrange} className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="text-[13px] font-medium text-forest sm:col-span-2">
              Site (industrie)
              <select required value={siteId} onChange={(e) => setSiteId(e.target.value)} className={field}>
                {sites.length === 0 && <option value="">Aucun site labellisé</option>}
                {sites.map((s) => {
                  const mapped = s.lat != null && s.lng != null
                  return (
                    <option key={s.id} value={s.id}>
                      {s.name}{s.city ? ` · ${s.city}` : ''}
                      {s.max_visitors ? ` · cap. ${s.max_visitors}` : ''}
                      {mapped ? '' : ' · hors carte'}
                    </option>
                  )
                })}
              </select>
            </label>

            <div className="sm:col-span-2">
              <p className="text-[13px] font-medium text-forest">Établissement (école)</p>
              <div className="mt-1 flex items-stretch gap-2">
                <select
                  value={schoolId}
                  onChange={(e) => setSchoolId(e.target.value)}
                  className="min-h-9 w-full flex-1 border border-black bg-white px-3 py-2 text-[14px] text-ink focus:outline-none"
                >
                  {availableSchools.length === 0 && (
                    <option value="">{schools.length === 0 ? 'Aucune école labellisée' : 'Tous les établissements sont ajoutés'}</option>
                  )}
                  {availableSchools.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}{s.city ? ` · ${s.city}` : ''}
                    </option>
                  ))}
                </select>
                {!editingId && (
                  <button
                    type="button"
                    title="Ajouter cet établissement"
                    aria-label="Ajouter cet établissement"
                    className="grid w-9 shrink-0 place-items-center self-stretch border border-black bg-white text-[18px] leading-none text-forest hover:bg-forest hover:text-white disabled:opacity-40"
                    disabled={!schoolId}
                    onClick={addSelectedSchool}
                  >
                    +
                  </button>
                )}
              </div>
            </div>

            {!editingId && (
              <div className="border border-black bg-white px-3 py-2.5 text-[13px] sm:col-span-2">
                {addedSchools.length === 0 && (
                  <p className="text-ink/50">Aucun établissement ajouté. Cliquez sur + pour l&apos;ajouter.</p>
                )}
                {addedSchools.length > 0 && (
                  <ul className="space-y-1">
                    {addedSchools.map((s) => (
                      <li key={s.id} className="flex items-center justify-between gap-3">
                        <p className="min-w-0 truncate font-semibold text-forest">{s.name}</p>
                        <button
                          type="button"
                          className={iconBtnDanger}
                          title="Retirer"
                          aria-label={`Retirer ${s.name}`}
                          onClick={() => removeSchool(s.id)}
                        >
                          ×
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
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
              Début
              <input required type="time" value={visitStart} onChange={(e) => setVisitStart(e.target.value)} className={field} />
            </label>
            <label className="text-[13px] font-medium text-forest">
              Fin
              <input required type="time" value={visitEnd} onChange={(e) => setVisitEnd(e.target.value)} className={field} />
            </label>

            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={busy || !siteId || (editingId ? !schoolId : schoolIds.length === 0)}
                className="orga-btn disabled:opacity-50"
              >
                {busy ? 'Enregistrement…' : editingId ? 'Enregistrer' : 'Confirmer'}
              </button>
            </div>
          </form>
        </section>
      )}

      <div className="mb-4 flex gap-0 border border-black">
        {(
          [
            { id: 'table' as const, label: 'Tableau' },
            { id: 'calendar' as const, label: 'Calendrier' },
            { id: 'map' as const, label: 'Carte' },
          ] as const
        ).map((tab, i) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setView(tab.id)}
            className={`flex-1 px-4 py-2.5 text-[14px] font-semibold transition-colors ${
              i > 0 ? 'border-l border-black' : ''
            } ${
              view === tab.id ? 'bg-forest text-white' : 'bg-white text-forest hover:bg-forest/10'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {view === 'table' && (
        <>
        <ExportBar selection={picked} filename="visites" sheet="Visites" columns={EXPORT_COLUMNS} />
        <section className="orga-panel !p-0 overflow-x-auto">
          <div className="border-b border-black px-4 py-3">
            <h2 className="text-[15px] font-semibold text-forest">
              {filtered.length} visite{filtered.length > 1 ? 's' : ''}
            </h2>
          </div>
          <table className="orga-table min-w-[780px]">
            <thead>
              <tr>
                <SelectAllHeader selection={picked} />
                <th>#</th>
                <th>Établissement</th>
                <th>Site</th>
                <th>Créneau</th>
                <th>Effectif</th>
                <th className="w-24">Passage</th>
                <th>Contact</th>
                <th className="w-28">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={9}>Aucune visite</td></tr>
              )}
              {filtered.map((b, i) => {
                const onMap = isOnMap(b)
                return (
                  <tr key={b.id} className={onMap ? undefined : 'orga-row-pending'}>
                    <SelectCell selection={picked} id={b.id} />
                    <td className="font-semibold text-forest">{i + 1}</td>
                    <td className="font-medium text-forest">{b.school_name}</td>
                    <td>
                      <p>{b.organization?.name || '—'}</p>
                      {!onMap && (
                        <p className="mt-1 text-[12px] font-medium text-red-700">
                          Hors carte : ajoutez une position au site
                        </p>
                      )}
                    </td>
                    <td>{b.visit_day} {b.visit_start}-{b.visit_end}</td>
                    <td className="font-semibold text-forest">{b.headcount}</td>
                    <td className={b.passage ? 'font-semibold text-forest' : 'text-ink/45'}>
                      {b.passage ?? 0}
                    </td>
                    <td>
                      {b.teacher_phone && (
                        <a href={`tel:${b.teacher_phone}`} className="block font-semibold text-forest underline underline-offset-2">
                          {b.teacher_phone}
                        </a>
                      )}
                      {b.teacher_email && (
                        <a href={`mailto:${b.teacher_email}`} className="mt-0.5 block text-ink/55 underline underline-offset-2">
                          {b.teacher_email}
                        </a>
                      )}
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          title="Modifier"
                          aria-label="Modifier"
                          className={iconBtn}
                          disabled={busy}
                          onClick={(e) => openEdit(b, e)}
                        >
                          <IconEdit />
                        </button>
                        <button
                          type="button"
                          title="Supprimer"
                          aria-label="Supprimer"
                          className={iconBtnDanger}
                          disabled={busy}
                          onClick={(e) => void onDelete(b.id, e)}
                        >
                          <IconTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </section>
        </>
      )}

      {view === 'calendar' && (
        <section className="orga-panel">
          <div className="mb-4">
            <h2 className="text-[18px] font-semibold text-forest">Semaine du 16 au 22 novembre 2026</h2>
            <p className="mt-1 text-[13px] text-ink/50">
              Cliquez sur un jour pour voir le détail des visites.
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
              <ul className="mt-4 space-y-3">
                {dayVisits.map((b) => {
                  const onMap = isOnMap(b)
                  return (
                    <li key={b.id} className="border border-black bg-white px-4 py-3">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-[15px] font-bold text-forest">
                            {b.visit_start}-{b.visit_end}
                          </p>
                          <p className="mt-1 text-[14px] font-semibold text-ink">{b.school_name}</p>
                          <p className="mt-0.5 text-[13px] text-ink/60">
                            chez {b.organization?.name || 'site non renseigné'}
                            {b.organization?.city ? ` · ${b.organization.city}` : ''}
                          </p>
                          {!onMap && (
                            <p className="mt-1 text-[12px] font-medium text-red-700">
                              Hors carte : ajoutez une position au site
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <p className="mr-2 text-[14px] font-bold text-forest">{b.headcount} pers.</p>
                          <button type="button" title="Modifier" className={iconBtn} onClick={() => openEdit(b)}>
                            <IconEdit />
                          </button>
                          <button
                            type="button"
                            title="Supprimer"
                            className={iconBtnDanger}
                            onClick={() => void onDelete(b.id)}
                          >
                            <IconTrash />
                          </button>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-black/10 pt-3 text-[13px]">
                        {b.teacher_name && (
                          <span className="text-ink/70">{b.teacher_name}</span>
                        )}
                        {b.teacher_phone && (
                          <a href={`tel:${b.teacher_phone}`} className="font-semibold text-forest underline underline-offset-2">
                            {b.teacher_phone}
                          </a>
                        )}
                        {b.teacher_email && (
                          <a href={`mailto:${b.teacher_email}`} className="text-ink/55 underline underline-offset-2">
                            {b.teacher_email}
                          </a>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </section>
      )}

      {view === 'map' && (
        <section className="orga-panel">
          <div className="mb-4">
            <h2 className="text-[15px] font-semibold text-forest">Carte des visites</h2>
            <p className="mt-1 text-[13px] text-ink/50">
              Sites qui accueillent déjà des établissements.
            </p>
          </div>

          {mapError && <p className="mb-4 text-[14px] text-red-700">{mapError}</p>}

          {!mapError && mapPoints.length === 0 && (
            <p className="text-[13px] text-ink/50">Aucune visite arrangée pour le moment.</p>
          )}

          {mapPoints.length > 0 && (
            <div className="grid gap-4 lg:h-[680px] lg:grid-cols-[284px_minmax(0,1fr)] lg:items-stretch lg:overflow-hidden">
              <div className="mx-auto h-[624px] w-[260px] overflow-hidden border border-black lg:h-full lg:w-full">
                <SitesMap
                  points={mapPoints}
                  selectedId={mapSelected}
                  onSelect={setMapSelected}
                  tall
                />
              </div>

              <aside className="min-h-0 min-w-0 overflow-y-auto border border-black bg-white p-4">
                {!activeMapPoint && (
                  <p className="text-[13px] text-ink/50">Sélectionnez un site sur la carte.</p>
                )}
                {activeMapPoint && (
                  <>
                    <p className="text-[12px] font-semibold uppercase tracking-wide text-ink/45">
                      Site
                    </p>
                    <h3 className="mt-1 text-[18px] font-semibold text-forest">{activeMapPoint.name}</h3>
                    <p className="mt-1 text-[13px] text-ink/55">
                      {[activeMapPoint.city, activeMapPoint.region, activeMapPoint.sector]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>

                    <div className="mt-4 grid grid-cols-2 gap-3 border-y border-black/10 py-3">
                      <div>
                        <p className="text-[22px] font-semibold text-forest">
                          {activeMapPoint.visits?.groups ?? 0}
                        </p>
                        <p className="text-[12px] text-ink/50">groupes</p>
                      </div>
                      <div>
                        <p className="text-[22px] font-semibold text-forest">
                          {activeMapPoint.visits?.headcount ?? 0}
                        </p>
                        <p className="text-[12px] text-ink/50">visiteurs</p>
                      </div>
                    </div>

                    <h4 className="mt-4 text-[13px] font-semibold text-forest">Qui vient</h4>
                    <ul className="mt-2 space-y-2">
                      {(activeMapPoint.visits?.items || []).map((v, i) => (
                        <li
                          key={`${v.school_name}-${v.visit_day}-${v.visit_start}-${i}`}
                          className="border border-black/10 px-3 py-2"
                        >
                          <p className="font-semibold text-forest">{v.school_name}</p>
                          <p className="mt-0.5 text-[13px] text-ink/60">
                            {v.visit_day} · {v.visit_start}-{v.visit_end}
                          </p>
                          <p className="mt-0.5 text-[13px] text-ink/50">
                            <span className="font-semibold text-forest">{v.headcount}</span> élèves
                          </p>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </aside>
            </div>
          )}
        </section>
      )}
    </OrgaShell>
  )
}
