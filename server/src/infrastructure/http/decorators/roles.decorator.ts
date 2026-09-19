import { SetMetadata } from '@nestjs/common';
import type { RoleName } from '../../../domain/value-objects/role.vo.js';
import type { OrganizationRoleName } from '../../../domain/value-objects/organization-role.vo.js';

export const ROLES_METADATA_KEY = 'roles';
export const ORGANIZATION_ROLES_METADATA_KEY = 'organizationRoles';

/**
 * Declara qué `Role` global de plataforma puede llamar el endpoint. Se
 * resuelve contra BD por `RolesGuard` (mismo criterio que
 * `RequesterAdminResolver`: nunca confiar en el claim del JWT).
 *
 * Uso: `@Roles(Role.admin().getName())` o `@Roles('ADMIN')`.
 */
export const Roles = (...roles: RoleName[]) => SetMetadata(ROLES_METADATA_KEY, roles);

/**
 * Declara qué `OrganizationRole` (rol dentro de la membresía) puede llamar el
 * endpoint. Requiere que la ruta tenga un param `:organizationId` (o el que
 * se indique en `paramName`) — `RolesGuard` resuelve la membresía del
 * solicitante contra esa organización concreta.
 *
 * Uso: `@OrganizationRoles('ADMIN')` sobre una ruta `organizations/:organizationId/...`.
 */
export const OrganizationRoles = (...roles: OrganizationRoleName[]) =>
  SetMetadata(ORGANIZATION_ROLES_METADATA_KEY, roles);
