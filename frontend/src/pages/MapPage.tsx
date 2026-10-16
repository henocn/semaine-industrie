import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { listMapPoints, type MapPoint } from '../api/labels'
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

  /* Bornes pour un positionnement relatif simple (sans lib carte). */
  const bounds = useMemo(() => {
    if (points.length === 0) return null
    const lats = points.map((p) => Number(p.lat))
    const lngs = points.map((p) => Number(p.lng))
    return {
      minLat: Math.min(...lats),
      maxLat: Math.max(...lats),
      minLng: Math.min(...lngs),
      maxLng: Math.max(...lngs),
    }
  }, [points])

  /* Convertit lat/lng en pourcentage dans le cadre. */
  function toPos(lat: number, lng: number) {
    if (!bounds) return { left: '50%', top: '50%' }
    const pad = 0.02
    const latSpan = Math.max(bounds.maxLat - bounds.minLat, pad)
    const lngSpan = Math.max(bounds.maxLng - bounds.minLng, pad)
    const x = ((lng - bounds.minLng) / lngSpan) * 80 + 10
    const y = (1 - (lat - bounds.minLat) / latSpan) * 80 + 10
    return { left: `${x}%`, top: `${y}%` }
  }

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
            <div className="relative aspect-[4/3] overflow-hidden bg-sage/60 sm:aspect-[16/10]">
              <div className="absolute inset-0 opacity-40" style={{
                backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(27,67,50,0.25) 1px, transparent 0)',
                backgroundSize: '24px 24px',
              }} />
              {points.map((p) => {
                const pos = toPos(Number(p.lat), Number(p.lng))
                const active = selected === p.id
                return (
                  <button
                    key={p.id}
                    type="button"
                    title={p.name}
                    onClick={() => setSelected(p.id)}
                    className={`absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white transition-transform ${active ? 'scale-150 bg-sun' : 'bg-forest hover:scale-125'}`}
                    style={{ left: pos.left, top: pos.top }}
                  />
                )
              })}
              {points.length === 0 && !error && (
                <p className="absolute inset-0 grid place-items-center text-ink/50">Aucun site labellisé pour l’instant</p>
              )}
            </div>

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
