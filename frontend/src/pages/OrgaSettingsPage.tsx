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

const TABS = [
  { key: 'depart', label: 'Points de départ' },
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

/* Paramètres du back-office : points de départ des visites et ressources. */
export default function OrgaSettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tab: TabKey = searchParams.get('onglet') === 'ressources' ? 'ressources' : 'depart'

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
      {tab === 'depart' ? <DeparturePanel /> : <ResourcesPanel />}
    </OrgaShell>
  )
}
