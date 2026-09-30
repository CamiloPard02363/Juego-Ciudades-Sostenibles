/** Qué operación del puerto `AiContentAssistant` se intentó. */
export type AiProviderOperation = 'describeImage' | 'generateGameDraft';

export interface AiProviderAttemptProps {
  id: string;
  /** Nombre corto del proveedor tal como aparece en la cadena de fallback (ver `AiProviderOrchestrator`), ej. "gemini", "groq". */
  provider: string;
  operation: AiProviderOperation;
  succeeded: boolean;
  /** true si NO fue el primer proveedor de la cadena el que respondió (issue #204). */
  usedFallback: boolean;
  errorMessage: string | null;
  latencyMs: number;
  createdAt: Date;
}

/**
 * Registro crudo de un intento de llamada a un proveedor de IA — sin lógica
 * más allá de sus datos (mismo criterio que `AnalyticsEvent`). Solo lo
 * consumen `AiProviderAttemptTracker` (al escribir) y el panel de
 * administración de IA (al leer), nunca el flujo de generación en sí.
 */
export class AiProviderAttempt {
  private constructor(private readonly props: AiProviderAttemptProps) {}

  static create(props: Omit<AiProviderAttemptProps, 'id' | 'createdAt'>): AiProviderAttempt {
    return new AiProviderAttempt({
      ...props,
      id: crypto.randomUUID(),
      createdAt: new Date(),
    });
  }

  static fromPersistence(props: AiProviderAttemptProps): AiProviderAttempt {
    return new AiProviderAttempt(props);
  }

  get id(): string {
    return this.props.id;
  }

  get provider(): string {
    return this.props.provider;
  }

  get operation(): AiProviderOperation {
    return this.props.operation;
  }

  get succeeded(): boolean {
    return this.props.succeeded;
  }

  get usedFallback(): boolean {
    return this.props.usedFallback;
  }

  get errorMessage(): string | null {
    return this.props.errorMessage;
  }

  get latencyMs(): number {
    return this.props.latencyMs;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }
}
