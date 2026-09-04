import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class ListGamesQueryDto {
  @IsOptional()
  @IsIn(['DRAFT', 'PUBLISHED', 'FLAGGED', 'REMOVED'])
  status?: 'DRAFT' | 'PUBLISHED' | 'FLAGGED' | 'REMOVED';

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  onlyMine?: boolean;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

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
