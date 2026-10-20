import { apiFetch } from './client'

export type StaffRole = 'admin' | 'simple'

export type OrgaUser = {
  id: string
  email: string
  first_name: string
  last_name: string
  role: StaffRole | 'orga' | string
  is_active: boolean
  last_login_at: string | null
  created_at?: string
}

/* Liste les utilisateurs. */
export function listUsers() {
  return apiFetch<OrgaUser[]>('/users')
}

/* Crée un utilisateur. */
export function createUser(payload: {
  email: string
  first_name: string
  last_name: string
  role: StaffRole
  password: string
}) {
  return apiFetch<OrgaUser>('/users', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

/* Met à jour un utilisateur (password vide = inchangé). */
export function updateUser(
  id: string,
  payload: {
    first_name?: string
    last_name?: string
    role?: StaffRole
    is_active?: boolean
    password?: string
  },
) {
  return apiFetch<OrgaUser>(`/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}
