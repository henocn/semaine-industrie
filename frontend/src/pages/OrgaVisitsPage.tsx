import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getStoredUser } from '../api/auth'
import { listBookings, type VisitBooking } from '../api/bookings'
import { OrgaShell } from '../components/layout/OrgaShell'

/* Liste orga des réservations de visites. */
export default function OrgaVisitsPage() {
  const navigate = useNavigate()
  const user = getStoredUser()
  const [items, setItems] = useState<VisitBooking[]>([])
  const [query, setQuery] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user || user.role !== 'orga') {
      navigate('/login')
      return
    }
    /* Charge les réservations. */
    listBookings()
      .then(setItems)
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Erreur')
        navigate('/login')
      })
  }, [navigate, user])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter((b) =>
      [b.school_name, b.teacher_name, b.organization?.name, b.visit_day]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    )
  }, [items, query])

  return (
    <OrgaShell
      title="Visites"
      searchPlaceholder="Rechercher une classe…"
      onSearch={setQuery}
      actions={
        <Link
          to="/visites"
          className="rounded-xl bg-forest px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-ink"
        >
          Formulaire +
        </Link>
      }
    >
      {error && <p className="mb-4 text-[14px] text-red-700">{error}</p>}

      <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
        <h2 className="mb-4 text-[15px] font-semibold text-forest">
          {filtered.length} réservation{filtered.length > 1 ? 's' : ''}
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-[13px]">
            <thead>
              <tr className="border-b border-black/5 text-ink/40">
                <th className="pb-3 font-medium">École</th>
                <th className="pb-3 font-medium">Site</th>
                <th className="pb-3 font-medium">Créneau</th>
                <th className="pb-3 font-medium">Effectif</th>
                <th className="pb-3 font-medium">Enseignant</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="py-10 text-ink/40">Aucune réservation</td></tr>
              )}
              {filtered.map((b) => (
                <tr key={b.id} className="border-b border-black/[0.04] last:border-0">
                  <td className="py-3.5 font-medium text-forest">{b.school_name}</td>
                  <td className="py-3.5 text-ink/60">{b.organization?.name || '—'}</td>
                  <td className="py-3.5 text-ink/60">{b.visit_day} {b.visit_start}–{b.visit_end}</td>
                  <td className="py-3.5 font-semibold text-forest">{b.headcount}</td>
                  <td className="py-3.5 text-ink/55">
                    <p>{b.teacher_name}</p>
                    <p className="mt-0.5">{b.teacher_email}</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </OrgaShell>
  )
}
