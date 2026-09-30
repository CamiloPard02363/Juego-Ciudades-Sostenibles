import { describe, expect, it, vi } from 'vitest';
import type { AiContentAssistant } from '../../domain/ports/ai-content-assistant.port.js';
import type { AiProviderAttemptTracker } from '../../application/services/ai-provider-attempt-tracker.service.js';
import { AiProviderOrchestrator } from './ai-provider-orchestrator.js';

function fakeAssistant(overrides: Partial<AiContentAssistant> = {}): AiContentAssistant {
  return {
    describeImage: vi.fn().mockResolvedValue('descripción'),
    generateGameDraft: vi.fn().mockResolvedValue({ config: {}, content: [] }),
    ...overrides,
  };
}

function fakeTracker(): AiProviderAttemptTracker {
  return { record: vi.fn().mockResolvedValue(undefined) } as unknown as AiProviderAttemptTracker;
}

describe('AiProviderOrchestrator', () => {
  it('usa el primer proveedor sin marcar fallback cuando responde bien', async () => {
    const gemini = fakeAssistant();
    const groq = fakeAssistant();
    const tracker = fakeTracker();
    const orchestrator = new AiProviderOrchestrator(
      [{ name: 'gemini', assistant: gemini }, { name: 'groq', assistant: groq }],
      tracker,
    );

    const result = await orchestrator.describeImage({ buffer: Buffer.from(''), mimeType: 'image/png' });

    expect(result).toBe('descripción');
    expect(gemini.describeImage).toHaveBeenCalledTimes(1);
    expect(groq.describeImage).not.toHaveBeenCalled();
    expect(tracker.record).toHaveBeenCalledWith(
      expect.objectContaining({ provider: 'gemini', operation: 'describeImage', succeeded: true, usedFallback: false }),
    );
  });

  it('cae al segundo proveedor si el primero falla, y registra ambos intentos', async () => {
    const gemini = fakeAssistant({ generateGameDraft: vi.fn().mockRejectedValue(new Error('cuota agotada')) });
    const groq = fakeAssistant();
    const tracker = fakeTracker();
    const orchestrator = new AiProviderOrchestrator(
      [{ name: 'gemini', assistant: gemini }, { name: 'groq', assistant: groq }],
      tracker,
    );

    const result = await orchestrator.generateGameDraft({
      gameType: 'MEMORY_MATCH',
      sourceText: 'texto',
      instructions: 'instrucciones',
    });

    expect(result).toEqual({ config: {}, content: [] });
    expect(groq.generateGameDraft).toHaveBeenCalledTimes(1);
    expect(tracker.record).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'gemini',
        succeeded: false,
        usedFallback: false,
        errorMessage: 'cuota agotada',
      }),
    );
    expect(tracker.record).toHaveBeenCalledWith(
      expect.objectContaining({ provider: 'groq', succeeded: true, usedFallback: true }),
    );
  });

  it('lanza el último error si todos los proveedores fallan', async () => {
    const gemini = fakeAssistant({ describeImage: vi.fn().mockRejectedValue(new Error('falla gemini')) });
    const groq = fakeAssistant({ describeImage: vi.fn().mockRejectedValue(new Error('falla groq')) });
    const tracker = fakeTracker();
    const orchestrator = new AiProviderOrchestrator(
      [{ name: 'gemini', assistant: gemini }, { name: 'groq', assistant: groq }],
      tracker,
    );

    await expect(
      orchestrator.describeImage({ buffer: Buffer.from(''), mimeType: 'image/png' }),
    ).rejects.toThrow('falla groq');
    expect(tracker.record).toHaveBeenCalledTimes(2);
  });

  it('rechaza construirse sin ningún proveedor en la cadena', () => {
    expect(() => new AiProviderOrchestrator([], fakeTracker())).toThrow();
  });
});
