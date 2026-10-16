import { apiFetch } from './client'

export type LabelRequestPayload = {
  structure_name: string
  structure_type: 'entreprise' | 'ecole'
  sector?: string
  region?: string
  city?: string
  address?: string
  contact_name: string
  contact_email: string
  contact_phone?: string
  description?: string
  products?: string[]
  max_visitors?: number | null
  visit_slots?: { day: string; start: string; end: string }[]
  safety_rules?: string
  lat?: number | null
  lng?: number | null
}

export type Organization = {
  id: string
  name: string
  slug: string
  type: 'entreprise' | 'ecole'
  sector: string | null
  region: string | null
  city: string | null
  address: string | null
  description: string | null
  products: string[]
  label_code: string | null
  label_status: string
  max_visitors: number | null
  visit_slots: { day: string; start: string; end: string }[]
  safety_rules: string | null
  contact_name: string | null
  lat: string | null
  lng: string | null
}

/* Envoie une demande de label. */
export function createLabelRequest(payload: LabelRequestPayload) {
  return apiFetch<{ id: string; status: string }>('/labels/requests', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

/* Charge la fiche publique d'une organisation labellisée. */
export function getOrganizationBySlug(slug: string) {
  return apiFetch<Organization>(`/labels/organizations/${slug}`)
}
