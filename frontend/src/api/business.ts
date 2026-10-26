import { apiFetch } from './client'

export type BusinessParticipant = {
  id: string
  /* pme / investisseur / acheteur : anciens profils, affichés « Entreprise ». */
  kind: 'entreprise' | 'particulier' | 'investisseur' | 'pme' | 'acheteur'
  organization_name: string | null
  contact_name: string | null
  email: string
  phone: string | null
  sector: string | null
  notes: string | null
  status: 'pending' | 'approved' | 'rejected'
  contact_opt_in?: boolean
  tracking_code?: string | null
  createdAt?: string
}

/* Libellé du profil : Particulier, sinon Entreprise (anciens profils compris). */
export function businessKindLabel(kind: BusinessParticipant['kind']) {
  return kind === 'particulier' ? 'Particulier' : 'Entreprise'
}

/* Libellé affichable d'un participant B2B : nom et prénom, sinon organisation (jamais l'e-mail). */
export function businessParticipantLabel(p: Pick<BusinessParticipant, 'contact_name' | 'organization_name'>) {
  return p.contact_name || p.organization_name || 'Participant'
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
  organization_name?: string
  contact_name?: string
  email: string
  phone?: string
  sector?: string
  notes?: string
  contact_opt_in: boolean
}) {
  return apiFetch<BusinessParticipant>('/business/participants', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

/* Ajout manuel orga (approuvé par défaut). */
export function createParticipantOrga(payload: {
  kind: string
  contact_name: string
  email: string
  phone?: string
  sector?: string
  notes?: string
  contact_opt_in?: boolean
  status?: 'pending' | 'approved'
}) {
  return apiFetch<BusinessParticipant>('/business/participants/orga', {
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

/* Modifie un participant (orga). */
export function updateParticipant(
  id: string,
  payload: Partial<
    Pick<BusinessParticipant, 'kind' | 'organization_name' | 'contact_name' | 'email' | 'phone' | 'sector' | 'notes'>
  >,
) {
  return apiFetch<BusinessParticipant>(`/business/participants/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

/* Supprime un participant sans rendez-vous (orga). */
export function deleteParticipant(id: string) {
  return apiFetch<{ id: string }>(`/business/participants/${id}`, { method: 'DELETE' })
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
