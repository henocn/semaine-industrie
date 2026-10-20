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
  contact_name?: string | null
  contact_email?: string | null
  contact_phone?: string | null
}

export type VisitBooking = {
  id: string
  school_name: string
  teacher_name: string
  teacher_email: string
  teacher_phone?: string | null
  visit_day: string
  visit_start: string
  visit_end: string
  headcount: number
  status: string
  organization?: {
    id: string
    name: string
    slug: string
    city: string | null
    lat?: string | number | null
    lng?: string | number | null
  }
  school?: {
    id: string
    name: string
    slug: string
    city: string | null
    contact_email: string | null
    contact_phone: string | null
    max_visitors: number | null
  }
}

/* Sites industriels ou établissements (orga). */
export function listBookableSites(type?: 'entreprise' | 'ecole') {
  const q = type ? `?type=${encodeURIComponent(type)}` : ''
  return apiFetch<BookableSite[]>(`/bookings/sites${q}`)
}

/* Crée un arrangement de visite (orga). */
export function createBooking(payload: {
  organization_id: string
  school_organization_id: string
  visit_day: string
  visit_start: string
  visit_end: string
  headcount?: number | null
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

export type BookingPayload = {
  organization_id: string
  school_organization_id: string
  visit_day: string
  visit_start: string
  visit_end: string
  headcount?: number | null
  notes?: string
}

/* Met à jour une visite. */
export function updateBooking(id: string, payload: BookingPayload) {
  return apiFetch<VisitBooking>(`/bookings/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

/* Supprime une visite. */
export function deleteBooking(id: string) {
  return apiFetch<{ id: string }>(`/bookings/${id}`, { method: 'DELETE' })
}
