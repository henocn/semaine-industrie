export type AuthUser = {
  id: string
  email: string
  first_name: string
  last_name: string
  role: string
}

const ACCESS_KEY = 'si_access_token'
const REFRESH_KEY = 'si_refresh_token'
const USER_KEY = 'si_user'

/* Lit le token d'accès. */
export function getAccessToken() {
  return localStorage.getItem(ACCESS_KEY)
}

/* Lit le refresh token. */
export function getRefreshToken() {
  return localStorage.getItem(REFRESH_KEY)
}

/* Lit l'utilisateur stocké. */
export function getStoredUser(): AuthUser | null {
  const raw = localStorage.getItem(USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as AuthUser
  } catch {
    return null
  }
}

/* Persiste une session après login. */
export function saveSession(access: string, refresh: string, user: AuthUser) {
  localStorage.setItem(ACCESS_KEY, access)
  localStorage.setItem(REFRESH_KEY, refresh)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

/* Efface la session locale. */
export function clearSession() {
  localStorage.removeItem(ACCESS_KEY)
  localStorage.removeItem(REFRESH_KEY)
  localStorage.removeItem(USER_KEY)
}
