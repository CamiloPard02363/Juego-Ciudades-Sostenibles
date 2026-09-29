import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ServiceUnavailableException } from '@nestjs/common';
import { InvalidGameContentError } from '../../domain/errors/game.errors.js';
import { GroqContentAssistant } from './groq-content-assistant.adapter.js';

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  } as unknown as Response;
}

describe('GroqContentAssistant', () => {
  const originalApiKey = process.env.GROQ_API_KEY;
  const originalMaxRpm = process.env.GROQ_MAX_RPM;

  beforeEach(() => {
    process.env.GROQ_API_KEY = 'test-key';
    // Sin límite realista de por medio: cada test dispara pocas llamadas.
    process.env.GROQ_MAX_RPM = '1000';
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    if (originalApiKey === undefined) delete process.env.GROQ_API_KEY;
    else process.env.GROQ_API_KEY = originalApiKey;
    if (originalMaxRpm === undefined) delete process.env.GROQ_MAX_RPM;
    else process.env.GROQ_MAX_RPM = originalMaxRpm;
  });

  it('falla con ServiceUnavailableException si no hay GROQ_API_KEY configurada', async () => {
    delete process.env.GROQ_API_KEY;
    const assistant = new GroqContentAssistant();

    await expect(assistant.describeImage({ buffer: Buffer.from(''), mimeType: 'image/png' })).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(fetch).not.toHaveBeenCalled();
  });

  it('describeImage manda la imagen como data URL y devuelve el texto de la respuesta', async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ choices: [{ message: { content: '  texto extraído  ' } }] }),
    );
    const assistant = new GroqContentAssistant();

    const result = await assistant.describeImage({ buffer: Buffer.from('img-bytes'), mimeType: 'image/png' });

    expect(result).toBe('texto extraído');
    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe('https://api.groq.com/openai/v1/chat/completions');
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.messages[0].content[1].image_url.url).toContain('data:image/png;base64,');
    expect((init as RequestInit).headers).toMatchObject({ Authorization: 'Bearer test-key' });
  });

  it('generateGameDraft pide response_format json_object y parsea la respuesta', async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({
        choices: [{ message: { content: JSON.stringify({ config: { a: 1 }, content: [1, 2] }) } }],
      }),
    );
    const assistant = new GroqContentAssistant();

    const result = await assistant.generateGameDraft({
      gameType: 'MEMORY_MATCH',
      sourceText: 'texto fuente',
      instructions: 'instrucciones',
    });

    expect(result).toEqual({ config: { a: 1 }, content: [1, 2] });
    const [, init] = vi.mocked(fetch).mock.calls[0];
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.response_format).toEqual({ type: 'json_object' });
  });

  it('lanza InvalidGameContentError si la IA responde JSON inválido', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ choices: [{ message: { content: 'no es json' } }] }));
    const assistant = new GroqContentAssistant();

    await expect(
      assistant.generateGameDraft({ gameType: 'MEMORY_MATCH', sourceText: 'x', instructions: 'y' }),
    ).rejects.toBeInstanceOf(InvalidGameContentError);
  });

  it('envuelve un error HTTP no-ok en ServiceUnavailableException', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ error: 'rate limited' }, false, 429));
    const assistant = new GroqContentAssistant();

    await expect(
      assistant.generateGameDraft({ gameType: 'MEMORY_MATCH', sourceText: 'x', instructions: 'y' }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('envuelve un error de red en ServiceUnavailableException', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('network down'));
    const assistant = new GroqContentAssistant();

    await expect(
      assistant.describeImage({ buffer: Buffer.from(''), mimeType: 'image/png' }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
