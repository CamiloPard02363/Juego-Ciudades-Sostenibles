import { useEffect, useState } from 'react'
import { useAuth } from '../../../hooks/useAuth'
import { listOrganizationMembers, type OrganizationMember } from '../../../services/organization.service'
import { ApiError } from '../../../utils/http'

/**
 * "Profesores de la institución" (issue #226): reutiliza
 * `GET /organizations/:id/members` (ya trae `orgRole`) y filtra en el
 * cliente — no hace falta un endpoint nuevo de backend solo para recortar un
 * listado que ya viaja completo, mismo criterio que otras vistas de este
 * dashboard que filtran client-side sobre datos ya autorizados.
 */
export function useInstitutionTeachers(organizationId: string) {
  const { token } = useAuth()
  const [teachers, setTeachers] = useState<OrganizationMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token || !organizationId) return
    setLoading(true)
    setError(null)
    listOrganizationMembers(token, organizationId)
      .then((members) => setTeachers(members.filter((member) => member.orgRole === 'TEACHER')))
      .catch((err: unknown) => {
        setError(err instanceof ApiError ? err.message : 'No se pudieron cargar los profesores.')
      })
      .finally(() => setLoading(false))
  }, [token, organizationId])

  return { teachers, loading, error }
}
