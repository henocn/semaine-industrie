import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { listMapPoints, type MapPoint } from '../api/labels'
import { SitesMap } from '../components/map/SitesMap'
import { Mark, WRAP } from '../components/layout/Mark'

/* Page carte des usines / écoles labellisées. */
export default function MapPage() {
  const [points, setPoints] = useState<MapPoint[]>([])
  const [region, setRegion] = useState('')
  const [sector, setSector] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)

  useEffect(() => {
    /* Charge les points depuis l'API. */
    async function load() {
      try {
        setError(null)
        const data = await listMapPoints({
          region: region || undefined,
          sector: sector || undefined,
        })
        setPoints(data)
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

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-forest/10 bg-white/95 backdrop-blur">
        <div className={`${WRAP} flex h-16 items-center justify-between`}>
          <Link to="/" className="flex items-center gap-2.5 text-forest">
            <Mark className="h-6 w-auto text-leaf" />
            <span className="text-[15px] font-semibold">Semaine de l’industrie 2026</span>
          </Link>
          <Link to="/label" className="text-[15px] text-ink/70 hover:text-forest">Demander le label</Link>
        </div>
      </header>

      <main className="py-12 sm:py-16">
        <div className={WRAP}>
          <h1 className="display text-4xl sm:text-5xl">Carte des sites ouverts</h1>
          <p className="mt-4 max-w-2xl text-lg text-ink/65">
            Les points apparaissent quand un label est validé. Filtrez par région ou secteur.
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

          <div className="mt-10 grid gap-10 lg:grid-cols-[1.4fr_1fr]">
            <SitesMap
              points={points}
              selectedId={selected}
              onSelect={setSelected}
            />

            <ul className="border-t border-forest/15">
              {points.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(p.id)}
                    className={`w-full border-b border-forest/15 py-4 text-left transition-colors ${selected === p.id ? 'bg-sage/50' : 'hover:bg-sage/30'}`}
                  >
                    <p className="font-semibold text-forest">{p.name}</p>
                    <p className="mt-1 text-[15px] text-ink/60">
                      {[p.city, p.region, p.sector].filter(Boolean).join(' · ')}
                    </p>
                    <Link
                      to={`/o/${p.slug}`}
                      className="mt-2 inline-block text-[15px] text-forest underline decoration-forest/30 underline-offset-4"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Voir la fiche
                    </Link>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </main>
    </>
  )
}
