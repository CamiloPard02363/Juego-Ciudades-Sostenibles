import { useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../../hooks/useAuth'
import { AdminAiProviderLogsSection } from '../AdminAiProviderLogsSection'
import { useHomeSearch } from '../homeSearchContext'

export function AdminAiProviderLogsPage() {
  const { user } = useAuth()
  const { onSectionViewed } = useHomeSearch()

  useEffect(() => {
    onSectionViewed('admin-ai-providers')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (user?.role !== 'ADMIN') return <Navigate to="/" replace />

  return <AdminAiProviderLogsSection />
}
