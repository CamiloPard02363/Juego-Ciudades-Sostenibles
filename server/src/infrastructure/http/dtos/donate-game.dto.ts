import { IsString } from 'class-validator';

export class DonateGameDto {
  @IsString()
  organizationId!: string;
}
