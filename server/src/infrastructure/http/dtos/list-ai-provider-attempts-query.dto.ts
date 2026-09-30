import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

/** Paginado del historial de intentos de IA (issue #204, panel de administración). */
export class ListAiProviderAttemptsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number;
}
