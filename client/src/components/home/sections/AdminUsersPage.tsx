import { useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../../hooks/useAuth'
import { AdminUsersSection } from '../AdminUsersSection'
import { useHomeSearch } from '../homeSearchContext'

export function AdminUsersPage() {
  const { user } = useAuth()
  const { onSectionViewed } = useHomeSearch()

  useEffect(() => {
    onSectionViewed('admin-users')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (user?.role !== 'ADMIN') return <Navigate to="/" replace />

  return <AdminUsersSection />
}
