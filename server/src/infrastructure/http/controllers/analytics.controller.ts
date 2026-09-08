import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { AnalyticsTrackerService } from '../../../application/services/analytics-tracker.service.js';
import { JwtAuthGuard } from '../guards/jwt-auth.guard.js';
import { CurrentUserId } from '../decorators/current-user-id.decorator.js';
import { TrackEventDto } from '../dtos/track-event.dto.js';

@Controller('analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(private readonly tracker: AnalyticsTrackerService) {}

  @Post('events')
  @HttpCode(HttpStatus.NO_CONTENT)
  async track(@CurrentUserId() userId: string, @Body() dto: TrackEventDto) {
    await this.tracker.track({
      type: dto.type,
      userId,
      gameId: dto.gameId,
      metadata: dto.metadata,
    });
  }
}
