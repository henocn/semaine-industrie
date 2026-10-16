import { API_BASE } from '../config/api'
import { getAccessToken } from './session'

type ApiSuccess<T> = { success: true; data: T; message?: string }
type ApiFailure = { success: false; error: { code: string; message: string; details?: unknown[] } }

/* Effectue un appel JSON vers l'API backend. */
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getAccessToken()
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  })

  const body = (await res.json()) as ApiSuccess<T> | ApiFailure

  if (!res.ok || !body.success) {
    const message = !body.success ? body.error.message : `Erreur HTTP ${res.status}`
    throw new Error(message)
  }

  return body.data
}
