const STAFF = new Set(['admin', 'simple', 'orga'])

/* Compte backoffice (admin, simple, orga legacy). */
export function isStaffRole(role: string | undefined | null) {
  return Boolean(role && STAFF.has(role))
}

/* Admin uniquement (onglets Audit + Utilisateurs). */
export function isAdminRole(role: string | undefined | null) {
  return role === 'admin'
}
