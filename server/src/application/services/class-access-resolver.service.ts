import { Inject, Injectable } from '@nestjs/common';
import {
  ORGANIZATION_REPOSITORY,
  type OrganizationRepository,
} from '../../domain/ports/organization.repository.port.js';
import { RequesterAdminResolver } from './requester-admin-resolver.service.js';
import type { ClassEntity } from '../../domain/entities/class.entity.js';

/**
 * Única responsabilidad: decidir si un usuario puede ver/gestionar los datos
 * de una `Class` concreta. Centraliza la regla "OR entre ejes" (admin global
 * / admin de la institución dueña / profesor dueño de la clase) que antes
 * vivía duplicada dentro de cada use-case — issue #226 la necesita en varios
 * puntos nuevos (ranking de clase, juegos de clase, estudiantes de clase) y
 * no tenía sentido repetirla otra vez.
 */
@Injectable()
export class ClassAccessResolver {
  constructor(
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly organizationRepository: OrganizationRepository,
    private readonly requesterAdminResolver: RequesterAdminResolver,
  ) {}

  /** `true` si el usuario puede ver/gestionar la clase (como profesor dueño, admin de su institución, o admin global). */
  async canManage(classEntity: ClassEntity, requestingUserId: string): Promise<boolean> {
    if (classEntity.teacherUserId === requestingUserId) return true;

    const isPlatformAdmin = await this.requesterAdminResolver.resolve(requestingUserId);
    if (isPlatformAdmin) return true;

    if (!classEntity.organizationId) return false;

    const membership = await this.organizationRepository.findMembership(
      classEntity.organizationId,
      requestingUserId,
    );
    return membership?.isAdmin() ?? false;
  }
}
