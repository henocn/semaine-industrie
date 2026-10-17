import { apiFetch } from './client'

export type PassportVisit = {
  id: string
  scanned_at: string
  organization?: { id: string; name: string; slug: string; city: string | null }
}

export type Passport = {
  id: string
  code: string
  kind?: 'individual' | 'group'
  holder_name: string | null
  school_name: string | null
  class_label: string | null
  headcount?: number | null
  visits?: PassportVisit[]
  url?: string
  qr_data_url?: string
}

/* Charge un passeport par code. */
export function getPassport(code: string) {
  return apiFetch<Passport>(`/passports/${encodeURIComponent(code)}`)
}

/* Crée un passeport de groupe (un code pour toute la classe). */
export function createGroupPassport(payload: {
  school_organization_id?: string
  school_name?: string
  class_label?: string
  headcount?: number
  holder_name?: string
}) {
  return apiFetch<Passport>('/passports/group', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

/* Crée un lot de passeports individuels (usage rare). */
export function createPassportBatch(payload: { count: number; school_name?: string; class_label?: string }) {
  return apiFetch<{ count: number; items: Array<Passport & { url: string; qr_data_url: string }> }>(
    '/passports/batch',
    { method: 'POST', body: JSON.stringify(payload) },
  )
}

/* Tamponne une visite (un site = un tampon pour tout le groupe). */
export function scanPassport(payload: { code: string; organization_id: string; scanned_by?: string }) {
  return apiFetch('/passports/scan', { method: 'POST', body: JSON.stringify(payload) })
}
