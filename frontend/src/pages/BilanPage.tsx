import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getDashboardStats, type DashboardStats } from '../api/dashboard'
import { getStoredUser } from '../api/session'
import { OrgaShell } from '../components/layout/OrgaShell'

/* Bilan réservé à l'organisation (pas d'accès public). */
export default function BilanPage() {
  const navigate = useNavigate()
  const user = getStoredUser()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user || user.role !== 'orga') {
      navigate('/login', { replace: true })
      return
    }

    /* Charge le bilan orga authentifié. */
    async function load() {
      try {
        setStats(await getDashboardStats())
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Bilan indisponible')
      }
    }
    load()
  }, [navigate, user])

  const ind = stats?.indicators

  return (
    <OrgaShell title="Bilan">
      {error && <p className="mb-4 text-[14px] text-red-700">{error}</p>}

      {ind && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {[
              ['Labellisées', ind.labels_approved],
              ['Sur la carte', ind.sites_on_map],
              ['Visites réservées', ind.visits_booked],
              ['Jeunes accueillis', ind.young_visitors],
              ['RDV affaires', ind.business_meetings],
              ['Scans passeport', ind.passport_scans ?? 0],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-2xl bg-white p-5 shadow-sm">
                <p className="text-[13px] text-ink/50">{label}</p>
                <p className="mt-2 text-[32px] font-semibold tracking-tight text-forest">{value}</p>
              </div>
            ))}
          </div>

          <section className="mt-4 rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="text-[15px] font-semibold text-forest">Annuaire Made in Togo</h2>
            <ul className="mt-4 divide-y divide-black/5">
              {stats.recent_labels.map((o) => (
                <li key={o.slug} className="flex flex-wrap items-baseline justify-between gap-3 py-3">
                  <div>
                    <p className="text-[14px] font-semibold text-forest">{o.name}</p>
                    <p className="mt-0.5 text-[13px] text-ink/50">
                      {[o.type === 'ecole' ? 'École' : 'Entreprise', o.city, o.region].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <Link to={`/o/${o.slug}`} className="text-[13px] font-medium text-forest underline underline-offset-4">
                    Fiche
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </OrgaShell>
  )
}
