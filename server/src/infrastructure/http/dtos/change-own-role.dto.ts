import { IsIn } from 'class-validator';

export class ChangeOwnRoleDto {
  @IsIn(['STUDENT', 'TEACHER'])
  newRole!: string;
}
