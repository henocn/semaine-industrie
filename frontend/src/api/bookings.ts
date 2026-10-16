import { apiFetch } from './client'

export type BookableSite = {
  id: string
  name: string
  slug: string
  city: string | null
  region: string | null
  sector: string | null
  max_visitors: number | null
  visit_slots: { day: string; start: string; end: string }[]
  type: string
}

export type VisitBooking = {
  id: string
  school_name: string
  teacher_name: string
  teacher_email: string
  visit_day: string
  visit_start: string
  visit_end: string
  headcount: number
  status: string
  organization?: { id: string; name: string; slug: string; city: string | null }
}

/* Sites ouverts à la réservation. */
export function listBookableSites() {
  return apiFetch<BookableSite[]>('/bookings/sites')
}

/* Crée une réservation de visite. */
export function createBooking(payload: {
  organization_id: string
  school_name: string
  teacher_name: string
  teacher_email: string
  teacher_phone?: string
  visit_day: string
  visit_start: string
  visit_end: string
  headcount: number
  notes?: string
}) {
  return apiFetch<VisitBooking>('/bookings', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

/* Liste orga des réservations. */
export function listBookings(status?: string) {
  const q = status ? `?status=${encodeURIComponent(status)}` : ''
  return apiFetch<VisitBooking[]>(`/bookings${q}`)
}
