import { IsIn } from 'class-validator';

export class ChangeOrganizationMemberRoleDto {
  /**
   * Formato de transporte: la validación real de que sea uno de los tres
   * valores válidos la hace `OrganizationRole.create()` en el dominio (mismo
   * criterio que `AddOrganizationMemberDto.orgRole`).
   */
  @IsIn(['STUDENT', 'TEACHER', 'ADMIN'])
  orgRole!: string;
}
