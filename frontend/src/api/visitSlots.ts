import { apiFetch } from './client'

/* Un départ de visite : une demi-journée et un lieu de rencontre. */
export type VisitSlot = {
  id: string
  day: string
  period: string
  place: string
}

/* Départ avec ses places restantes (page publique). */
export type VisitSlotAvailability = VisitSlot & { capacity: number; remaining: number }

/* Inscription d'un particulier validé, et son départ s'il l'a déjà choisi. */
export type VisitSlotBooking = {
  code: string
  name: string
  slot: VisitSlot | null
  already?: boolean
}

/* Particulier inscrit sur un départ (backoffice). */
export type VisitSlotPerson = {
  id: string
  name: string
  code: string | null
  phone: string | null
  email: string | null
  booked_at: string | null
}

/* Planning des départs pour le backoffice. */
export type VisitSlotPlanning = {
  open: boolean
  capacity: number
  /* Particuliers validés qui n'ont pas encore choisi de départ. */
  waiting: number
  slots: (VisitSlot & { people: VisitSlotPerson[] })[]
}

/* Départs et places restantes. */
export function getVisitSlots() {
  return apiFetch<{ open: boolean; slots: VisitSlotAvailability[] }>('/participations/public/visit-slots')
}

/* Vérifie un code de suivi avant le choix du départ. */
export function lookupVisitSlot(code: string) {
  return apiFetch<VisitSlotBooking>(`/participations/public/visit-slots/${encodeURIComponent(code)}`)
}

/* Réserve un départ. */
export function bookVisitSlot(code: string, slot: string) {
  return apiFetch<VisitSlotBooking>('/participations/public/visit-slots', {
    method: 'POST',
    body: JSON.stringify({ code, slot }),
  })
}

/* Planning des départs avec les inscrits (backoffice). */
export function getVisitSlotPlanning() {
  return apiFetch<VisitSlotPlanning>('/participations/visit-slots')
}

/* Change ou libère (slot null) le départ d'un particulier (backoffice). */
export function setVisitSlot(id: string, slot: string | null) {
  return apiFetch<{ id: string; slot: string | null }>(`/participations/${id}/visit-slot`, {
    method: 'PUT',
    body: JSON.stringify({ slot }),
  })
}
