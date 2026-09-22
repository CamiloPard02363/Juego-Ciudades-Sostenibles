import { IsString, Length } from 'class-validator';

export class JoinOrganizationDto {
  @IsString()
  @Length(6, 6)
  inviteCode!: string;
}
