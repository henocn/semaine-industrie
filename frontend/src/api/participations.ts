import { apiFetch } from './client'

export type ParticipationKind = 'ecole' | 'particulier'
export type ParticipationStatus = 'pending' | 'approved' | 'rejected'

export type ParticipationPassport = {
  id: string
  code: string
  url?: string | null
  qr_data_url?: string | null
  passed_at?: string | null
  passages?: number
}

export type Participation = {
  id: string
  kind: ParticipationKind
  name: string
  email: string | null
  phone: string | null
  description: string | null
  city: string | null
  headcount: number | null
  status: ParticipationStatus
  passport: ParticipationPassport | null
  createdAt?: string
}

export type ParticipationInput = {
  kind?: ParticipationKind
  name: string
  email?: string | null
  phone?: string | null
  description?: string | null
  city?: string | null
  headcount?: number | null
}

/* Liste les participations (école ou particulier). */
export function listParticipations(params?: { kind?: ParticipationKind; status?: ParticipationStatus }) {
  const q = new URLSearchParams()
  if (params?.kind) q.set('kind', params.kind)
  if (params?.status) q.set('status', params.status)
  const suffix = q.toString() ? `?${q}` : ''
  return apiFetch<Participation[]>(`/participations${suffix}`)
}

/* Fiche avec le QR, s'il a déjà été créé. */
export function getParticipation(id: string) {
  return apiFetch<Participation>(`/participations/${id}`)
}

/* Inscription publique (école / centre / univ, ou particulier), sans compte. */
export function registerParticipation(body: ParticipationInput & { kind: ParticipationKind }) {
  return apiFetch<Participation>('/participations/public', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

/* Enregistre une participation en attente. */
export function createParticipation(body: ParticipationInput & { kind: ParticipationKind }) {
  return apiFetch<Participation>('/participations', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

/* Met à jour une participation. */
export function updateParticipation(id: string, body: ParticipationInput) {
  return apiFetch<Participation>(`/participations/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

/* Accepte et crée le QR du jour J. */
export function approveParticipation(id: string) {
  return apiFetch<Participation>(`/participations/${id}/approve`, { method: 'POST' })
}

/* Refuse une participation. */
export function rejectParticipation(id: string) {
  return apiFetch<Participation>(`/participations/${id}/reject`, { method: 'POST' })
}

/* Supprime une participation. */
export function deleteParticipation(id: string) {
  return apiFetch<{ id: string }>(`/participations/${id}`, { method: 'DELETE' })
}
