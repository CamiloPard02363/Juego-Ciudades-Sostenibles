import { useEffect, useState } from 'react'
import { useAuth } from '../../../hooks/useAuth'
import { listOrganizationStudents, type OrganizationMember } from '../../../services/organization.service'
import { ApiError } from '../../../utils/http'

/** "Estudiantes a nivel de institución" (issue #226): GET /organizations/:id/students. */
export function useInstitutionStudents(organizationId: string) {
  const { token } = useAuth()
  const [students, setStudents] = useState<OrganizationMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token || !organizationId) return
    setLoading(true)
    setError(null)
    listOrganizationStudents(token, organizationId)
      .then((items) => setStudents(items))
      .catch((err: unknown) => {
        setError(err instanceof ApiError ? err.message : 'No se pudieron cargar los estudiantes.')
      })
      .finally(() => setLoading(false))
  }, [token, organizationId])

  return { students, loading, error }
}
