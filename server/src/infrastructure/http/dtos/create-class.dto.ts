import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateClassDto {
  @IsString()
  @MinLength(3)
  @MaxLength(80)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  description?: string;

  /** Organización a la que se asocia la clase (issue #106, CA1.1). Opcional. */
  @IsOptional()
  @IsString()
  organizationId?: string;
}
