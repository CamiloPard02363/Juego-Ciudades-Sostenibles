import type { AiProviderAttempt } from '../entities/ai-provider-attempt.entity.js';

export const AI_PROVIDER_ATTEMPT_REPOSITORY = Symbol('AI_PROVIDER_ATTEMPT_REPOSITORY');

export interface FindRecentAiProviderAttemptsInput {
  page: number;
  pageSize: number;
}

export interface FindRecentAiProviderAttemptsOutput {
  items: AiProviderAttempt[];
  total: number;
}

export interface AiProviderAttemptRepository {
  save(attempt: AiProviderAttempt): Promise<void>;
  /** Más recientes primero — es lo único que le importa al panel de administración. */
  findRecent(input: FindRecentAiProviderAttemptsInput): Promise<FindRecentAiProviderAttemptsOutput>;
}
