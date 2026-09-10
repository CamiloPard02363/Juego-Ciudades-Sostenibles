import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateOrganizationDto {
  @IsString()
  @MinLength(3)
  name!: string;

  /**
   * Dominio de correo a reclamar (ej. "colegio.edu.co"). Opcional: una
   * organización sin dominio simplemente no hace auto-join. El formato lo
   * valida `EmailDomain` en el dominio, no este DTO de transporte.
   */
  @IsOptional()
  @IsString()
  domain?: string | null;
}
