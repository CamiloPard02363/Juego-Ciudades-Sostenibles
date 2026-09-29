import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import type {
  AiContentAssistant,
  DescribeImageInput,
  GenerateGameDraftInput,
  GenerateGameDraftOutput,
} from '../../domain/ports/ai-content-assistant.port.js';
import type { AiProviderOperation } from '../../domain/entities/ai-provider-attempt.entity.js';
import type { AiProviderAttemptTracker } from '../../application/services/ai-provider-attempt-tracker.service.js';

export interface AiProviderChainEntry {
  /** Nombre corto y estable — es lo que queda guardado en cada intento y lo que ve el admin. */
  name: string;
  assistant: AiContentAssistant;
}

/**
 * Implementa `AiContentAssistant` igual que cualquier proveedor concreto, así
 * que ni `GenerateGameDraftUseCase` ni el resto de la aplicación saben que
 * hay más de un proveedor detrás — reciben esta clase por el mismo token
 * `AI_CONTENT_ASSISTANT` (ver `game.module.ts`).
 *
 * Prueba cada proveedor de `chain`, en orden, hasta que uno responda. Si el
 * primero falla (cuota agotada, red, key inválida), cae al siguiente sin que
 * el usuario note nada más que una respuesta un poco más lenta — issue #204.
 * Agregar un proveedor nuevo el día de mañana es: escribir su adaptador
 * (implementa `AiContentAssistant`), registrarlo en `game.module.ts` y
 * agregarlo a `chain` (o a `AI_PROVIDER_ORDER` en el entorno) — nada acá
 * cambia.
 *
 * Cada intento (éxito o falla, de cualquier proveedor) se registra vía
 * `AiProviderAttemptTracker` para que el panel de administración de IA
 * pueda ver la salud de cada proveedor sin acceso a logs del servidor. Un
 * fallo al registrar nunca debe tumbar la generación real.
 */
@Injectable()
export class AiProviderOrchestrator implements AiContentAssistant {
  private readonly logger = new Logger(AiProviderOrchestrator.name);

  constructor(
    private readonly chain: AiProviderChainEntry[],
    private readonly tracker: AiProviderAttemptTracker,
  ) {
    if (chain.length === 0) {
      throw new Error('AiProviderOrchestrator necesita al menos un proveedor en la cadena.');
    }
  }

  async describeImage(input: DescribeImageInput): Promise<string> {
    return this.runWithFallback('describeImage', (assistant) => assistant.describeImage(input));
  }

  async generateGameDraft(input: GenerateGameDraftInput): Promise<GenerateGameDraftOutput> {
    return this.runWithFallback('generateGameDraft', (assistant) => assistant.generateGameDraft(input));
  }

  private async runWithFallback<T>(
    operation: AiProviderOperation,
    call: (assistant: AiContentAssistant) => Promise<T>,
  ): Promise<T> {
    let lastError: unknown;

    for (let index = 0; index < this.chain.length; index += 1) {
      const { name, assistant } = this.chain[index];
      const usedFallback = index > 0;
      const startedAt = Date.now();

      try {
        const result = await call(assistant);
        await this.tracker.record({
          provider: name,
          operation,
          succeeded: true,
          usedFallback,
          latencyMs: Date.now() - startedAt,
        });
        if (usedFallback) {
          this.logger.warn(`"${operation}" se resolvió con el proveedor de respaldo "${name}".`);
        }
        return result;
      } catch (error) {
        lastError = error;
        const reason = error instanceof Error ? error.message : String(error);
        await this.tracker.record({
          provider: name,
          operation,
          succeeded: false,
          usedFallback,
          errorMessage: reason,
          latencyMs: Date.now() - startedAt,
        });
        this.logger.warn(`Proveedor "${name}" falló en "${operation}": ${reason}`);
      }
    }

    if (lastError instanceof Error) throw lastError;
    throw new ServiceUnavailableException('Ningún proveedor de IA pudo responder.');
  }
}
