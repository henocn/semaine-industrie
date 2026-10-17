import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { listMapPoints, type MapPoint } from '../api/labels'
import { SitesMap } from '../components/map/SitesMap'
import { WRAP } from '../components/layout/Mark'

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
    <main className="py-10 sm:py-14">
      <div className={WRAP}>
        <h1 className="display text-4xl sm:text-5xl">Carte des visites</h1>
        <p className="mt-3 max-w-xl text-lg text-ink/65">
          Uniquement les sites qui accueillent déjà des établissements. Cliquez un point pour le détail.
        </p>

        {error && <p className="mt-6 text-red-700">{error}</p>}

        {!error && points.length === 0 && (
          <p className="mt-10 text-ink/50">Aucune visite arrangée pour le moment.</p>
        )}

        {points.length > 0 && (
          <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.75fr)_minmax(280px,1fr)] lg:items-stretch">
            <div className="min-h-[420px] sm:min-h-[520px] lg:min-h-[640px]">
              <SitesMap
                points={points}
                selectedId={selected}
                onSelect={setSelected}
                tall
              />
            </div>

            <aside className="min-w-0 border border-forest/15 p-5 lg:overflow-y-auto lg:max-h-[640px]">
              {!active && (
                <p className="text-ink/50">Sélectionnez un site sur la carte.</p>
              )}

              {active && (
                <>
                  <p className="text-[13px] font-semibold uppercase tracking-wide text-leaf">
                    {active.label_code ? `Label ${active.label_code}` : 'Site labellisé'}
                  </p>
                  <h2 className="display mt-2 text-3xl text-forest">{active.name}</h2>
                  <p className="mt-2 text-[15px] text-ink/60">
                    {[active.city, active.region, active.sector].filter(Boolean).join(' · ')}
                  </p>
                  {active.max_visitors != null && (
                    <p className="mt-3 text-[14px] text-ink/55">
                      Capacité max. :{' '}
                      <span className="font-semibold text-forest">{active.max_visitors}</span> / créneau
                    </p>
                  )}
                  {active.description && (
                    <p className="mt-4 text-[15px] leading-relaxed text-ink/75">{active.description}</p>
                  )}

                  <div className="mt-6 grid grid-cols-2 gap-3 border-y border-forest/15 py-4">
                    <div>
                      <p className="text-[28px] font-semibold tracking-tight text-forest">
                        {visits?.groups ?? 0}
                      </p>
                      <p className="text-[13px] text-ink/55">
                        groupe{(visits?.groups ?? 0) > 1 ? 's' : ''}
                      </p>
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

                  <Link
                    to={`/o/${active.slug}`}
                    className="mt-6 inline-block text-[15px] font-medium text-forest underline decoration-forest/30 underline-offset-4"
                  >
                    Voir la fiche complète
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
