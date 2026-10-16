import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getStoredUser } from '../api/auth'
import { getDashboardStats, type DashboardStats } from '../api/dashboard'
import { OrgaShell } from '../components/layout/OrgaShell'

/* Tableau de bord orga — layout backoffice type DataStack. */
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
        <Link
          to="/orga/labels"
          className="rounded-xl bg-forest px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-ink"
        >
          Demandes +
        </Link>
      }
    >
      {error && <p className="mb-4 text-[14px] text-red-700">{error}</p>}

      {ind && (
        <div className="space-y-6">
          <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-[15px] font-semibold text-forest">Pipeline labels</h2>
                <p className="mt-1 text-[13px] text-ink/45">Répartition des demandes reçues</p>
              </div>
              <p className="text-[13px] text-ink/55">
                <span className="font-semibold text-forest">{approved}</span> validés sur {ind.requests_total} demandes
              </p>
            </div>
            <div className="mt-5 flex h-3 overflow-hidden rounded-full bg-[#eef0f2]">
              <div className="bg-leaf" style={{ width: `${approvedPct}%` }} />
              <div className="bg-sun" style={{ width: `${pendingPct}%` }} />
              <div className="bg-ink/20" style={{ width: `${rejectedPct}%` }} />
            </div>
            <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-[13px] text-ink/60">
              <li className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-leaf" />Validés {approved}</li>
              <li className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-sun" />En attente {pending}</li>
              <li className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-ink/20" />Refusés {rejected}</li>
            </ul>
          </section>

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: 'Labels validés', value: approved, to: '/orga/qr', tint: 'bg-[#eef7e8]', accent: 'text-leaf' },
              { label: 'En attente', value: pending, to: '/orga/labels', tint: 'bg-[#fff8e6]', accent: 'text-[#b8860b]' },
              { label: 'Sur la carte', value: ind.sites_on_map, to: '/carte', tint: 'bg-[#e8f1ee]', accent: 'text-forest' },
              { label: 'Demandes', value: ind.requests_total ?? 0, to: '/orga/labels', tint: 'bg-[#f3f4f6]', accent: 'text-ink/70' },
            ].map((card) => (
              <Link
                key={card.label}
                to={card.to}
                className={`rounded-2xl ${card.tint} p-5 shadow-sm transition-transform hover:-translate-y-0.5`}
              >
                <p className={`text-[28px] font-semibold tracking-tight ${card.accent}`}>{card.value}</p>
                <p className="mt-2 text-[13px] font-medium text-ink/60">{card.label}</p>
              </Link>
            ))}
          </section>

          <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-[15px] font-semibold text-forest">Derniers labels</h2>
              <Link to="/orga/labels" className="text-[13px] font-medium text-forest hover:underline">Tout voir</Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-[13px]">
                <thead>
                  <tr className="border-b border-black/5 text-ink/40">
                    <th className="pb-3 font-medium">Nom</th>
                    <th className="pb-3 font-medium">Type</th>
                    <th className="pb-3 font-medium">Lieu</th>
                    <th className="pb-3 font-medium">Code</th>
                    <th className="pb-3 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recent_labels.length === 0 && (
                    <tr><td colSpan={5} className="py-8 text-ink/40">Aucun label validé</td></tr>
                  )}
                  {stats.recent_labels.map((o) => (
                    <tr key={o.slug} className="border-b border-black/[0.04] last:border-0">
                      <td className="py-3.5 font-medium text-forest">{o.name}</td>
                      <td className="py-3.5">
                        <span className="rounded-full bg-[#eef7e8] px-2.5 py-1 text-[12px] font-medium text-leaf">
                          {o.type === 'ecole' ? 'École' : 'Entreprise'}
                        </span>
                      </td>
                      <td className="py-3.5 text-ink/55">{[o.city, o.region].filter(Boolean).join(' · ') || '—'}</td>
                      <td className="py-3.5 text-ink/55">{o.label_code || '—'}</td>
                      <td className="py-3.5">
                        <Link to={`/o/${o.slug}`} className="font-medium text-forest hover:underline">Fiche</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <h2 className="text-[15px] font-semibold text-forest">Par région</h2>
              <ul className="mt-4 space-y-2">
                {stats.by_region.length === 0 && <li className="text-[13px] text-ink/40">Aucune donnée</li>}
                {stats.by_region.map((r) => (
                  <li key={r.name} className="flex items-center justify-between rounded-xl bg-[#f7f8f9] px-3 py-2.5 text-[13px]">
                    <span className="text-ink/70">{r.name}</span>
                    <span className="font-semibold text-forest">{r.count}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <h2 className="text-[15px] font-semibold text-forest">Par secteur</h2>
              <ul className="mt-4 space-y-2">
                {stats.by_sector.length === 0 && <li className="text-[13px] text-ink/40">Aucune donnée</li>}
                {stats.by_sector.map((r) => (
                  <li key={r.name} className="flex items-center justify-between rounded-xl bg-[#f7f8f9] px-3 py-2.5 text-[13px]">
                    <span className="text-ink/70">{r.name}</span>
                    <span className="font-semibold text-forest">{r.count}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </div>
      )}
    </OrgaShell>
  )
}
