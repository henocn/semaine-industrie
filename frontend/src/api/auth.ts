import { apiFetch } from './client'
import {
  clearSession,
  getRefreshToken,
  getStoredUser,
  saveSession,
  type AuthUser,
} from './session'

export type { AuthUser }

export type AuthSession = {
  access_token: string
  refresh_token: string
  user: AuthUser
}

/* Connexion et stockage local de la session. */
export async function login(email: string, password: string) {
  const data = await apiFetch<AuthSession>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  saveSession(data.access_token, data.refresh_token, data.user)
  return data
}

/* Déconnexion locale (+ API si refresh présent). */
export async function logout() {
  const refresh = getRefreshToken()
  try {
    if (refresh) {
      await apiFetch('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refresh_token: refresh }),
      })
    }
  } catch {
    // ignore réseau
  }
  clearSession()
}

export { getStoredUser }
