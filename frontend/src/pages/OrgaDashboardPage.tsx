import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getStoredUser } from '../api/auth'
import { getDashboardStats, type DashboardStats } from '../api/dashboard'
import { OrgaShell } from '../components/layout/OrgaShell'

/* Tableau de bord orga. */
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
      } catch {
        setError('Impossible de charger le tableau')
        navigate('/login')
      }
    }
    load()
  }, [navigate, user])

  const ind = stats?.indicators
  const total = Math.max(ind?.requests_total ?? 0, 1)
  const approved = ind?.labels_approved ?? 0
  const pending = ind?.labels_pending ?? 0
  const rejected = ind?.labels_rejected ?? 0
  const approvedPct = Math.round((approved / total) * 100)
  const pendingPct = Math.round((pending / total) * 100)
  const rejectedPct = Math.max(0, 100 - approvedPct - pendingPct)

  return (
    <OrgaShell
      title="Dashboard"
      actions={
        <Link to="/orga/labels" className="orga-btn">
          Demandes +
        </Link>
      }
    >
      {error && <p className="mb-4 text-[14px] text-red-700">{error}</p>}

      {ind && (
        <div className="space-y-6">
          <section className="orga-panel">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-[15px] font-semibold text-forest">Pipeline labels</h2>
                <p className="mt-1 text-[13px] text-ink/50">Répartition des demandes reçues</p>
              </div>
              <p className="text-[13px] text-ink/60">
                <span className="font-semibold text-forest">{approved}</span> validés sur {ind.requests_total} demandes
              </p>
            </div>
            <div className="mt-5 flex h-2 overflow-hidden border border-black bg-white">
              <div className="bg-leaf" style={{ width: `${approvedPct}%` }} />
              <div className="bg-sun" style={{ width: `${pendingPct}%` }} />
              <div className="bg-ink/25" style={{ width: `${rejectedPct}%` }} />
            </div>
            <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-[13px] text-ink/65">
              <li>Validés {approved}</li>
              <li>En attente {pending}</li>
              <li>Refusés {rejected}</li>
            </ul>
          </section>

          <section className="grid gap-0 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: 'Labels validés', value: approved, to: '/orga/qr' },
              { label: 'En attente', value: pending, to: '/orga/labels' },
              { label: 'Sur la carte', value: ind.sites_on_map, to: '/carte' },
              { label: 'Demandes', value: ind.requests_total ?? 0, to: '/orga/labels' },
            ].map((card, i) => (
              <Link
                key={card.label}
                to={card.to}
                className={`border border-black p-5 hover:bg-black/[0.02] ${i > 0 ? 'sm:-ml-px' : ''} ${i >= 2 ? 'xl:-ml-px' : ''}`}
              >
                <p className="text-[28px] font-semibold tracking-tight text-forest">{card.value}</p>
                <p className="mt-2 text-[13px] font-medium text-ink/60">{card.label}</p>
              </Link>
            ))}
          </section>

          <section className="orga-panel !p-0 overflow-x-auto">
            <div className="flex items-center justify-between gap-3 border-b border-black px-4 py-3">
              <h2 className="text-[15px] font-semibold text-forest">Derniers labels</h2>
              <Link to="/orga/labels" className="text-[13px] font-medium text-forest underline underline-offset-2">Tout voir</Link>
            </div>
            <table className="orga-table min-w-[640px] border-0">
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Type</th>
                  <th>Lieu</th>
                  <th>Code</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {stats.recent_labels.length === 0 && (
                  <tr><td colSpan={5}>Aucun label validé</td></tr>
                )}
                {stats.recent_labels.map((o) => (
                  <tr key={o.slug}>
                    <td className="font-medium text-forest">{o.name}</td>
                    <td>{o.type === 'ecole' ? 'École' : 'Entreprise'}</td>
                    <td>{[o.city, o.region].filter(Boolean).join(' · ') || '—'}</td>
                    <td>{o.label_code || '—'}</td>
                    <td>
                      <Link to={`/o/${o.slug}`} className="font-medium text-forest underline underline-offset-2">Fiche</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="grid gap-0 lg:grid-cols-2">
            <div className="orga-panel lg:border-r-0">
              <h2 className="text-[15px] font-semibold text-forest">Par région</h2>
              <table className="orga-table mt-4">
                <thead>
                  <tr>
                    <th>Région</th>
                    <th>Nombre</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.by_region.length === 0 && (
                    <tr><td colSpan={2}>Aucune donnée</td></tr>
                  )}
                  {stats.by_region.map((r) => (
                    <tr key={r.name}>
                      <td>{r.name}</td>
                      <td className="font-semibold text-forest">{r.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="orga-panel">
              <h2 className="text-[15px] font-semibold text-forest">Par secteur</h2>
              <table className="orga-table mt-4">
                <thead>
                  <tr>
                    <th>Secteur</th>
                    <th>Nombre</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.by_sector.length === 0 && (
                    <tr><td colSpan={2}>Aucune donnée</td></tr>
                  )}
                  {stats.by_sector.map((r) => (
                    <tr key={r.name}>
                      <td>{r.name}</td>
                      <td className="font-semibold text-forest">{r.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </OrgaShell>
  )
}
