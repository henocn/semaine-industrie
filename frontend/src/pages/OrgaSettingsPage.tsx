import { useEffect, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { OrgaShell } from '../components/layout/OrgaShell'
import { IconButton, IconTrash } from '../components/ui/IconButton'
import {
  addDeparturePoint,
  getDepartureSettings,
  removeDeparturePoint,
  setSchoolDeparture,
  type DepartureSettings,
} from '../api/scan'
import { ResourcesPanel } from './OrgaResourcesPage'
import { getVisitSlots, setVisitSlotCapacity, setVisitSlotsOpen, type VisitSlotAvailability } from '../api/visitSlots'
import { getPublicForms, setParticulierOpen } from '../api/participations'

const TABS = [
  { key: 'depart', label: 'Points de départ' },
  { key: 'creneaux', label: 'Visites' },
  { key: 'ressources', label: 'Ressources' },
] as const
type TabKey = (typeof TABS)[number]['key']

/* Points de départ des visites : écoles cochées et points libres. */
function DeparturePanel() {
  const [data, setData] = useState<DepartureSettings | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  useEffect(() => {
    getDepartureSettings()
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : 'Chargement impossible'))
  }, [])

  /* Lance une modification et affiche le nouvel état. */
  async function run(key: string, action: () => Promise<DepartureSettings>) {
    setBusy(key)
    setError(null)
    try {
      setData(await action())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Modification impossible')
    } finally {
      setBusy(null)
    }
  }

  /* Ajoute un point libre. */
  function onAdd(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const input = e.currentTarget.elements.namedItem('name') as HTMLInputElement
    const name = input.value.trim()
    if (!name) return
    input.value = ''
    void run('add', () => addDeparturePoint(name))
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {error && <p className="text-[14px] text-red-700 lg:col-span-2">{error}</p>}

      <section className="orga-panel">
        <h2 className="text-[15px] font-semibold text-forest">Écoles points de départ</h2>
        <p className="mt-1 text-[13px] text-ink/55">Cochez les écoles d’où partent les particuliers pour les visites.</p>
        {!data ? (
          <p className="mt-4 text-[13px] text-ink/50">Chargement…</p>
        ) : data.schools.length === 0 ? (
          <p className="mt-4 text-[13px] text-ink/50">Aucune école labellisée.</p>
        ) : (
          <ul className="mt-4 max-h-[520px] divide-y divide-black/10 overflow-y-auto border border-black">
            {data.schools.map((s) => (
              <li key={s.id}>
                <label className="flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-forest/5">
                  <input
                    type="checkbox"
                    checked={Boolean(s.point_id)}
                    disabled={busy === s.id}
                    onChange={(e) => void run(s.id, () => setSchoolDeparture(s.id, e.target.checked))}
                    className="h-4 w-4 shrink-0 accent-forest"
                  />
                  <span className="min-w-0 flex-1 text-[14px] text-forest">{s.name}</span>
                  {s.city && <span className="shrink-0 text-[12px] text-ink/45">{s.city}</span>}
                </label>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="orga-panel self-start">
        <h2 className="text-[15px] font-semibold text-forest">Autres points de départ</h2>
        <p className="mt-1 text-[13px] text-ink/55">Un lieu qui n’est pas une école (rond-point, marché, siège…).</p>
        <form onSubmit={onAdd} className="mt-4 flex gap-2">
          <input name="name" placeholder="Nom du point de départ" maxLength={200} className="orga-input flex-1" />
          <button type="submit" disabled={busy === 'add'} className="orga-btn disabled:opacity-50">
            Ajouter
          </button>
        </form>
        {data && data.custom.length > 0 && (
          <ul className="mt-4 divide-y divide-black/10 border border-black">
            {data.custom.map((p) => (
              <li key={p.id} className="flex items-center gap-3 px-3 py-2">
                <span className="min-w-0 flex-1 text-[14px] text-forest">{p.name}</span>
                <IconButton
                  label="Retirer"
                  variant="danger"
                  disabled={busy === p.id}
                  onClick={() => {
                    if (window.confirm(`Retirer le point de départ « ${p.name} » ?`)) void run(p.id, () => removeDeparturePoint(p.id))
                  }}
                >
                  <IconTrash />
                </IconButton>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

/* Inscriptions des particuliers aux visites : une case, ouvertes ou fermées (page publique /inscription-particulier). */
function ParticulierOpenPanel() {
  const [open, setOpen] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    getPublicForms()
      .then((data) => setOpen(data.particulier_open))
      .catch((err) => setError(err instanceof Error ? err.message : 'Chargement impossible'))
  }, [])

  async function onToggle(next: boolean) {
    const question = next
      ? 'Ouvrir les inscriptions des particuliers aux visites ? Le formulaire redevient accessible sur le site.'
      : 'Fermer les inscriptions des particuliers aux visites ? Le site affichera « Inscriptions clôturées ».'
    if (!window.confirm(question)) return
    setBusy(true)
    setError(null)
    try {
      setOpen((await setParticulierOpen(next)).particulier_open)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Modification impossible')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="orga-panel mb-6 max-w-2xl">
      <h2 className="text-[15px] font-semibold text-forest">Inscriptions des particuliers</h2>
      <p className="mt-1 text-[13px] text-ink/55">Formulaire public /inscription-particulier et menu Participer du bot WhatsApp.</p>
      {error && <p className="mt-3 text-[14px] text-red-700">{error}</p>}
      {open === null ? (
        !error && <p className="mt-4 text-[13px] text-ink/50">Chargement…</p>
      ) : (
        <label className="mt-4 flex cursor-pointer items-center gap-3 border border-black px-3 py-2.5 hover:bg-forest/5">
          <input
            type="checkbox"
            checked={open}
            disabled={busy}
            onChange={(e) => void onToggle(e.target.checked)}
            className="h-4 w-4 shrink-0 accent-forest"
          />
          <span className="min-w-0 flex-1 text-[14px] text-forest">Inscriptions aux visites ouvertes</span>
          <span className={`text-[13px] font-semibold ${open ? 'text-energy' : 'text-red-700'}`}>{open ? 'Ouvertes' : 'Fermées'}</span>
        </label>
      )}
    </section>
  )
}

/* Choix des créneaux par les particuliers, départ par départ (page publique /visites). */
function SlotsOpenPanel() {
  const [slots, setSlots] = useState<VisitSlotAvailability[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  useEffect(() => {
    getVisitSlots()
      .then((data) => setSlots(data.slots))
      .catch((err) => setError(err instanceof Error ? err.message : 'Chargement impossible'))
  }, [])

  /* Ouvre ou ferme un départ après confirmation. */
  async function onToggle(s: VisitSlotAvailability, next: boolean) {
    const label = `${s.day.toLowerCase()}, ${s.period.toLowerCase()}, ${s.place}`
    const question = next ? `Rouvrir le départ du ${label} ?` : `Fermer le départ du ${label} ? Il sera grisé sur la page publique.`
    if (!window.confirm(question)) return
    setBusy(s.id)
    setError(null)
    try {
      const result = await setVisitSlotsOpen(s.id, next)
      /* Garde les places restantes affichées ; seul l'état ouvert / fermé change. */
      setSlots((current) => current?.map((c) => ({ ...c, open: result.slots.find((r) => r.id === c.id)?.open ?? c.open })) ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Modification impossible')
    } finally {
      setBusy(null)
    }
  }

  /* Nombre de places saisi mais pas encore enregistré, par départ. */
  const [caps, setCaps] = useState<Record<string, string>>({})

  /* Enregistre le nombre de places d'un départ après confirmation. */
  async function saveCapacity(s: VisitSlotAvailability) {
    const raw = caps[s.id]
    if (raw === undefined) return
    const n = Number(raw)
    if (!Number.isInteger(n) || n < 1 || n === s.capacity) {
      setCaps(({ [s.id]: _done, ...rest }) => rest)
      return
    }
    const label = `${s.day.toLowerCase()}, ${s.period.toLowerCase()}, ${s.place}`
    if (!window.confirm(`Passer le départ du ${label} de ${s.capacity} à ${n} places ?`)) return
    setBusy(s.id)
    setError(null)
    try {
      const result = await setVisitSlotCapacity(s.id, n)
      setSlots(result.slots)
      setCaps(({ [s.id]: _done, ...rest }) => rest)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Modification impossible')
    } finally {
      setBusy(null)
    }
  }

  const days = slots ? [...new Set(slots.map((s) => s.day))] : []

  return (
    <section className="orga-panel max-w-2xl">
      <h2 className="text-[15px] font-semibold text-forest">Choix des créneaux de visite</h2>
      <p className="mt-1 text-[13px] text-ink/55">
        Cochez les départs que les particuliers acceptés peuvent encore choisir (page publique /visites). Un départ plein reste
        choisissable en liste d’attente ; décochez-le pour confirmer qu’il est complet. Un départ décoché reste visible mais grisé ;
        si tous sont décochés, la page affiche « Le choix des créneaux est clos ».
      </p>
      {error && <p className="mt-3 text-[14px] text-red-700">{error}</p>}
      {!slots ? (
        !error && <p className="mt-4 text-[13px] text-ink/50">Chargement…</p>
      ) : (
        days.map((day) => (
          <div key={day} className="mt-5">
            <h3 className="text-[13px] font-semibold text-forest">{day}</h3>
            <ul className="mt-2 divide-y divide-black/10 border border-black">
              {slots.filter((s) => s.day === day).map((s) => (
                <li key={s.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2.5 hover:bg-forest/5">
                  <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
                    <input
                      type="checkbox"
                      checked={s.open !== false}
                      disabled={busy === s.id}
                      onChange={(e) => void onToggle(s, e.target.checked)}
                      className="h-4 w-4 shrink-0 accent-forest"
                    />
                    <span className="min-w-0 flex-1 text-[14px] text-forest">
                      {s.period} · {s.place}
                    </span>
                  </label>
                  {/* Nombre de places : enregistré en quittant le champ ou avec Entrée. */}
                  <label className="flex items-center gap-1.5 text-[12px] text-ink/55">
                    <input
                      type="number"
                      min={1}
                      max={1000}
                      inputMode="numeric"
                      value={caps[s.id] ?? String(s.capacity)}
                      disabled={busy === s.id}
                      onChange={(e) => setCaps((c) => ({ ...c, [s.id]: e.target.value }))}
                      onBlur={() => void saveCapacity(s)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') e.currentTarget.blur()
                      }}
                      className={`w-16 border px-2 py-1 text-right text-[13px] text-forest ${caps[s.id] !== undefined ? 'border-sun bg-sun/15' : 'border-black'}`}
                      aria-label={`Places du départ ${s.period} · ${s.place}`}
                    />
                    places
                  </label>
                  <span className="hidden text-[12px] text-ink/45 sm:inline">
                      {s.remaining > 0
                        ? `${s.remaining} place${s.remaining > 1 ? 's' : ''} libre${s.remaining > 1 ? 's' : ''}`
                        : `Plein${s.waiting ? ` · ${s.waiting} en attente` : ''}`}
                    </span>
                    <span className={`w-14 text-right text-[13px] font-semibold ${s.open !== false ? 'text-energy' : 'text-red-700'}`}>
                      {s.open !== false ? 'Ouvert' : 'Fermé'}
                    </span>
                </li>
              ))}
            </ul>
          </div>
        ))
      )}
    </section>
  )
}

/* Paramètres du back-office : points de départ des visites, choix des créneaux et ressources. */
export default function OrgaSettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const asked = searchParams.get('onglet')
  const tab: TabKey = asked === 'ressources' || asked === 'creneaux' ? asked : 'depart'

  return (
    <OrgaShell title="Paramètres">
      <div className="mb-6 flex flex-wrap gap-0 border border-black">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setSearchParams(key === 'depart' ? {} : { onglet: key }, { replace: true })}
            className={`px-4 py-2 text-[14px] font-medium transition-colors ${tab === key ? 'bg-forest text-white' : 'bg-white text-forest hover:bg-forest/10'}`}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === 'depart' ? <DeparturePanel /> : tab === 'creneaux' ? (
        <>
          <ParticulierOpenPanel />
          <SlotsOpenPanel />
        </>
      ) : <ResourcesPanel />}
    </OrgaShell>
  )
}
