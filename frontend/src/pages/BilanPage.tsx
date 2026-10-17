import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getPublicBilan, type DashboardStats } from '../api/dashboard'
import { WRAP } from '../components/layout/Mark'

/* Page bilan publique (chiffres de la semaine). */
export default function BilanPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    /* Charge le bilan public. */
    async function load() {
      try {
        setStats(await getPublicBilan())
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Bilan indisponible')
      }
    }
    load()
  }, [])

  const ind = stats?.indicators

  return (
    <main className="py-16 sm:py-24">
        <div className={WRAP}>
          <h1 className="display text-4xl sm:text-5xl">Bilan de la semaine</h1>
          <p className="mt-4 max-w-2xl text-lg text-ink/65">
            Chiffres publiés au fil des validations. Les indicateurs de visites et de rendez-vous seront complétés pendant l’événement.
          </p>
          {error && <p className="mt-6 text-red-700">{error}</p>}

          {ind && (
            <>
              <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  ['Entreprises & écoles labellisées', ind.labels_approved],
                  ['Sites sur la carte', ind.sites_on_map],
                  ['Visites réservées', ind.visits_booked],
                  ['Jeunes accueillis', ind.young_visitors],
                  ['Rencontres d’affaires', ind.business_meetings],
                ].map(([label, value]) => (
                  <div key={String(label)} className="border-t border-forest/20 pt-5">
                    <p className="display text-5xl text-forest">{value}</p>
                    <p className="mt-3 text-lg text-ink/70">{label}</p>
                  </div>
                ))}
              </div>

              <div className="mt-20">
                <h2 className="display text-3xl">Annuaire Made in Togo</h2>
                <p className="mt-3 text-ink/60">Structures labellisées, consultables aussi via QR.</p>
                <ul className="mt-8 border-t border-forest/15">
                  {stats.recent_labels.map((o) => (
                    <li key={o.slug} className="flex flex-wrap items-baseline justify-between gap-3 border-b border-forest/10 py-5">
                      <div>
                        <p className="text-xl font-semibold text-forest">{o.name}</p>
                        <p className="mt-1 text-[15px] text-ink/55">
                          {[o.type === 'ecole' ? 'École' : 'Entreprise', o.city, o.region].filter(Boolean).join(' · ')}
                        </p>
                      </div>
                      <Link to={`/o/${o.slug}`} className="text-[15px] font-medium text-forest underline underline-offset-4">
                        Voir la fiche
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </div>
      </main>
  )
}
