import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RateLimiter } from './rate-limiter.js';

/**
 * Extraído de `GeminiContentAssistant` (issue #204) para que `GroqContentAssistant`
 * (y cualquier proveedor futuro) lo reuse sin duplicar la lógica de throttle.
 * Este spec cubre el primitivo genérico; `gemini-content-assistant.adapter.spec.ts`
 * sigue cubriendo que Gemini lo conecta bien a su propia variable de entorno.
 */
describe('RateLimiter', () => {
  const ENV_VAR = 'TEST_RATE_LIMITER_MAX_RPM';
  const original = process.env[ENV_VAR];

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    if (original === undefined) delete process.env[ENV_VAR];
    else process.env[ENV_VAR] = original;
    delete process.env[ENV_VAR];
  });

  it('deja pasar hasta el límite configurado sin esperar', async () => {
    process.env[ENV_VAR] = '3';
    const limiter = new RateLimiter(ENV_VAR, 5);

    const resolved = await Promise.all(Array.from({ length: 3 }, () => limiter.throttle().then(() => true)));

    expect(resolved).toEqual([true, true, true]);
  });

  it('espacia la llamada que excede el límite hasta que se libera la ventana', async () => {
    const limiter = new RateLimiter(ENV_VAR, 2);

    await Promise.all(Array.from({ length: 2 }, () => limiter.throttle()));

    let thirdResolved = false;
    const third = limiter.throttle().then(() => {
      thirdResolved = true;
    });

    await vi.advanceTimersByTimeAsync(59_000);
    expect(thirdResolved).toBe(false);

    await vi.advanceTimersByTimeAsync(2_000);
    await third;
    expect(thirdResolved).toBe(true);
  });

  it('usa el default cuando la variable de entorno no está configurada o es inválida', async () => {
    process.env[ENV_VAR] = 'no-es-un-numero';
    const limiter = new RateLimiter(ENV_VAR, 4);

    const resolved = await Promise.all(Array.from({ length: 4 }, () => limiter.throttle().then(() => true)));

    expect(resolved).toEqual([true, true, true, true]);
  });
});
