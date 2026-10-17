import { apiFetch } from './client'

export type LabelRequestPayload = {
  structure_name: string
  structure_type: 'entreprise' | 'ecole'
  sector?: string
  region?: string
  city?: string
  contact_email: string
  contact_phone: string
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
  safety_rules?: string | null
  lat?: string | number | null
  lng?: string | number | null
  status: 'pending' | 'approved' | 'rejected'
  createdAt?: string
  created_at?: string
}

/* Lien Google Maps pour un point (nouvel onglet). */
export function googleMapsUrl(lat: string | number | null | undefined, lng: string | number | null | undefined) {
  const a = Number(lat)
  const b = Number(lng)
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null
  return `https://www.google.com/maps?q=${a},${b}`
}

export type MapVisitItem = {
  school_name: string
  visit_day: string
  visit_start: string
  visit_end: string
  headcount: number
  contact_name: string
  contact_email: string
  contact_phone: string | null
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
  max_visitors?: number | null
  description?: string | null
  visits?: {
    groups: number
    headcount: number
    items: MapVisitItem[]
  }
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

/* Modifie une demande (orga). */
export function updateLabelRequest(id: string, payload: Partial<LabelRequestPayload> & { structure_type?: 'entreprise' | 'ecole' }) {
  return apiFetch<LabelRequest>(`/labels/requests/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

/* Points carte des usines labellisées (+ visites arrangées). */
export function listMapPoints(params?: { region?: string; sector?: string; type?: 'entreprise' | 'ecole' }) {
  const sp = new URLSearchParams()
  if (params?.region) sp.set('region', params.region)
  if (params?.sector) sp.set('sector', params.sector)
  if (params?.type) sp.set('type', params.type)
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
