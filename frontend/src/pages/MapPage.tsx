import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { listMapPoints, type MapPoint } from '../api/labels'
import { SitesMap } from '../components/map/SitesMap'
import { WRAP } from '../components/layout/Mark'

/* Page carte des sites industriels + détails des visites arrangées. */
export default function MapPage() {
  const [points, setPoints] = useState<MapPoint[]>([])
  const [region, setRegion] = useState('')
  const [sector, setSector] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)

  useEffect(() => {
    /* Charge les sites entreprises avec leurs visites. */
    async function load() {
      try {
        setError(null)
        const data = await listMapPoints({
          type: 'entreprise',
          region: region || undefined,
          sector: sector || undefined,
        })
        setPoints(data)
        setSelected((prev) => (prev && data.some((p) => p.id === prev) ? prev : data[0]?.id || null))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Carte indisponible')
      }
    }
    load()
  }, [region, sector])

  const regions = useMemo(
    () => [...new Set(points.map((p) => p.region).filter(Boolean))] as string[],
    [points],
  )
  const sectors = useMemo(
    () => [...new Set(points.map((p) => p.sector).filter(Boolean))] as string[],
    [points],
  )
  const active = useMemo(() => points.find((p) => p.id === selected) || null, [points, selected])
  const visits = active?.visits

  return (
    <main className="py-12 sm:py-16">
        <div className={WRAP}>
          <h1 className="display text-4xl sm:text-5xl">Carte des sites & visites</h1>
          <p className="mt-4 max-w-2xl text-lg text-ink/65">
            Sites industriels labellisés. Cliquez un point pour voir qui vient visiter, les effectifs et les créneaux.
          </p>

          <div className="mt-8 flex flex-wrap gap-6">
            <label className="text-[15px] font-medium text-forest">
              Région
              <select
                className="ml-3 border-0 border-b border-forest/25 bg-transparent py-2 focus:outline-none"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
              >
                <option value="">Toutes</option>
                {regions.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </label>
            <label className="text-[15px] font-medium text-forest">
              Secteur
              <select
                className="ml-3 border-0 border-b border-forest/25 bg-transparent py-2 focus:outline-none"
                value={sector}
                onChange={(e) => setSector(e.target.value)}
              >
                <option value="">Tous</option>
                {sectors.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </label>
          </div>

          {error && <p className="mt-6 text-red-700">{error}</p>}

          <div className="mt-10 grid gap-10 lg:grid-cols-[1.35fr_1fr]">
            <SitesMap
              points={points}
              selectedId={selected}
              onSelect={setSelected}
            />

            <div className="min-w-0">
              {!active && (
                <p className="text-ink/50">Sélectionnez un site sur la carte ou dans la liste.</p>
              )}

              {active && (
                <article className="border border-forest/15 p-5">
                  <p className="text-[13px] font-semibold uppercase tracking-wide text-leaf">
                    {active.label_code ? `Label ${active.label_code}` : 'Site labellisé'}
                  </p>
                  <h2 className="display mt-2 text-3xl text-forest">{active.name}</h2>
                  <p className="mt-2 text-[15px] text-ink/60">
                    {[active.city, active.region, active.sector].filter(Boolean).join(' · ')}
                  </p>
                  {active.max_visitors != null && (
                    <p className="mt-3 text-[14px] text-ink/55">
                      Capacité max. : <span className="font-semibold text-forest">{active.max_visitors}</span> / créneau
                    </p>
                  )}
                  {active.description && (
                    <p className="mt-4 text-[15px] leading-relaxed text-ink/75">{active.description}</p>
                  )}

                  <div className="mt-6 grid grid-cols-2 gap-3 border-y border-forest/15 py-4">
                    <div>
                      <p className="text-[28px] font-semibold tracking-tight text-forest">{visits?.groups ?? 0}</p>
                      <p className="text-[13px] text-ink/55">groupe{(visits?.groups ?? 0) > 1 ? 's' : ''} prévu{(visits?.groups ?? 0) > 1 ? 's' : ''}</p>
                    </div>
                    <div>
                      <p className="text-[28px] font-semibold tracking-tight text-forest">{visits?.headcount ?? 0}</p>
                      <p className="text-[13px] text-ink/55">visiteurs au total</p>
                    </div>
                  </div>

                  <h3 className="mt-6 text-[15px] font-semibold text-forest">Établissements visiteurs</h3>
                  {(visits?.items.length ?? 0) === 0 ? (
                    <p className="mt-3 text-[14px] text-ink/45">Aucune visite arrangée pour ce site.</p>
                  ) : (
                    <ul className="mt-3 space-y-3">
                      {visits!.items.map((v, i) => (
                        <li key={`${v.school_name}-${v.visit_day}-${v.visit_start}-${i}`} className="border border-forest/10 p-3">
                          <p className="font-semibold text-forest">{v.school_name}</p>
                          <p className="mt-1 text-[14px] text-ink/65">
                            {v.visit_day} · {v.visit_start}–{v.visit_end}
                          </p>
                          <p className="mt-1 text-[14px] text-ink/55">
                            <span className="font-semibold text-forest">{v.headcount}</span> élèves / étudiants
                          </p>
                          <p className="mt-2 text-[13px] text-ink/50">
                            {v.contact_name}
                            {v.contact_phone ? ` · ${v.contact_phone}` : ''}
                          </p>
                          <a
                            href={`mailto:${v.contact_email}`}
                            className="mt-1 inline-block text-[13px] text-forest underline underline-offset-2"
                          >
                            {v.contact_email}
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}

                  <Link
                    to={`/o/${active.slug}`}
                    className="mt-6 inline-block text-[15px] font-medium text-forest underline decoration-forest/30 underline-offset-4"
                  >
                    Voir la fiche complète
                  </Link>
                </article>
              )}

              <ul className="mt-8 border-t border-forest/15">
                {points.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => setSelected(p.id)}
                      className={`w-full border-b border-forest/15 py-3.5 text-left transition-colors ${selected === p.id ? 'bg-sage/50' : 'hover:bg-sage/30'}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-forest">{p.name}</p>
                          <p className="mt-1 text-[14px] text-ink/55">
                            {[p.city, p.region].filter(Boolean).join(' · ')}
                          </p>
                        </div>
                        <p className="shrink-0 text-[13px] font-semibold text-forest">
                          {p.visits?.groups ?? 0} visite{(p.visits?.groups ?? 0) > 1 ? 's' : ''}
                        </p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </main>
  )
}
