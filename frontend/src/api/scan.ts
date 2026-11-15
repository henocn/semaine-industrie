import { apiFetch } from './client'

/* Point de départ des visites : une école cochée ou un point libre. */
export type DeparturePoint = {
  id: string
  name: string
  organization_id: string | null
  is_school: boolean
}

/* Paramètres : écoles labellisées (cochées si point_id) et points libres. */
export type DepartureSettings = {
  schools: { id: string; name: string; city: string | null; point_id: string | null }[]
  custom: DeparturePoint[]
}

/* Résultat d'un scan à un point de départ. */
export type DepartureScanResult = {
  code: string
  name: string
  status: string
  already: boolean
  /* Vérification seule (check) : QR valide, rien n'est encore enregistré. */
  checked?: boolean
  point: string
  scanned_at: string
}

/* Résultat d'un scan à l'accueil du Palais. */
export type PalaisScanResult = {
  code: string
  name: string
  status: string
  already: boolean
  checked?: boolean
  /* Heure de l'entrée déjà enregistrée aujourd'hui (une seule par jour). */
  already_at?: string | null
  today: number | null
  days: { n: number; label: string; title: string; registered: boolean; checked_in_at: string | null }[]
}

/* Points de départ proposés au réglage du scan. */
export function listDeparturePoints() {
  return apiFetch<DeparturePoint[]>('/scan/points')
}

/* Enregistre le départ d'un particulier. */
export function scanDeparture(code: string, pointId: string, check = false) {
  return apiFetch<DepartureScanResult>('/scan/departure', {
    method: 'POST',
    body: JSON.stringify({ code, point_id: pointId, check }),
  })
}

/* Enregistre l'entrée au Palais pour le jour réglé. */
export function scanPalais(code: string, day: number, check = false) {
  return apiFetch<PalaisScanResult>('/scan/palais', {
    method: 'POST',
    body: JSON.stringify({ code, day, check }),
  })
}

/* Paramètres des points de départ. */
export function getDepartureSettings() {
  return apiFetch<DepartureSettings>('/scan/settings')
}

/* Coche ou décoche une école comme point de départ. */
export function setSchoolDeparture(organizationId: string, enabled: boolean) {
  return apiFetch<DepartureSettings>(`/scan/settings/schools/${organizationId}`, {
    method: 'PUT',
    body: JSON.stringify({ enabled }),
  })
}

/* Ajoute un point de départ libre. */
export function addDeparturePoint(name: string) {
  return apiFetch<DepartureSettings>('/scan/settings/points', {
    method: 'POST',
    body: JSON.stringify({ name }),
  })
}

/* Retire un point de départ libre. */
export function removeDeparturePoint(id: string) {
  return apiFetch<DepartureSettings>(`/scan/settings/points/${id}`, { method: 'DELETE' })
}
