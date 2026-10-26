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
  passed_at?: string | null
}

/* Charge un passeport par code. */
export function getPassport(code: string) {
  return apiFetch<Passport>(`/passports/${encodeURIComponent(code)}`)
}

export type PassageResult = {
  already: boolean
  passage: boolean
  visitor: { code: string; name: string; kind?: string }
  site: { name: string; code?: string | null }
}

/* Valide un passage (QR visiteur + code industrie). */
export function recordPassage(visitorCode: string, industryCode: string) {
  return apiFetch<PassageResult>('/passports/passage', {
    method: 'POST',
    body: JSON.stringify({
      visitor_code: visitorCode,
      industry_code: industryCode,
    }),
  })
}
