import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class ListUsersQueryDto {
  @IsOptional()
  @IsIn(['STUDENT', 'TEACHER', 'ADMIN'])
  role?: 'STUDENT' | 'TEACHER' | 'ADMIN';

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isActive?: boolean;

  /** Substring case-insensitive contra nombre o email (issue #106, CA2.1). */
  @IsOptional()
  @IsString()
  search?: string;

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
