import { Injectable, type OnModuleInit } from '@nestjs/common';
import type { AnalyticsEventRepository } from '../../../domain/ports/analytics-event.repository.port.js';
import type { AnalyticsEvent } from '../../../domain/entities/analytics-event.entity.js';
import { MongoService } from './mongo.service.js';
import { AnalyticsEventMapper, type AnalyticsEventDocument } from './analytics-event.mapper.js';

const COLLECTION = 'analytics_events';

@Injectable()
export class MongoAnalyticsEventRepository implements AnalyticsEventRepository, OnModuleInit {
  constructor(private readonly mongo: MongoService) {}

  private get collection() {
    return this.mongo.collection<AnalyticsEventDocument>(COLLECTION);
  }

  /** Índices para las consultas de BI típicas: por tipo+fecha y por juego. */
  async onModuleInit(): Promise<void> {
    await this.collection.createIndex({ type: 1, createdAt: -1 });
    await this.collection.createIndex({ gameId: 1 });
  }

  async save(event: AnalyticsEvent): Promise<void> {
    await this.collection.insertOne(AnalyticsEventMapper.toPersistence(event));
  }
}
