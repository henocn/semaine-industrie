import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import { getVisitSlotPlanning, setVisitSlot, type VisitSlotPerson, type VisitSlotPlanning } from '../../api/visitSlots'
import { Lock } from 'lucide-react'
import { IconCheck, IconTrash, IconX } from '../ui/IconButton'
import { useOrgaRealtime } from '../../lib/useOrgaRealtime'
import { useConfirm } from '../../lib/useConfirm'
import { exportToExcel, excelDate, type ExcelColumn } from '../../lib/excel'

type Row = VisitSlotPerson & { slotId: string; slotLabel: string }

/* Colonnes de l'export Excel des départs. */
const EXPORT_COLUMNS: ExcelColumn<Row>[] = [
  { header: 'Départ', width: 44, value: (r) => r.slotLabel },
  { header: 'Nom', width: 28, value: (r) => r.name },
  { header: 'Code', width: 10, value: (r) => r.code },
  { header: 'Téléphone', width: 18, value: (r) => r.phone },
  { header: 'E-mail', width: 28, value: (r) => r.email },
  { header: 'Réservé le', width: 18, value: (r) => excelDate(r.booked_at) },
  { header: 'Statut', width: 16, value: (r) => (r.waiting ? 'Liste d’attente' : 'Place') },
  { header: 'Scans', width: 50, value: (r) => r.scans.map((s) => `${s.again ? 'Repris' : 'Scanné'} le ${scanTime(s.at)} à ${s.point}`).join(' ; ') },
]

const iconBtn =
  'grid h-9 w-9 place-items-center border border-black bg-white text-forest hover:bg-forest hover:text-white disabled:opacity-40'

const iconBtnDanger =
  'grid h-9 w-9 place-items-center border border-black bg-white text-red-700 hover:bg-red-700 hover:text-white disabled:opacity-40'

/* Date et heure courtes à Lomé. */
function when(iso: string | null) {
  if (!iso) return ''
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Africa/Lome',
  }).format(new Date(iso))
}

/* « 19/11 à 12h41 » à Lomé. */
function scanTime(iso: string) {
  const d = new Date(iso)
  const day = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', timeZone: 'Africa/Lome' }).format(d)
  const [h, m] = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Lome' })
    .format(d)
    .split(':')
  return `${day} à ${h}h${m}`
}

/* Onglet Particuliers du planning : les 8 départs se remplissent avec les réservations du site. */
export function VisitSlotsPanel({ query }: { query: string }) {
  const [data, setData] = useState<VisitSlotPlanning | null>(null)
  const [active, setActive] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  /* Départ choisi dans la liste mais pas encore enregistré, par particulier. */
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  /* Particulier dont on affiche les scans sous la ligne. */
  const [opened, setOpened] = useState<string | null>(null)
  const { confirm, modal } = useConfirm()

  const load = useCallback(async () => {
    try {
      setData(await getVisitSlotPlanning())
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Planning indisponible')
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useOrgaRealtime(['visit-slot:changed', 'participation:changed'], () => void load())

  const label = useCallback(
    (id: string) => {
      const s = data?.slots.find((slot) => slot.id === id)
      return s ? `${s.day}, ${s.period.toLowerCase()}, ${s.place}` : id
    },
    [data],
  )

  /* Inscrits du départ choisi (ou de tous), filtrés par la recherche. */
  const rows = useMemo<Row[]>(() => {
    if (!data) return []
    const q = query.trim().toLowerCase()
    return data.slots
      .filter((s) => !active || s.id === active)
      .flatMap((s) => s.people.map((p) => ({ ...p, slotId: s.id, slotLabel: label(s.id) })))
      .filter((r) => !q || [r.name, r.code, r.phone, r.email].some((v) => v?.toLowerCase().includes(q)))
  }, [data, active, query, label])

  const total = data?.slots.reduce((n, s) => n + s.people.length, 0) ?? 0

  /* Déplace ou libère la place d'un particulier. */
  async function change(row: Row, slot: string | null) {
    if (slot === null) {
      const ok = await confirm({
        title: 'Libérer cette place ?',
        message: `${row.name} pourra choisir un autre départ sur le site.`,
        confirmLabel: 'Libérer',
        danger: true,
      })
      if (!ok) return
    }
    setBusy(true)
    try {
      await setVisitSlot(row.id, slot)
      setDrafts(({ [row.id]: _done, ...rest }) => rest)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Modification impossible')
    } finally {
      setBusy(false)
    }
  }

  if (!data) {
    return error ? <p className="text-[14px] text-red-700">{error}</p> : <p className="text-[14px] text-ink/50">Chargement…</p>
  }

  const days = [...new Set(data.slots.map((s) => s.day))]

  /* Garde le choix en attente de validation (rien n'est enregistré avant le bouton ✓). */
  function pick(row: Row, slot: string) {
    setDrafts(({ [row.id]: _old, ...rest }) => (slot === row.slotId ? rest : { ...rest, [row.id]: slot }))
  }

  return (
    <>
      {modal}
      {error && <p className="mb-4 text-[14px] text-red-700">{error}</p>}

      <p className="mb-4 text-[14px] text-ink/70">
        {total} place{total > 1 ? 's' : ''} réservée{total > 1 ? 's' : ''} sur {data.slots.reduce((n, s) => n + (s.capacity ?? data.capacity), 0)}
        {' · '}
        {data.waiting} particulier{data.waiting > 1 ? 's' : ''} validé{data.waiting > 1 ? 's' : ''} sans départ
        {/* {' · '}
        Réservations {data.open ? 'ouvertes' : 'fermées'} sur{' '}
        <a href="/visites/" target="_blank" rel="noopener noreferrer" className="font-semibold text-forest underline underline-offset-2">
          /visites
        </a> */}
      </p>

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        {days.map((day) => (
          <section key={day} className="orga-panel">
            <h2 className="text-[15px] font-semibold text-forest">{day}</h2>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {data.slots.filter((s) => s.day === day).map((s) => {
                const n = s.people.length
                const selected = active === s.id
                const cap = s.capacity ?? data.capacity
                const full = n >= cap
                const extra = Math.max(n - cap, 0)
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setActive(selected ? '' : s.id)}
                    className={`border px-3 py-3 text-left transition-colors ${
                      selected ? 'border-forest bg-forest text-white' : 'border-black bg-white hover:bg-forest/5'
                    }`}
                  >
                    <p className={`text-[12px] font-semibold uppercase tracking-wide ${selected ? 'text-white/70' : 'text-ink/45'}`}>
                      {s.period}
                    </p>
                    <p className={`mt-0.5 text-[14px] font-semibold ${selected ? 'text-white' : 'text-forest'}`}>{s.place}</p>
                    <p className={`mt-2 text-[20px] font-bold leading-none ${selected ? 'text-sun' : full ? 'text-red-700' : 'text-forest'}`}>
                      {Math.min(n, cap)}
                      <span className={`text-[13px] font-medium ${selected ? 'text-white/70' : 'text-ink/50'}`}> / {cap}</span>
                    </p>
                    {extra > 0 && (
                      <p className={`mt-1 text-[12px] font-semibold ${selected ? 'text-sun' : 'text-amber-700'}`}>
                        + {extra} en attente
                      </p>
                    )}
                    {full && (
                      <p className={`mt-1.5 inline-flex items-center gap-1 text-[12px] font-semibold uppercase tracking-wide ${selected ? 'text-sun' : 'text-red-700'}`}>
                        <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                        Plein
                      </p>
                    )}
                  </button>
                )
              })}
            </div>
          </section>
        ))}
      </div>

      <section className="orga-panel !p-0 overflow-x-auto">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black px-4 py-3">
          <h2 className="text-[15px] font-semibold text-forest">
            {active ? label(active) : 'Tous les départs'} · {rows.length} inscrit{rows.length > 1 ? 's' : ''}
          </h2>
          <div className="flex gap-2">
            {active && (
              <button type="button" className="orga-btn-ghost" onClick={() => setActive('')}>
                Tous les départs
              </button>
            )}
            <button
              type="button"
              className="orga-btn"
              disabled={rows.length === 0}
              onClick={() =>
                void exportToExcel({ filename: 'departs-particuliers', sheet: 'Départs', columns: EXPORT_COLUMNS, rows })
              }
            >
              Exporter
            </button>
          </div>
        </div>
        <table className="orga-table min-w-[820px]">
          <thead>
            <tr>
              <th>#</th>
              <th>Nom</th>
              <th>Code</th>
              <th>Contact</th>
              <th>Départ</th>
              <th>Réservé le</th>
              <th className="w-24">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={7}>Aucune réservation</td></tr>
            )}
            {rows.map((r, i) => (
              <Fragment key={r.id}>
              <tr className={opened === r.id ? 'bg-forest/5' : undefined}>
                <td className="font-semibold text-forest">{i + 1}</td>
                <td>
                  <button
                    type="button"
                    onClick={() => setOpened(opened === r.id ? null : r.id)}
                    aria-expanded={opened === r.id}
                    className="text-left font-medium text-forest underline-offset-2 hover:underline"
                    title="Voir les scans"
                  >
                    {r.name}
                  </button>
                  {r.waiting && <span className="ml-2 text-[12px] font-semibold text-amber-700">en attente</span>}
                  {r.scans.length > 0 && (
                    <span className="ml-2 text-[12px] font-semibold text-energy">
                      scanné{r.scans.length > 1 ? ` ×${r.scans.length}` : ''}
                    </span>
                  )}
                </td>
                <td className="font-mono">{r.code}</td>
                <td>
                  {r.phone && (
                    <a href={`tel:${r.phone}`} className="block font-semibold text-forest underline underline-offset-2">{r.phone}</a>
                  )}
                  {/* E-mail non affiché dans le tableau (reste dans l'export Excel). */}
                  {/* {r.email && (
                    <a href={`mailto:${r.email}`} className="mt-0.5 block text-ink/55 underline underline-offset-2">{r.email}</a>
                  )} */}
                </td>
                <td>
                  <select
                    value={drafts[r.id] ?? r.slotId}
                    disabled={busy}
                    onChange={(e) => pick(r, e.target.value)}
                    className={`orga-input !py-1.5 text-[13px] ${drafts[r.id] ? '!border-sun !bg-sun/15' : ''}`}
                    aria-label={`Départ de ${r.name}`}
                  >
                    {data.slots.map((s) => (
                      <option key={s.id} value={s.id}>
                        {label(s.id)}{s.id !== r.slotId && s.people.length >= (s.capacity ?? data.capacity) ? ' (plein, attente)' : ''}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="text-ink/60">{when(r.booked_at)}</td>
                <td>
                  {drafts[r.id] ? (
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        title="Enregistrer le nouveau départ"
                        aria-label="Enregistrer le nouveau départ"
                        className={iconBtn}
                        disabled={busy}
                        onClick={() => void change(r, drafts[r.id])}
                      >
                        <IconCheck />
                      </button>
                      <button
                        type="button"
                        title="Annuler le changement"
                        aria-label="Annuler le changement"
                        className={iconBtnDanger}
                        disabled={busy}
                        onClick={() => pick(r, r.slotId)}
                      >
                        <IconX />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      title="Libérer la place"
                      aria-label="Libérer la place"
                      className={iconBtnDanger}
                      disabled={busy}
                      onClick={() => void change(r, null)}
                    >
                      <IconTrash />
                    </button>
                  )}
                </td>
              </tr>
              {opened === r.id && (
                <tr className="bg-forest/5">
                  <td />
                  <td colSpan={6} className="!pt-0">
                    {r.scans.length === 0 ? (
                      <p className="text-[13px] text-ink/55">Pas encore scanné au départ.</p>
                    ) : (
                      <ul className="space-y-1 text-[13px] text-ink/80">
                        {r.scans.map((s, k) => (
                          <li key={k}>
                            {s.again ? 'Repris' : 'Scanné'} le {scanTime(s.at)} à <span className="font-semibold text-forest">{s.point}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </td>
                </tr>
              )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </section>
    </>
  )
}
