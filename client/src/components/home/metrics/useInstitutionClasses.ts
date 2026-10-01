import { useEffect, useState } from 'react'
import { useAuth } from '../../../hooks/useAuth'
import { listOrganizationClasses, type OrganizationClass } from '../../../services/organization.service'
import { ApiError } from '../../../utils/http'

/** "Clases de la institución" (issue #226): GET /organizations/:id/classes. */
export function useInstitutionClasses(organizationId: string) {
  const { token } = useAuth()
  const [classes, setClasses] = useState<OrganizationClass[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token || !organizationId) return
    setLoading(true)
    setError(null)
    listOrganizationClasses(token, organizationId)
      .then((items) => setClasses(items))
      .catch((err: unknown) => {
        setError(err instanceof ApiError ? err.message : 'No se pudieron cargar las clases.')
      })
      .finally(() => setLoading(false))
  }, [token, organizationId])

  return { classes, loading, error }
}
