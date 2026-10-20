import { apiFetch } from './client'

export type AuditEvent = {
  id: string
  user_id: string | null
  actor_email: string | null
  actor_name: string | null
  action: string
  entity_type: string
  entity_id: string | null
  summary: string
  meta?: Record<string, unknown> | null
  created_at: string
}

/* Liste les événements d'audit métier. */
export function listAuditEvents(limit = 150) {
  return apiFetch<AuditEvent[]>(`/audit?limit=${limit}`)
}
