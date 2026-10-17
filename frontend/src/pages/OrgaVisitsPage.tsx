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
  }, [navigate, user?.id, user?.role])

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
        <Link to="/visites" className="orga-btn">
          Formulaire +
        </Link>
      }
    >
      {error && <p className="mb-4 text-[14px] text-red-700">{error}</p>}

      <section className="orga-panel !p-0 overflow-x-auto">
        <div className="border-b border-black px-4 py-3">
          <h2 className="text-[15px] font-semibold text-forest">
            {filtered.length} réservation{filtered.length > 1 ? 's' : ''}
          </h2>
        </div>
        <table className="orga-table min-w-[720px]">
          <thead>
            <tr>
              <th>École</th>
              <th>Site</th>
              <th>Créneau</th>
              <th>Effectif</th>
              <th>Enseignant</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={5}>Aucune réservation</td></tr>
            )}
            {filtered.map((b) => (
              <tr key={b.id}>
                <td className="font-medium text-forest">{b.school_name}</td>
                <td>{b.organization?.name || '—'}</td>
                <td>{b.visit_day} {b.visit_start}–{b.visit_end}</td>
                <td className="font-semibold text-forest">{b.headcount}</td>
                <td>
                  <p>{b.teacher_name}</p>
                  <p className="mt-0.5 text-ink/55">{b.teacher_email}</p>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </OrgaShell>
  )
}
