import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  AI_PROVIDER_ATTEMPT_REPOSITORY,
  type AiProviderAttemptRepository,
} from '../../domain/ports/ai-provider-attempt.repository.port.js';
import { AiProviderAttempt, type AiProviderOperation } from '../../domain/entities/ai-provider-attempt.entity.js';

export interface RecordAiProviderAttemptInput {
  provider: string;
  operation: AiProviderOperation;
  succeeded: boolean;
  usedFallback: boolean;
  errorMessage?: string | null;
  latencyMs: number;
}

/**
 * Único punto de entrada para registrar un intento de llamada a un proveedor
 * de IA (issue #204). Lo usa `AiProviderOrchestrator` en cada intento
 * (éxito o falla) para que el panel de administración de IA pueda ver, sin
 * acceso a logs del servidor, si Gemini está fallando y Groq lo está
 * cubriendo. Nunca debe romper la generación del juego si el guardado falla.
 */
@Injectable()
export class AiProviderAttemptTracker {
  private readonly logger = new Logger(AiProviderAttemptTracker.name);

  constructor(
    @Inject(AI_PROVIDER_ATTEMPT_REPOSITORY)
    private readonly repository: AiProviderAttemptRepository,
  ) {}

  async record(input: RecordAiProviderAttemptInput): Promise<void> {
    const attempt = AiProviderAttempt.create({
      provider: input.provider,
      operation: input.operation,
      succeeded: input.succeeded,
      usedFallback: input.usedFallback,
      errorMessage: input.errorMessage ?? null,
      latencyMs: input.latencyMs,
    });

    try {
      await this.repository.save(attempt);
    } catch (error) {
      this.logger.warn(
        `No se pudo guardar el intento de IA (proveedor "${input.provider}")`,
        error as Error,
      );
    }
  }
}
