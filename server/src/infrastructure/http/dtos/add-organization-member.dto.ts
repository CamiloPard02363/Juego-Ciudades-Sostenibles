import { IsIn, IsString } from 'class-validator';

export class AddOrganizationMemberDto {
  @IsString()
  email!: string;

  /**
   * Formato de transporte: la validación real de que sea uno de los tres
   * valores válidos la hace `OrganizationRole.create()` en el dominio, pero
   * `@IsIn` evita un 500 innecesario si llega basura y da un 400 más claro.
   */
  @IsIn(['STUDENT', 'TEACHER', 'ADMIN'])
  orgRole!: string;
}
