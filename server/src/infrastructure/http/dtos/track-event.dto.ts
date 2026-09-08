import { IsIn, IsObject, IsOptional, IsString } from 'class-validator';

const CLIENT_EVENT_TYPES = ['game_opened', 'section_viewed'] as const;

export class TrackEventDto {
  @IsIn(CLIENT_EVENT_TYPES)
  type: (typeof CLIENT_EVENT_TYPES)[number];

  @IsOptional()
  @IsString()
  gameId?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
