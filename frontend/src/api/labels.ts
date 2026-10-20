import { API_BASE } from '../config/api'
import { apiFetch } from './client'
import { getAccessToken } from './session'

export type LabelRequestPayload = {
  structure_name: string
  structure_type: 'entreprise' | 'ecole'
  sector?: string
  region?: string
  city?: string
  contact_email: string
  contact_phone: string
  contact_opt_in?: boolean
  description?: string
  products?: string[]
  max_visitors?: number | null
  visit_slots?: { day: string; start: string; end: string }[]
  safety_rules?: string
  lat?: number | null
  lng?: number | null
  gallery_urls?: string[]
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
  label_status: string
  max_visitors: number | null
  visit_slots: { day: string; start: string; end: string }[]
  safety_rules: string | null
  contact_name: string | null
  contact_email?: string | null
  contact_phone?: string | null
  photo_url?: string | null
  gallery_urls?: string[]
  lat: string | null
  lng: string | null
}

export type IndustryCard = {
  id: string
  name: string
  slug: string
  sector: string | null
  region: string | null
  city: string | null
  description: string | null
  products: string[]
  photo_url: string | null
  gallery_urls: string[]
}

export type TrackingResources = {
  organization_name: string
  type: string
  label_pdf_url: string
  programme_pdf_url: string
}

/* Upload les 3 images galerie (multipart). */
export async function uploadLabelGallery(files: File[]) {
  const body = new FormData()
  for (const file of files) body.append('gallery', file)
  const res = await fetch(`${API_BASE}/labels/upload-gallery`, {
    method: 'POST',
    body,
  })
  const json = (await res.json()) as {
    success: boolean
    data?: { urls: string[] }
    error?: { message: string }
  }
  if (!res.ok || !json.success || !json.data?.urls) {
    throw new Error(json.error?.message || `Erreur HTTP ${res.status}`)
  }
  return json.data.urls
}

/* Envoie une demande de label. */
export function createLabelRequest(payload: LabelRequestPayload) {
  return apiFetch<{ id: string; status: string }>('/labels/requests', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

/* Liste publique des industries labellisées. */
export function listIndustries() {
  return apiFetch<IndustryCard[]>('/labels/organizations')
}

export type LabelRequest = {
  id: string
  organization_id?: string | null
  label_code?: string | null
  structure_name: string
  structure_type: 'entreprise' | 'ecole'
  sector: string | null
  region: string | null
  city: string | null
  address?: string | null
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
  label_document_url?: string | null
  createdAt?: string
  created_at?: string
}

/* Libellé d'adresse (champ unique ou repli ville/région). */
export function formatLabelAddress(item: Pick<LabelRequest, 'address' | 'city' | 'region'>) {
  const direct = String(item.address || '').trim()
  if (direct) return direct
  return [item.city, item.region].filter(Boolean).join(', ') || ''
}

/* Libellé type structure. */
export function formatStructureType(type: LabelRequest['structure_type']) {
  return type === 'ecole' ? 'École' : 'Industrie'
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

/* Approuve ou rejette une demande (PDF obligatoire si approved). */
export async function reviewLabelRequest(
  id: string,
  status: 'approved' | 'rejected',
  options?: { review_note?: string; labelPdf?: File | null },
) {
  const token = getAccessToken()
  const body = new FormData()
  body.append('status', status)
  if (options?.review_note) body.append('review_note', options.review_note)
  if (status === 'approved') {
    if (!options?.labelPdf) throw new Error('Joignez le PDF du label pour approuver')
    body.append('label_pdf', options.labelPdf)
  }

  const res = await fetch(`${API_BASE}/labels/requests/${id}/review`, {
    method: 'PATCH',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body,
  })
  const json = (await res.json()) as {
    success: boolean
    data?: { request: LabelRequest; organization: Organization | null }
    error?: { message: string }
  }
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error?.message || `Erreur HTTP ${res.status}`)
  }
  return json.data
}

/* Vérifie un code de suivi et renvoie les URLs de téléchargement. */
export function verifyTrackingCode(code: string) {
  return apiFetch<TrackingResources>('/labels/verify-code', {
    method: 'POST',
    body: JSON.stringify({ code: code.trim().toUpperCase() }),
  })
}

/* Upload du PDF programme officiel (orga). */
export async function uploadProgrammePdf(file: File) {
  const token = getAccessToken()
  const body = new FormData()
  body.append('programme_pdf', file)
  const res = await fetch(`${API_BASE}/labels/programme-pdf`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body,
  })
  const json = (await res.json()) as {
    success: boolean
    data?: { programme_pdf_url: string; path: string }
    error?: { message: string }
  }
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error?.message || `Erreur HTTP ${res.status}`)
  }
  return json.data
}

/* Modifie une demande (orga, avant acceptation). */
export function updateLabelRequest(id: string, payload: Partial<LabelRequestPayload> & { structure_type?: 'entreprise' | 'ecole'; address?: string }) {
  return apiFetch<LabelRequest>(`/labels/requests/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

/* Crée une demande depuis le backoffice. */
export function createLabelRequestOrga(payload: Partial<LabelRequestPayload> & {
  structure_name: string
  structure_type: 'entreprise' | 'ecole'
  contact_email: string
  contact_phone: string
  address?: string
}) {
  return apiFetch<LabelRequest>('/labels/requests/orga', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

/* Remplace le PDF label après acceptation. */
export async function updateLabelPdf(id: string, file: File) {
  const token = getAccessToken()
  const body = new FormData()
  body.append('label_pdf', file)
  const res = await fetch(`${API_BASE}/labels/requests/${id}/label-pdf`, {
    method: 'PATCH',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body,
  })
  const json = (await res.json()) as {
    success: boolean
    data?: LabelRequest
    error?: { message: string }
  }
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error?.message || `Erreur HTTP ${res.status}`)
  }
  return json.data
}

/* Supprime un dossier label. */
export function deleteLabelRequest(id: string) {
  return apiFetch<{ id: string; deleted: boolean }>(`/labels/requests/${id}`, {
    method: 'DELETE',
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

/* QR d'une demande acceptée. */
export function getLabelRequestQr(id: string) {
  return apiFetch<QrBatchItem>(`/labels/requests/${id}/qr`)
}
