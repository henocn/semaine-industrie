import { apiFetch } from './client'

export type DashboardStats = {
  indicators: {
    labels_approved: number
    labels_pending?: number
    labels_rejected?: number
    requests_total?: number
    sites_on_map: number
    visits_booked: number
    young_visitors: number
    business_meetings: number
    passport_scans?: number
  }
  by_region: { name: string; count: number }[]
  by_sector: { name: string; count: number }[]
  by_type: { name: string; count: number }[]
  recent_labels: {
    name: string
    slug: string
    city: string | null
    region: string | null
    type: string
    label_code: string | null
  }[]
  updated_at: string
}

/* Stats complètes pour l'espace orga. */
export function getDashboardStats() {
  return apiFetch<DashboardStats>('/dashboard/stats')
}

/* Bilan public. */
export function getPublicBilan() {
  return apiFetch<DashboardStats>('/dashboard/bilan')
}
