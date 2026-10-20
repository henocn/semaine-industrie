import { API_BASE } from '../config/api'
import {
  clearSession,
  getAccessToken,
  getRefreshToken,
  saveSession,
  type AuthUser,
} from './session'

type ApiSuccess<T> = { success: true; data: T; message?: string }
type ApiFailure = { success: false; error: { code: string; message: string; details?: unknown[] } }

type RefreshPayload = {
  access_token: string
  refresh_token: string
  user: AuthUser
}

let refreshInFlight: Promise<boolean> | null = null

/* Renouvelle l'access token une seule fois à la fois. */
async function refreshAccessToken(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight

  refreshInFlight = (async () => {
    const refresh = getRefreshToken()
    if (!refresh) return false
    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refresh }),
      })
      const body = (await res.json()) as ApiSuccess<RefreshPayload> | ApiFailure
      if (!res.ok || !body.success) {
        clearSession()
        return false
      }
      saveSession(body.data.access_token, body.data.refresh_token, body.data.user)
      return true
    } catch {
      return false
    } finally {
      refreshInFlight = null
    }
  })()

  return refreshInFlight
}

/* Effectue un appel JSON vers l'API (refresh auto si 401). */
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const run = async (retried: boolean): Promise<T> => {
    const token = getAccessToken()
    const res = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init?.headers ?? {}),
      },
    })

    if (res.status === 401 && !retried && !path.startsWith('/auth/')) {
      const ok = await refreshAccessToken()
      if (ok) return run(true)
    }

    let body: ApiSuccess<T> | ApiFailure
    try {
      body = (await res.json()) as ApiSuccess<T> | ApiFailure
    } catch {
      throw new Error(`Erreur HTTP ${res.status}`)
    }

    if (!res.ok || !body.success) {
      const message = !body.success ? body.error.message : `Erreur HTTP ${res.status}`
      throw new Error(message)
    }

    return body.data
  }

  return run(false)
}
