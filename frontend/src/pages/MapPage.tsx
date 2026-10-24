import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { listMapPoints, type MapPoint } from '../api/labels'
import { Seo } from '../components/Seo'
import { publicSeo } from '../lib/seo'
import { SitesMap } from '../components/map/SitesMap'
import { WRAP } from '../components/layout/Mark'
import { SectionHeader } from '../components/ui/SectionHeader'
import { Button } from '../components/ui/Button'

/* Carte des sites qui ont des visites arrangées + panneau détail. */
export default function MapPage() {
  const [points, setPoints] = useState<MapPoint[]>([])
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)

  useEffect(() => {
    /* Charge les sites entreprises, ne garde que ceux avec visites. */
    async function load() {
      try {
        setError(null)
        const data = await listMapPoints({ type: 'entreprise' })
        const withVisits = data.filter((p) => (p.visits?.groups ?? 0) > 0)
        setPoints(withVisits)
        setSelected((prev) =>
          prev && withVisits.some((p) => p.id === prev) ? prev : withVisits[0]?.id || null,
        )
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Carte indisponible')
      }
    }
    load()
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
            eyebrow="Sur le terrain"
            title="Carte des visites"
            lead="Sites industriels qui accueillent déjà des établissements pendant la semaine."
          />
          <Button to="/industrie" variant="link">Voir toutes les industries</Button>
        </div>

        {error && <p className="mt-6 text-red-700">{error}</p>}

        {!error && points.length === 0 && (
          <p className="mt-10 text-ink/50">Aucune visite arrangée pour le moment.</p>
        )}

        {points.length > 0 && (
          <div className="mt-8 grid gap-5 lg:h-[min(72vh,740px)] lg:grid-cols-[minmax(0,1.8fr)_minmax(260px,0.95fr)] lg:items-stretch lg:overflow-hidden">
            <div className="min-h-[360px] min-w-0 overflow-hidden sm:min-h-[440px] lg:min-h-0 lg:h-full">
              <SitesMap
                points={points}
                selectedId={selected}
                onSelect={setSelected}
                tall
              />
            </div>

            <aside className="min-h-0 min-w-0 overflow-y-auto border border-forest/15 p-5">
              {!active && <p className="text-ink/50">Sélectionnez un site sur la carte.</p>}

              {active && (
                <>
                  <p className="text-[13px] font-semibold uppercase tracking-wide text-leaf">
                    Site labellisé
                  </p>
                  <h2 className="display mt-2 text-3xl text-forest">{active.name}</h2>
                  <p className="mt-2 text-[15px] text-ink/60">
                    {[active.city, active.region, active.sector].filter(Boolean).join(' · ')}
                  </p>

                  <div className="mt-6 grid grid-cols-2 gap-3 border-y border-forest/15 py-4">
                    <div>
                      <p className="text-[28px] font-semibold tracking-tight text-forest">
                        {visits?.groups ?? 0}
                      </p>
                      <p className="text-[13px] text-ink/55">groupes</p>
                    </div>
                    <div>
                      <p className="text-[28px] font-semibold tracking-tight text-forest">
                        {visits?.headcount ?? 0}
                      </p>
                      <p className="text-[13px] text-ink/55">visiteurs</p>
                    </div>
                  </div>

                  <h3 className="mt-6 text-[15px] font-semibold text-forest">Qui vient</h3>
                  <ul className="mt-3 space-y-3">
                    {visits!.items.map((v, i) => (
                      <li
                        key={`${v.school_name}-${v.visit_day}-${v.visit_start}-${i}`}
                        className="border border-forest/10 p-3"
                      >
                        <p className="font-semibold text-forest">{v.school_name}</p>
                        <p className="mt-1 text-[14px] text-ink/65">
                          {v.visit_day} · {v.visit_start}–{v.visit_end}
                        </p>
                        <p className="mt-1 text-[14px] text-ink/55">
                          <span className="font-semibold text-forest">{v.headcount}</span> élèves /
                          étudiants
                        </p>
                      </li>
                    ))}
                  </ul>

                  <Link
                    to={`/o/${active.slug}`}
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
