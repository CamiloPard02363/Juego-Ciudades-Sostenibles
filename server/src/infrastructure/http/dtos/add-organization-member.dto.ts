import { IsEmail, IsIn } from 'class-validator';

export class AddOrganizationMemberDto {
  /**
   * `Email.create()` en el dominio hace la validación real, pero `@IsEmail`
   * evita un 500 innecesario si llega basura y da un 400 más claro (mismo
   * razonamiento que `@IsIn` en `orgRole`).
   */
  @IsEmail()
  email!: string;

  /**
   * Formato de transporte: la validación real de que sea uno de los tres
   * valores válidos la hace `OrganizationRole.create()` en el dominio, pero
   * `@IsIn` evita un 500 innecesario si llega basura y da un 400 más claro.
   */
  @IsIn(['STUDENT', 'TEACHER', 'ADMIN'])
  orgRole!: string;
}
