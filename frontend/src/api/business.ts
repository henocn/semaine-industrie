import { apiFetch } from './client'

export type BusinessParticipant = {
  id: string
  kind: 'investisseur' | 'pme' | 'acheteur'
  organization_name: string
  contact_name: string
  email: string
  phone: string | null
  sector: string | null
  offers: string | null
  seeks: string | null
  country: string | null
  status: 'pending' | 'approved' | 'rejected'
  contact_opt_in?: boolean
}

export type BusinessMeeting = {
  id: string
  slot_start: string
  slot_end: string
  table_label: string | null
  location?: string | null
  attendee_ids?: string[]
  status: string
  contact_note: string | null
  follow_up_at: string | null
  participantA?: BusinessParticipant
  participantB?: BusinessParticipant
}

/* Inscription publique B2B. */
export function registerParticipant(payload: {
  kind: string
  organization_name: string
  contact_name: string
  email: string
  phone?: string
  sector?: string
  offers?: string
  seeks?: string
  country?: string
  contact_opt_in: boolean
}) {
  return apiFetch<BusinessParticipant>('/business/participants', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

/* Liste orga des participants. */
export function listParticipants(params?: { status?: string; kind?: string }) {
  const sp = new URLSearchParams()
  if (params?.status) sp.set('status', params.status)
  if (params?.kind) sp.set('kind', params.kind)
  const q = sp.toString() ? `?${sp}` : ''
  return apiFetch<BusinessParticipant[]>(`/business/participants${q}`)
}

/* Approuve / refuse un participant. */
export function reviewParticipant(id: string, status: 'approved' | 'rejected') {
  return apiFetch<BusinessParticipant>(`/business/participants/${id}/review`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
}

/* Liste des rendez-vous. */
export function listMeetings(status?: string) {
  const q = status ? `?status=${encodeURIComponent(status)}` : ''
  return apiFetch<BusinessMeeting[]>(`/business/meetings${q}`)
}

/* Crée un rendez-vous (1+ participants). */
export function createMeeting(payload: {
  participant_ids: string[]
  slot_start: string
  slot_end: string
  location?: string
  table_label?: string
}) {
  return apiFetch<BusinessMeeting>('/business/meetings', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

/* Enregistre la fiche contact. */
export function saveContactNote(id: string, contact_note: string) {
  return apiFetch<BusinessMeeting>(`/business/meetings/${id}/contact`, {
    method: 'PATCH',
    body: JSON.stringify({ contact_note, status: 'done', follow_up_months: 3 }),
  })
}

/* Reporte un rendez-vous (notifie WhatsApp). */
export function rescheduleMeeting(
  id: string,
  payload: { slot_start: string; slot_end: string; table_label?: string; location?: string },
) {
  return apiFetch<BusinessMeeting>(`/business/meetings/${id}/reschedule`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}
