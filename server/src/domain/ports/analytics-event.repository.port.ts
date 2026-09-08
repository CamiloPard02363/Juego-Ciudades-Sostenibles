import { AnalyticsEvent } from '../entities/analytics-event.entity.js';

export const ANALYTICS_EVENT_REPOSITORY = Symbol('ANALYTICS_EVENT_REPOSITORY');

export interface AnalyticsEventRepository {
  save(event: AnalyticsEvent): Promise<void>;
}
