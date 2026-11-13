const STAFF = new Set(['admin', 'simple', 'orga', 'scan'])

/* Compte backoffice (admin, simple, scan, orga legacy). */
export function isStaffRole(role: string | undefined | null) {
  return Boolean(role && STAFF.has(role))
}

/* Admin uniquement (onglets Audit + Utilisateurs). */
export function isAdminRole(role: string | undefined | null) {
  return role === 'admin'
}

/* Compte de scan : ne voit que la page Scan. */
export function isScanRole(role: string | undefined | null) {
  return role === 'scan'
}

/* Page d'arrivée du back-office selon le rôle. */
export function orgaHome(role: string | undefined | null) {
  return isScanRole(role) ? '/orga/scan' : '/orga'
}
