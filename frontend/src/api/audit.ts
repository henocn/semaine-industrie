import { apiFetch } from './client'

export type AuditLogFile = {
  name: string
  day: string
  size: number
  updated_at: string
}

export type AuditOverview = {
  files: AuditLogFile[]
  current: {
    day: string
    total_lines: number
    returned: number
    lines: string[]
  }
}

/* Charge les logs / audit. */
export function getAuditOverview(day?: string, limit = 250) {
  const sp = new URLSearchParams()
  if (day) sp.set('day', day)
  sp.set('limit', String(limit))
  return apiFetch<AuditOverview>(`/audit?${sp}`)
}
