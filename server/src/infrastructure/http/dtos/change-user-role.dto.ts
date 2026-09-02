import { IsIn } from 'class-validator';

export class ChangeUserRoleDto {
  @IsIn(['STUDENT', 'TEACHER', 'ADMIN'])
  newRole!: string;
}
