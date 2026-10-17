import { apiFetch } from './client'

export type LabelRequestPayload = {
  structure_name: string
  structure_type: 'entreprise' | 'ecole'
  sector?: string
  region?: string
  city?: string
  contact_name: string
  contact_email: string
  contact_phone: string
  description?: string
  products?: string[]
  max_visitors?: number | null
  visit_slots?: { day: string; start: string; end: string }[]
  safety_rules?: string
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

export type LabelRequest = {
  id: string
  structure_name: string
  structure_type: 'entreprise' | 'ecole'
  sector: string | null
  region: string | null
  city: string | null
  contact_name: string
  contact_email: string
  contact_phone: string | null
  description: string | null
  products: string[]
  max_visitors: number | null
  status: 'pending' | 'approved' | 'rejected'
  createdAt?: string
  created_at?: string
}

export type MapPoint = {
  id: string
  name: string
  slug: string
  type: string
  sector: string | null
  region: string | null
  city: string | null
  lat: string
  lng: string
  label_code: string | null
  products: string[]
}

/* Charge la fiche publique d'une organisation labellisée. */
export function getOrganizationBySlug(slug: string) {
  return apiFetch<Organization>(`/labels/organizations/${slug}`)
}

/* Liste les demandes (orga). */
export function listLabelRequests(status?: string) {
  const q = status ? `?status=${encodeURIComponent(status)}` : ''
  return apiFetch<LabelRequest[]>(`/labels/requests${q}`)
}

/* Approuve ou rejette une demande. */
export function reviewLabelRequest(id: string, status: 'approved' | 'rejected', review_note?: string) {
  return apiFetch<{ request: LabelRequest; organization: Organization | null }>(
    `/labels/requests/${id}/review`,
    {
      method: 'PATCH',
      body: JSON.stringify({ status, review_note }),
    },
  )
}

/* Points carte des usines labellisées. */
export function listMapPoints(params?: { region?: string; sector?: string }) {
  const sp = new URLSearchParams()
  if (params?.region) sp.set('region', params.region)
  if (params?.sector) sp.set('sector', params.sector)
  const q = sp.toString() ? `?${sp}` : ''
  return apiFetch<MapPoint[]>(`/labels/organizations/map${q}`)
}

export type QrBatchItem = {
  id: string
  name: string
  slug: string
  label_code: string | null
  type: string
  city: string | null
  region: string | null
  fiche_url: string
  qr_data_url: string
}

/* Lot de QR pour impression (orga). */
export function listQrBatch() {
  return apiFetch<{ count: number; items: QrBatchItem[] }>('/labels/qr-batch')
}
