import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../../hooks/useAuth'
import { OrganizationDashboard } from '../OrganizationDashboard'
import { JoinOrganizationPanel } from '../JoinOrganizationPanel'
import { MyOrganizationView } from '../MyOrganizationView'
import { listMyOrganizations } from '../../../services/organization.service'
import { useHomeSearch } from '../homeSearchContext'

type Situation = 'none' | 'member' | 'admin'

/**
 * Punto de entrada de `/organizacion`. Decide qué vista de nivel superior
 * renderizar según el rol/pertenencia del usuario (issue #133/#136, Frente
 * B) — ya no redirige a home a un STUDENT/TEACHER sin rol ADMIN:
 * - Sin ninguna organización -> `JoinOrganizationPanel` (unirse por código).
 * - Con organización(es) pero sin rol ADMIN en ninguna -> `MyOrganizationView`.
 * - Con rol ADMIN en alguna organización (o ADMIN global) -> `OrganizationDashboard`
 *   (comportamiento existente, sin cambios de acceso).
 */
export function OrganizationDashboardPage() {
  const { user, token } = useAuth()
  const { onSectionViewed } = useHomeSearch()
  const [checking, setChecking] = useState(true)
  const [situation, setSituation] = useState<Situation>('none')

  useEffect(() => {
    onSectionViewed('organization')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const resolveSituation = useCallback(() => {
    if (!token) return
    if (user?.role === 'ADMIN') {
      setSituation('admin')
      setChecking(false)
      return
    }
    setChecking(true)
    listMyOrganizations(token)
      .then((items) => {
        if (items.length === 0) setSituation('none')
        else if (items.some((org) => org.myOrgRole === 'ADMIN')) setSituation('admin')
        else setSituation('member')
      })
      .catch(() => setSituation('none'))
      .finally(() => setChecking(false))
  }, [token, user])

  useEffect(() => {
    resolveSituation()
  }, [resolveSituation])

  if (checking) {
    return <p className="text-[14px] text-text">Cargando…</p>
  }

  if (situation === 'admin') return <OrganizationDashboard />
  if (situation === 'member') return <MyOrganizationView />
  return <JoinOrganizationPanel onJoined={resolveSituation} />
}
