import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GeminiContentAssistant } from './gemini-content-assistant.adapter.js';

/**
 * Solo cubre `throttle()` — la pieza que evita que "¿Quién Es?"/"Pares"
 * disparen una llamada a Gemini por imagen todas de golpe y revienten la
 * cuota gratuita (5/min) al instante. El resto de la clase habla con la API
 * real de Google y no tiene sentido mockear el SDK completo acá.
 */
describe('GeminiContentAssistant.throttle', () => {
  const originalMaxRpm = process.env.GOOGLE_IA_STUDIO_MAX_RPM;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    if (originalMaxRpm === undefined) delete process.env.GOOGLE_IA_STUDIO_MAX_RPM;
    else process.env.GOOGLE_IA_STUDIO_MAX_RPM = originalMaxRpm;
  });

  function throttleOf(assistant: GeminiContentAssistant): () => Promise<void> {
    // `throttle` es privado — se accede vía cast solo para el test, la clase
    // no expone (ni debe exponer) esto como API pública.
    return (assistant as unknown as { throttle: () => Promise<void> }).throttle.bind(assistant);
  }

  it('deja pasar hasta el límite configurado sin esperar', async () => {
    process.env.GOOGLE_IA_STUDIO_MAX_RPM = '5';
    const assistant = new GeminiContentAssistant();
    const throttle = throttleOf(assistant);

    const resolved = await Promise.all(
      Array.from({ length: 5 }, () => throttle().then(() => true)),
    );

    expect(resolved).toEqual([true, true, true, true, true]);
  });

  it('espacia la llamada que excede el límite hasta que se libera la ventana de 60s', async () => {
    process.env.GOOGLE_IA_STUDIO_MAX_RPM = '5';
    const assistant = new GeminiContentAssistant();
    const throttle = throttleOf(assistant);

    await Promise.all(Array.from({ length: 5 }, () => throttle()));

    let sixthResolved = false;
    const sixth = throttle().then(() => {
      sixthResolved = true;
    });

    // Con las 5 primeras "ocupando" el minuto, la 6ª no debe resolver aún.
    await vi.advanceTimersByTimeAsync(59_000);
    expect(sixthResolved).toBe(false);

    // Pasado el minuto completo (+ el margen de 250ms del throttle), sí.
    await vi.advanceTimersByTimeAsync(2_000);
    await sixth;
    expect(sixthResolved).toBe(true);
  });

  it('usa GOOGLE_IA_STUDIO_MAX_RPM en vez del default cuando está configurado', async () => {
    process.env.GOOGLE_IA_STUDIO_MAX_RPM = '2';
    const assistant = new GeminiContentAssistant();
    const throttle = throttleOf(assistant);

    await Promise.all(Array.from({ length: 2 }, () => throttle()));

    let thirdResolved = false;
    const third = throttle().then(() => {
      thirdResolved = true;
    });

    await vi.advanceTimersByTimeAsync(500);
    expect(thirdResolved).toBe(false);

    await vi.advanceTimersByTimeAsync(60_500);
    await third;
    expect(thirdResolved).toBe(true);
  });

  it('ignora un GOOGLE_IA_STUDIO_MAX_RPM inválido y usa el default (5)', async () => {
    process.env.GOOGLE_IA_STUDIO_MAX_RPM = 'no-es-un-numero';
    const assistant = new GeminiContentAssistant();
    const throttle = throttleOf(assistant);

    const resolved = await Promise.all(
      Array.from({ length: 5 }, () => throttle().then(() => true)),
    );

    expect(resolved).toEqual([true, true, true, true, true]);
  });
});
