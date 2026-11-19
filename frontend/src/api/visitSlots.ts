import { apiFetch } from './client'

/* Un départ de visite : une demi-journée et un lieu de rencontre. */
export type VisitSlot = {
  id: string
  day: string
  period: string
  place: string
}

/* Départ avec ses places restantes (page publique) ; open = choix encore ouvert ce jour-là. */
/* waiting : réservations au-delà des places (liste d'attente). */
export type VisitSlotAvailability = VisitSlot & { capacity: number; remaining: number; waiting?: number; open?: boolean }

/* Jour de visite et état du choix des créneaux (cases des Paramètres). */
export type VisitSlotDay = { day: string; label: string; open: boolean }

/* Inscription d'un particulier validé, et son départ s'il l'a déjà choisi. */
export type VisitSlotBooking = {
  code: string
  name: string
  slot: VisitSlot | null
  already?: boolean
  /* Départ plein : en liste d'attente, peut quand même se présenter. */
  waiting?: boolean
  /* Lien du groupe WhatsApp des visites, envoyé par le serveur pour un code validé. */
  group?: string
}

/* Particulier inscrit sur un départ (backoffice). */
export type VisitSlotPerson = {
  id: string
  name: string
  code: string | null
  phone: string | null
  email: string | null
  booked_at: string | null
  /* Au-delà des 50 premières réservations du départ. */
  waiting: boolean
  /* Scans de départ, du premier aux reprises. */
  scans: { point: string; at: string; again: boolean }[]
}

/* Planning des départs pour le backoffice. */
export type VisitSlotPlanning = {
  open: boolean
  days?: VisitSlotDay[]
  capacity: number
  /* Particuliers validés qui n'ont pas encore choisi de départ. */
  waiting: number
  slots: (VisitSlot & { people: VisitSlotPerson[] })[]
}

/* Départs et places restantes. */
export function getVisitSlots() {
  return apiFetch<{ open: boolean; days?: VisitSlotDay[]; slots: VisitSlotAvailability[] }>('/participations/public/visit-slots')
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

/* Ouvre ou ferme un départ (backoffice, Paramètres). */
export function setVisitSlotsOpen(slot: string, open: boolean) {
  return apiFetch<{ open: boolean; days: VisitSlotDay[]; slots: VisitSlotAvailability[] }>('/participations/visit-slots/open', {
    method: 'PUT',
    body: JSON.stringify({ slot, open }),
  })
}
