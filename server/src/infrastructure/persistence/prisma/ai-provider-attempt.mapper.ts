import type { AiProviderAttemptModel } from '../../../generated/prisma/client.js';
import { AiProviderAttempt, type AiProviderOperation } from '../../../domain/entities/ai-provider-attempt.entity.js';

export class AiProviderAttemptMapper {
  static toDomain(record: AiProviderAttemptModel): AiProviderAttempt {
    return AiProviderAttempt.fromPersistence({
      id: record.id,
      provider: record.provider,
      operation: record.operation as AiProviderOperation,
      succeeded: record.succeeded,
      usedFallback: record.usedFallback,
      errorMessage: record.errorMessage,
      latencyMs: record.latencyMs,
      createdAt: record.createdAt,
    });
  }
}
