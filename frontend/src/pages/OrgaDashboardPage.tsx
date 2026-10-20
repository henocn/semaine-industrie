import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getDashboardStats, type DashboardStats } from '../api/dashboard'
import { getSurveyStats, type SurveyStats } from '../api/surveys'
import { OrgaShell } from '../components/layout/OrgaShell'

type Card = {
  label: string
  value: number | string
  hint: string
  to: string
}

/* Tableau de bord orga : indicateurs utiles de la semaine. */
export default function OrgaDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [survey, setSurvey] = useState<SurveyStats | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    /* Charge stats dashboard + enquête. */
    async function load() {
      try {
        setError(null)
        const [dash, enquete] = await Promise.all([getDashboardStats(), getSurveyStats()])
        setStats(dash)
        setSurvey(enquete)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Impossible de charger le tableau')
      }
    }
    void load()
  }, [])

  const ind = stats?.indicators
  const industries = stats?.by_type.find((t) => t.name === 'entreprise')?.count ?? 0
  const schools = stats?.by_type.find((t) => t.name === 'ecole')?.count ?? 0

  const cards: Card[] = ind
    ? [
        {
          label: 'Labels validés',
          value: ind.labels_approved,
          hint: `${industries} industries · ${schools} écoles`,
          to: '/orga/labels',
        },
        {
          label: 'Demandes en attente',
          value: ind.labels_pending ?? 0,
          hint: `${ind.requests_total ?? 0} demandes au total`,
          to: '/orga/labels',
        },
        {
          label: 'Sites sur la carte',
          value: ind.sites_on_map,
          hint: 'Avec position GPS',
          to: '/orga/labels',
        },
        {
          label: 'Visites planifiées',
          value: ind.visits_booked,
          hint: `${ind.young_visitors} jeunes prévus`,
          to: '/orga/visites',
        },
        {
          label: 'RDV rencontres',
          value: ind.business_meetings,
          hint: 'Rencontres d\'affaires',
          to: '/orga/affaires',
        },
        {
          label: 'Réponses enquête',
          value: survey?.total ?? 0,
          hint: survey
            ? `Avant ${survey.counts.before} · après ${survey.counts.after}`
            : 'Questionnaire public',
          to: '/orga/enquete',
        },
      ]
    : []

  return (
    <OrgaShell
      title="Dashboard"
      actions={
        <Link to="/orga/labels" className="orga-btn">
          Traiter les demandes
        </Link>
      }
    >
      {error && <p className="mb-4 text-[14px] text-red-700">{error}</p>}

      {ind && (
        <div className="space-y-6">
          <section>
            <h2 className="text-[15px] font-semibold text-forest">Semaine en un coup d&apos;œil</h2>
            <p className="mt-1 text-[13px] text-ink/50">
              Labels, visites, rencontres d&apos;affaires et enquête · mis à jour{' '}
              {stats?.updated_at
                ? new Date(stats.updated_at).toLocaleString('fr-FR', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : '—'}
            </p>
          </section>

          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {cards.map((card) => (
              <Link
                key={card.label}
                to={card.to}
                className="border border-black bg-white p-5 transition-colors hover:bg-forest/[0.03]"
              >
                <p className="text-[13px] font-medium text-ink/55">{card.label}</p>
                <p className="mt-2 text-[32px] font-semibold tracking-tight text-forest">{card.value}</p>
                <p className="mt-2 text-[12px] text-ink/45">{card.hint}</p>
              </Link>
            ))}
          </section>

          <section className="orga-panel">
            <h2 className="text-[15px] font-semibold text-forest">Accès rapides</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {[
                { to: '/orga/labels', label: 'Labels et demandes' },
                { to: '/orga/visites', label: 'Planning visites' },
                { to: '/orga/enquete', label: 'Sondage' },
                { to: '/orga/affaires', label: 'Rencontres d\'affaires' },
                { to: '/orga/audit', label: 'Audit et logs' },
                { to: '/orga/utilisateurs', label: 'Utilisateurs' },
              ].map((item) => (
                <Link key={item.to} to={item.to} className="orga-btn-ghost px-3 py-2 text-[13px]">
                  {item.label}
                </Link>
              ))}
            </div>
          </section>
        </div>
      )}

      {!ind && !error && (
        <p className="text-[14px] text-ink/45">Chargement des indicateurs…</p>
      )}
    </OrgaShell>
  )
}
