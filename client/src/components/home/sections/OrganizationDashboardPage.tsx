import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../../hooks/useAuth'
import { OrganizationDashboard } from '../OrganizationDashboard'
import { listMyOrganizations } from '../../../services/organization.service'
import { useHomeSearch } from '../homeSearchContext'

/**
 * Acceso: ADMIN global de plataforma, o ADMIN de al menos una organización
 * (ver `myOrgRole` en `GET /organizations/mine`). Sin eso, redirect a home —
 * mismo patrón que `AdminUsersPage`.
 */
export function OrganizationDashboardPage() {
  const { user, token } = useAuth()
  const { onSectionViewed } = useHomeSearch()
  const [checking, setChecking] = useState(true)
  const [canAccess, setCanAccess] = useState(false)

  useEffect(() => {
    onSectionViewed('organization')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!token) return
    if (user?.role === 'ADMIN') {
      setCanAccess(true)
      setChecking(false)
      return
    }
    listMyOrganizations(token)
      .then((items) => setCanAccess(items.some((org) => org.myOrgRole === 'ADMIN')))
      .catch(() => setCanAccess(false))
      .finally(() => setChecking(false))
  }, [token, user])

  if (checking) {
    return <p className="text-[14px] text-text">Cargando…</p>
  }

  if (!canAccess) return <Navigate to="/" replace />

  return <OrganizationDashboard />
}
