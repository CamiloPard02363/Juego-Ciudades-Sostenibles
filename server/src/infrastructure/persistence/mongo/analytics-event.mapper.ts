import { AnalyticsEvent, type AnalyticsEventType } from '../../../domain/entities/analytics-event.entity.js';

export interface AnalyticsEventDocument {
  _id: string;
  type: AnalyticsEventType;
  userId: string;
  gameId: string | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

export const AnalyticsEventMapper = {
  toDomain(doc: AnalyticsEventDocument): AnalyticsEvent {
    return AnalyticsEvent.fromPersistence({
      id: doc._id,
      type: doc.type,
      userId: doc.userId,
      gameId: doc.gameId,
      metadata: doc.metadata,
      createdAt: doc.createdAt,
    });
  },

  toPersistence(event: AnalyticsEvent): AnalyticsEventDocument {
    return {
      _id: event.id,
      type: event.type,
      userId: event.userId,
      gameId: event.gameId,
      metadata: event.metadata,
      createdAt: event.createdAt,
    };
  },
};
