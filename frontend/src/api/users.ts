import { apiFetch } from './client'

export type OrgaUser = {
  id: string
  email: string
  first_name: string
  last_name: string
  role: 'orga' | 'enseignant' | 'referent_entreprise' | 'b2b'
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
  role: OrgaUser['role']
  password: string
}) {
  return apiFetch<OrgaUser>('/users', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

/* Met à jour un utilisateur. */
export function updateUser(
  id: string,
  payload: {
    first_name?: string
    last_name?: string
    role?: OrgaUser['role']
    is_active?: boolean
    password?: string
  },
) {
  return apiFetch<OrgaUser>(`/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}
