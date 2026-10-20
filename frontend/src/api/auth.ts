import { apiFetch } from './client'
import { isStaffRole } from '../lib/roles'
import {
  clearSession,
  getAccessToken,
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

/* Profil serveur (valide le token). */
export function fetchMe() {
  return apiFetch<AuthUser>('/auth/me')
}

/* Vérifie / restaure une session orga (tokens + rôle). */
export async function ensureOrgaSession(): Promise<AuthUser | null> {
  const hasToken = Boolean(getAccessToken() || getRefreshToken())
  if (!hasToken) return null

  try {
    const me = await fetchMe()
    const access = getAccessToken() || ''
    const refresh = getRefreshToken() || ''
    if (access && refresh) saveSession(access, refresh, me)
    if (!isStaffRole(me.role)) {
      clearSession()
      return null
    }
    return me
  } catch {
    clearSession()
    return null
  }
}

/* Session locale déjà staff backoffice (sans appel réseau). */
export function peekOrgaUser(): AuthUser | null {
  const user = getStoredUser()
  if (!user || !isStaffRole(user.role)) return null
  if (!getAccessToken() && !getRefreshToken()) return null
  return user
}

/* Met à jour le profil et le stockage local. */
export async function updateProfile(first_name: string, last_name: string) {
  const user = await apiFetch<AuthUser>('/auth/me', {
    method: 'PATCH',
    body: JSON.stringify({ first_name, last_name }),
  })
  const access = getAccessToken() || ''
  const refresh = getRefreshToken() || ''
  if (access && refresh) saveSession(access, refresh, user)
  return user
}

/* Change le mot de passe du compte connecté. */
export function changePassword(current_password: string, new_password: string) {
  return apiFetch<{ ok: boolean }>('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ current_password, new_password }),
  })
}

export { getStoredUser }
