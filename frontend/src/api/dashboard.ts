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
  overview: DashboardOverview
  updated_at: string
}

type StatusCount = { total: number; pending: number; approved: number; rejected: number }

/* Vue d'ensemble : inscriptions par formulaire, Palais, labels, visites, engagement et courbe des inscriptions. */
export type DashboardOverview = {
  to_process: number
  participations: {
    palais: StatusCount
    particulier: StatusCount & { waitlist: number }
    ecole: StatusCount & { headcount: number }
    media: StatusCount
  }
  palais_days: { n: number; label: string; title: string; registered: number; approved: number; entries: number }[]
  labels: { requests: StatusCount; labeled: { industries: number; schools: number }; on_map: number }
  visits: { booked: number; headcount: number; passages: number }
  engagement: {
    survey: { before: number; after: number; total: number }
    quiz_played: number
    whatsapp: { contacts: number; messages_in: number }
  }
  daily: { date: string; count: number }[]
}

/* Stats complètes pour l'espace orga. */
export function getDashboardStats() {
  return apiFetch<DashboardStats>('/dashboard/stats')
}
