import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { getStoredUser } from '../../api/auth'
import { isAdminRole } from '../../lib/roles'

/* Réserve une route aux admins uniquement. */
export function RequireAdmin() {
  const location = useLocation()
  const user = getStoredUser()
  if (!isAdminRole(user?.role)) {
    return <Navigate to="/orga" replace state={{ from: location.pathname }} />
  }
  return <Outlet />
}
