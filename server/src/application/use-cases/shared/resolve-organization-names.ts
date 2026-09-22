import type { ClassEntity } from '../../../domain/entities/class.entity.js';
import type { OrganizationRepository } from '../../../domain/ports/organization.repository.port.js';

/**
 * Resuelve el nombre de la organización dueña de cada Class de una sola
 * pasada (issue #133, CA-D1) — evita N consultas al armar listados con varias
 * clases. Usa `findById` en un `Promise.all` sobre los ids únicos en vez de
 * una query `findAll` con filtro `in`: el port de `OrganizationRepository` no
 * expone ese método hoy y el volumen esperado (organizaciones distintas por
 * profesor/estudiante) es bajo.
 */
export async function resolveOrganizationNamesByClass(
  classes: ClassEntity[],
  organizationRepository: OrganizationRepository,
): Promise<Map<string, string>> {
  const organizationIds = [
    ...new Set(
      classes
        .map((classEntity) => classEntity.organizationId)
        .filter((id): id is string => id !== null),
    ),
  ];

  if (organizationIds.length === 0) {
    return new Map();
  }

  const organizations = await Promise.all(
    organizationIds.map((id) => organizationRepository.findById(id)),
  );

  const namesByOrgId = new Map<string, string>();
  organizations.forEach((organization, index) => {
    if (organization) {
      namesByOrgId.set(organizationIds[index], organization.name);
    }
  });

  return namesByOrgId;
}
