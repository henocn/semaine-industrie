import { apiFetch } from './client'

export type EspaceType = 'ecole' | 'particulier' | 'industrie' | 'affaires'

export type EspaceRow = {
  id: string
  title: string
  detail: string | null
  when: string
}

export type Espace = {
  code: string
  type: EspaceType
  name: string
  status: 'pending' | 'approved' | 'rejected'
  qr_data_url: string | null
  page_url: string | null
  facts: { label: string; value: string }[]
  stats: { label: string; value: number }[]
  passages: EspaceRow[]
  planned: EspaceRow[]
  documents: { id: string; title: string; url: string }[]
}

/* Charge la fiche et le bilan liés à un code de suivi. */
export function getEspace(code: string) {
  return apiFetch<Espace>(`/espace/${encodeURIComponent(code)}`)
}
