import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';

/** Query param compartido de `GET /classes/mine`, `/mine/detail` y `/enrolled` (issue #133, CA-E4). */
export class ListClassesQueryDto {
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  includeInactive?: boolean;
}
