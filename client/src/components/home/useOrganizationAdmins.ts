import { useEffect, useState } from 'react'
import { listOrganizationMembers, type Organization } from '../../services/organization.service'

type AdminInfo = { displayName: string | null; email: string | null }

/**
 * Resuelve el admin (orgRole = ADMIN) de cada organización visible en la
 * página actual, para pintarlo en `OrganizationCard` (issue #226, cards del
 * ADMIN global). Sin endpoint batch de backend todavía — el volumen es
 * acotado porque solo se resuelve la página visible (10 orgs por `ALL_ORGS_PAGE_SIZE`),
 * no la plataforma completa. Si una organización no tiene ningún ADMIN
 * matriculado, queda `null`/`null` (ver `OrganizationCard`).
 */
export function useOrganizationAdmins(token: string | null, organizations: Organization[]) {
  const [adminsByOrgId, setAdminsByOrgId] = useState<Record<string, AdminInfo>>({})

  useEffect(() => {
    if (!token || organizations.length === 0) return
    let cancelled = false

    Promise.all(
      organizations.map((org) =>
        listOrganizationMembers(token, org.id)
          .then((members) => {
            const admin = members.find((member) => member.orgRole === 'ADMIN')
            return [
              org.id,
              { displayName: admin?.displayName ?? null, email: admin?.email ?? null },
            ] as const
          })
          .catch(() => [org.id, { displayName: null, email: null }] as const),
      ),
    ).then((entries) => {
      if (cancelled) return
      setAdminsByOrgId(Object.fromEntries(entries))
    })

    return () => {
      cancelled = true
    }
  }, [token, organizations])

  return adminsByOrgId
}
