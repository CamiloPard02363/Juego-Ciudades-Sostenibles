import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  ANALYTICS_EVENT_REPOSITORY,
  type AnalyticsEventRepository,
} from '../../domain/ports/analytics-event.repository.port.js';
import { AnalyticsEvent, type AnalyticsEventType } from '../../domain/entities/analytics-event.entity.js';

export interface TrackEventInput {
  type: AnalyticsEventType;
  userId: string;
  gameId?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Único punto de entrada para registrar eventos de analítica. Se apaga por
 * completo con `ANALYTICS_ENABLED=false` (o ausente) para no gastar cuota de
 * Mongo mientras el proyecto está en pruebas — en ese caso `track()` no
 * llega a tocar la base de datos.
 */
@Injectable()
export class AnalyticsTrackerService {
  private readonly logger = new Logger(AnalyticsTrackerService.name);
  private readonly enabled = process.env.ANALYTICS_ENABLED === 'true';

  constructor(
    @Inject(ANALYTICS_EVENT_REPOSITORY) private readonly repository: AnalyticsEventRepository,
  ) {}

  async track(input: TrackEventInput): Promise<void> {
    if (!this.enabled) return;

    const event = AnalyticsEvent.create({
      type: input.type,
      userId: input.userId,
      gameId: input.gameId ?? null,
      metadata: input.metadata ?? {},
    });

    // No debe romper el flujo principal si falla el guardado de una métrica.
    try {
      await this.repository.save(event);
    } catch (error) {
      this.logger.warn(`No se pudo guardar el evento de analítica "${input.type}"`, error as Error);
    }
  }
}
