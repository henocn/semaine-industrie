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
  }, [navigate, user?.id, user?.role])

  const ind = stats?.indicators

  return (
    <OrgaShell title="Bilan">
      {error && <p className="mb-4 text-[14px] text-red-700">{error}</p>}

      {ind && (
        <>
          <div className="grid gap-0 sm:grid-cols-2 xl:grid-cols-3">
            {[
              ['Labellisées', ind.labels_approved],
              ['Sur la carte', ind.sites_on_map],
              ['Visites réservées', ind.visits_booked],
              ['Jeunes accueillis', ind.young_visitors],
              ['RDV affaires', ind.business_meetings],
              ['Scans passeport', ind.passport_scans ?? 0],
            ].map(([label, value], i) => (
              <div key={String(label)} className={`border border-black p-5 ${i > 0 ? 'sm:-ml-px' : ''}`}>
                <p className="text-[13px] text-ink/50">{label}</p>
                <p className="mt-2 text-[32px] font-semibold tracking-tight text-forest">{value}</p>
              </div>
            ))}
          </div>

          <section className="orga-panel mt-0 !p-0 overflow-x-auto xl:-mt-px">
            <div className="border-b border-black px-4 py-3">
              <h2 className="text-[15px] font-semibold text-forest">Annuaire Made in Togo</h2>
            </div>
            <table className="orga-table">
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Type</th>
                  <th>Lieu</th>
                  <th>Fiche</th>
                </tr>
              </thead>
              <tbody>
                {stats.recent_labels.map((o) => (
                  <tr key={o.slug}>
                    <td className="font-semibold text-forest">{o.name}</td>
                    <td>{o.type === 'ecole' ? 'École' : 'Entreprise'}</td>
                    <td>{[o.city, o.region].filter(Boolean).join(' · ')}</td>
                    <td>
                      <Link to={`/o/${o.slug}`} className="font-medium text-forest underline underline-offset-2">
                        Ouvrir
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}
    </OrgaShell>
  )
}
