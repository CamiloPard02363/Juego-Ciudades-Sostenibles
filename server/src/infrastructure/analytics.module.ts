import { Module } from '@nestjs/common';
import { UserModule } from './user.module.js';
import { ANALYTICS_EVENT_REPOSITORY } from '../domain/ports/analytics-event.repository.port.js';
import { MongoService } from './persistence/mongo/mongo.service.js';
import { MongoAnalyticsEventRepository } from './persistence/mongo/mongo-analytics-event.repository.js';
import { AnalyticsTrackerService } from '../application/services/analytics-tracker.service.js';
import { AnalyticsController } from './http/controllers/analytics.controller.js';

@Module({
  imports: [UserModule],
  controllers: [AnalyticsController],
  providers: [
    MongoService,
    { provide: ANALYTICS_EVENT_REPOSITORY, useClass: MongoAnalyticsEventRepository },
    AnalyticsTrackerService,
  ],
  exports: [AnalyticsTrackerService],
})
export class AnalyticsModule {}
