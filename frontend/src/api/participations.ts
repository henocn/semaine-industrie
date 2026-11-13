import { apiFetch } from './client'

export type ParticipationKind = 'ecole' | 'particulier' | 'palais' | 'media'
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
  address: string | null
  lat: string | number | null
  lng: string | number | null
  headcount: number | null
  status: ParticipationStatus
  tracking_code?: string | null
  passport: ParticipationPassport | null
  createdAt?: string
  /* Particulier en attente de validation, au-delà des places prévues. */
  waitlisted?: boolean
  /* Particulier ou média scanné à un point de départ (liste seulement). */
  departure_scan?: { point: string; scanned_at: string } | null
  /* Journées du Palais choisies (16, 17, 18) et entrées scannées, pour une inscription « palais ». */
  palais_days?: number[] | null
  palais_checkins?: Record<string, string> | null
  /* Accréditation média : média ou chaîne, profil et lien officiel. */
  media_details?: { outlet?: string; profile?: string; link?: string } | null
}

/* Ce que l'accueil voit au scan d'une accréditation média. */
export type MediaPass = {
  code: string
  name: string
  status: ParticipationStatus
  outlet: string | null
  profile: string
  validity: string
}

/* Ce que l'accueil du Palais voit au scan du QR. */
export type PalaisPass = {
  code: string
  name: string
  status: ParticipationStatus
  today: number | null
  expected_today: boolean
  checked_in_today: boolean
  already?: boolean
  days: {
    n: number
    label: string
    title: string
    place: string
    hours: string
    registered: boolean
    checked_in_at: string | null
  }[]
}

export type ParticipationInput = {
  kind?: ParticipationKind
  name: string
  email?: string | null
  phone?: string | null
  description?: string | null
  city?: string | null
  address?: string | null
  lat?: number | null
  lng?: number | null
  headcount?: number | null
  palais_days?: number[]
  media_outlet?: string
  media_profile?: string
  media_link?: string
}

/* Accréditation média lue depuis le QR. */
export function getMediaPass(code: string) {
  return apiFetch<MediaPass>(`/participations/public/media/${encodeURIComponent(code)}`)
}

/* Inscription aux journées du Palais lue depuis le QR. */
export function getPalaisPass(code: string) {
  return apiFetch<PalaisPass>(`/participations/public/palais/${encodeURIComponent(code)}`)
}

/* Enregistre l'entrée du jour au Palais (accueil connecté). */
export function checkinPalais(code: string) {
  return apiFetch<PalaisPass>(`/participations/palais/${encodeURIComponent(code)}/checkin`, { method: 'POST' })
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

/* Indique si les places prévues pour les particuliers sont toutes prises. */
export function getParticulierCapacity() {
  return apiFetch<{ full: boolean }>('/participations/public/capacity')
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
