import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { listMapPoints, type MapPoint } from '../api/labels'
import { Seo } from '../components/Seo'
import { publicSeo } from '../lib/seo'
import { SitesMap } from '../components/map/SitesMap'
import { WRAP } from '../components/layout/Mark'
import { SectionHeader } from '../components/ui/SectionHeader'
import { Button } from '../components/ui/Button'

/* Carte des industries labellisées (avec ou sans visite arrangée), cadrée sur le sud du Togo, + panneau détail. */
export default function MapPage() {
  const [points, setPoints] = useState<MapPoint[]>([])
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  /* Tant que la liste n'est pas arrivée (et au pré-rendu), pas de message « aucun site ». */
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    listMapPoints({ type: 'entreprise' })
      .then((data) => setPoints(data))
      .catch((err) => setError(err instanceof Error ? err.message : 'Carte indisponible'))
      .finally(() => setLoaded(true))
  }, [])

  const active = useMemo(() => points.find((p) => p.id === selected) || null, [points, selected])
  const visits = active?.visits

  return (
    <main className="overflow-x-hidden py-10 sm:py-14">
      <Seo {...publicSeo('/carte')} />
      <div className={WRAP}>
        <div className="animate-rise flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <SectionHeader
            level={1}
            title="Carte des usines ouvertes"
            lead="Les sites industriels du Togo qui accueillent écoles, universités et particuliers du lundi 16 au vendredi 20 novembre 2026, sur inscription et par petits groupes."
          />
          <Button to="/industrie/" variant="link">Voir toutes les industries</Button>
        </div>

        {error && <p className="mt-6 text-red-700">{error}</p>}

        {loaded && !error && points.length === 0 && (
          <p className="mt-10 text-ink/50">Aucun site sur la carte pour le moment.</p>
        )}

        {points.length > 0 && (
          <div className="mt-8 grid gap-5 lg:h-[560px] lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="h-[380px] overflow-hidden border border-forest/15 sm:h-[480px] lg:h-full">
              <SitesMap points={points} selectedId={selected} onSelect={setSelected} tall focusPoints />
            </div>

            <aside className="min-h-0 min-w-0 overflow-y-auto border border-forest/15 p-5">
              {!active && <p className="text-ink/50">Cliquez sur un point de la carte pour voir l’industrie.</p>}

              {active && (
                <>
                  <h2 className="display text-3xl text-forest">{active.name}</h2>
                  {active.description && (
                    <p className="mt-3 text-[15px] leading-relaxed text-ink/75">{active.description}</p>
                  )}

                  {(visits?.groups ?? 0) > 0 && (
                    <>
                      <div className="mt-6 grid grid-cols-2 gap-3 border-y border-forest/15 py-4">
                        <div>
                          <p className="text-[28px] font-semibold tracking-tight text-forest">{visits!.groups}</p>
                          <p className="text-[13px] text-ink/55">groupes</p>
                        </div>
                        <div>
                          <p className="text-[28px] font-semibold tracking-tight text-forest">{visits!.headcount}</p>
                          <p className="text-[13px] text-ink/55">visiteurs</p>
                        </div>
                      </div>

                      <h3 className="mt-6 text-[15px] font-semibold text-forest">Qui vient</h3>
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
                          </li>
                        ))}
                      </ul>
                    </>
                  )}

                  <Link
                    to={`/industrie/?o=${encodeURIComponent(active.slug)}`}
                    className="mt-6 inline-block text-[15px] font-medium text-forest underline decoration-forest/30 underline-offset-4"
                  >
                    Voir la fiche
                  </Link>
                </>
              )}
            </aside>
          </div>
        )}
      </div>
    </main>
  )
}
