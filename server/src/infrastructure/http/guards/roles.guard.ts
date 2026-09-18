import { CanActivate, ExecutionContext, ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '../../../domain/ports/user.repository.port.js';
import {
  ORGANIZATION_REPOSITORY,
  type OrganizationRepository,
} from '../../../domain/ports/organization.repository.port.js';
import type { RoleName } from '../../../domain/value-objects/role.vo.js';
import type { OrganizationRoleName } from '../../../domain/value-objects/organization-role.vo.js';
import {
  ORGANIZATION_ROLES_METADATA_KEY,
  ROLES_METADATA_KEY,
} from '../decorators/roles.decorator.js';
import type { AuthenticatedRequest } from './jwt-auth.guard.js';

/**
 * Guard declarativo de autorización por rol. Reemplaza la resolución manual
 * que antes vivía dentro de cada use-case (`RequesterAdminResolver` inline en
 * `list-all-organizations`, `requestingUser.canManageUsers()` en
 * `list-users`) — issue #101.
 *
 * Debe correr **después** de `JwtAuthGuard` (necesita `request.userId` ya
 * resuelto). Resuelve el rol contra BD en cada request, igual criterio que el
 * resto de la autorización del repo: nunca confiar en el claim del JWT.
 *
 * Soporta dos ejes, combinables u opcionales:
 * - `@Roles(...)`: rol global de plataforma.
 * - `@OrganizationRoles(...)`: rol dentro de la membresía de una organización,
 *   resuelta contra el param `:organizationId` de la ruta.
 *
 * Si un endpoint no declara ningún decorator, el guard deja pasar (no es un
 * guard "deny by default" — esa semántica ya la cubre `JwtAuthGuard` para
 * "requiere estar autenticado"; este guard solo añade la capa de rol).
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly organizationRepository: OrganizationRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<RoleName[] | undefined>(
      ROLES_METADATA_KEY,
      [context.getHandler(), context.getClass()],
    );
    const requiredOrgRoles = this.reflector.getAllAndOverride<
      OrganizationRoleName[] | undefined
    >(ORGANIZATION_ROLES_METADATA_KEY, [context.getHandler(), context.getClass()]);

    if (!requiredRoles?.length && !requiredOrgRoles?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const requestingUserId = request.userId;

    if (requiredRoles?.length) {
      const user = await this.userRepository.findById(requestingUserId);
      if (!user || !requiredRoles.includes(user.role.getName())) {
        throw new ForbiddenException('No tiene el rol requerido para realizar esta acción.');
      }
    }

    if (requiredOrgRoles?.length) {
      const organizationId = request.params.organizationId as string | undefined;
      if (!organizationId) {
        throw new ForbiddenException(
          'La ruta no define :organizationId, no se puede resolver el rol de organización.',
        );
      }

      const membership = await this.organizationRepository.findMembership(
        organizationId,
        requestingUserId,
      );

      if (!membership || !requiredOrgRoles.includes(membership.orgRole.getName())) {
        throw new ForbiddenException(
          'No tiene el rol de organización requerido para realizar esta acción.',
        );
      }
    }

    return true;
  }
}
