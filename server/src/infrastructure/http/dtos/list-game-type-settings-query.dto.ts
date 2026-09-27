import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

/** Paginado del catálogo de tipos de juego (issue #156, vista con flecha en vez de scroll). */
export class ListGameTypeSettingsQueryDto {
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
