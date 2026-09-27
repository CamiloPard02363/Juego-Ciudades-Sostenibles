import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

/**
 * Paginado y filtro del catálogo de tipos de juego (issue #156, vista con
 * flecha en vez de scroll + filtro Activos/Archivados/Todos para ADMIN).
 */
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

  @IsOptional()
  @IsIn(['ACTIVE', 'ARCHIVED', 'ALL'])
  statusFilter?: 'ACTIVE' | 'ARCHIVED' | 'ALL';

  @IsOptional()
  @IsString()
  search?: string;
}
