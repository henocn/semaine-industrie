import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getStoredUser } from '../api/auth'
import { getDashboardStats, type DashboardStats } from '../api/dashboard'
import { OrgaNav } from '../components/layout/OrgaNav'
import { WRAP } from '../components/layout/Mark'

/* Tableau de bord orga avec indicateurs temps réel. */
export default function OrgaDashboardPage() {
  const navigate = useNavigate()
  const user = getStoredUser()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user || user.role !== 'orga') {
      navigate('/login')
      return
    }
    /* Charge les agrégats. */
    async function load() {
      try {
        setStats(await getDashboardStats())
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur')
        navigate('/login')
      }
    }
    load()
  }, [navigate, user])

  const ind = stats?.indicators

  return (
    <>
      <OrgaNav email={user?.email} />
      <main className="py-12 sm:py-16">
        <div className={WRAP}>
          <h1 className="display text-4xl">Tableau de bord</h1>
          <p className="mt-3 text-ink/65">
            Chiffres alimentés par les labels validés. Visites et RDV arriveront avec les modules suivants.
          </p>
          {error && <p className="mt-6 text-red-700">{error}</p>}

          {ind && (
            <>
              <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  ['Labels validés', ind.labels_approved],
                  ['En attente', ind.labels_pending ?? 0],
                  ['Sur la carte', ind.sites_on_map],
                  ['Demandes totales', ind.requests_total ?? 0],
                ].map(([label, value]) => (
                  <div key={String(label)} className="border-t border-forest/20 pt-4">
                    <p className="display text-4xl text-forest">{value}</p>
                    <p className="mt-2 text-[15px] text-ink/60">{label}</p>
                  </div>
                ))}
              </div>

              <div className="mt-14 grid gap-12 lg:grid-cols-2">
                <div>
                  <h2 className="text-lg font-semibold text-forest">Par région</h2>
                  <ul className="mt-4 border-t border-forest/15">
                    {stats.by_region.length === 0 && <li className="py-4 text-ink/50">Aucun</li>}
                    {stats.by_region.map((r) => (
                      <li key={r.name} className="flex justify-between border-b border-forest/10 py-3 text-[15px]">
                        <span>{r.name}</span>
                        <span className="font-semibold text-forest">{r.count}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-forest">Par secteur</h2>
                  <ul className="mt-4 border-t border-forest/15">
                    {stats.by_sector.length === 0 && <li className="py-4 text-ink/50">Aucun</li>}
                    {stats.by_sector.map((r) => (
                      <li key={r.name} className="flex justify-between border-b border-forest/10 py-3 text-[15px]">
                        <span>{r.name}</span>
                        <span className="font-semibold text-forest">{r.count}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="mt-14">
                <div className="flex items-end justify-between gap-4">
                  <h2 className="text-lg font-semibold text-forest">Derniers labels</h2>
                  <Link to="/orga/labels" className="text-[15px] text-forest underline underline-offset-4">Gérer les demandes</Link>
                </div>
                <ul className="mt-4 border-t border-forest/15">
                  {stats.recent_labels.map((o) => (
                    <li key={o.slug} className="flex flex-wrap items-baseline justify-between gap-2 border-b border-forest/10 py-4">
                      <div>
                        <p className="font-semibold text-forest">{o.name}</p>
                        <p className="text-[15px] text-ink/55">{[o.city, o.region].filter(Boolean).join(' · ')}</p>
                      </div>
                      <Link to={`/o/${o.slug}`} className="text-[15px] text-forest underline underline-offset-4">
                        {o.label_code || o.slug}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </div>
      </main>
    </>
  )
}
