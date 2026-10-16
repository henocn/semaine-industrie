import { apiFetch } from './client'

export type PassportVisit = {
  id: string
  scanned_at: string
  organization?: { id: string; name: string; slug: string; city: string | null }
}

export type Passport = {
  id: string
  code: string
  holder_name: string | null
  school_name: string | null
  class_label: string | null
  visits?: PassportVisit[]
}

/* Charge un passeport par code. */
export function getPassport(code: string) {
  return apiFetch<Passport>(`/passports/${encodeURIComponent(code)}`)
}

/* Crée un lot de passeports (orga). */
export function createPassportBatch(payload: { count: number; school_name?: string; class_label?: string }) {
  return apiFetch<{ count: number; items: Array<Passport & { url: string; qr_data_url: string }> }>(
    '/passports/batch',
    { method: 'POST', body: JSON.stringify(payload) },
  )
}

/* Tamponne une visite. */
export function scanPassport(payload: { code: string; organization_id: string; scanned_by?: string }) {
  return apiFetch('/passports/scan', { method: 'POST', body: JSON.stringify(payload) })
}
