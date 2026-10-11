import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ServiceUnavailableException } from '@nestjs/common';
import { InvalidGameContentError } from '../../domain/errors/game.errors.js';
import { GroqContentAssistant } from './groq-content-assistant.adapter.js';

function jsonResponse(body: unknown, ok = true, status = 200, headers: Record<string, string> = {}): Response {
  return {
    ok,
    status,
    headers: new Headers(headers),
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  } as unknown as Response;
}

function completion(content: string, finishReason = 'stop') {
  return { choices: [{ message: { content }, finish_reason: finishReason }] };
}

function errorBody(message: string) {
  return { error: { message } };
}

function requestBody(callIndex = 0): Record<string, any> {
  const [, init] = vi.mocked(fetch).mock.calls[callIndex];
  return JSON.parse((init as RequestInit).body as string);
}

/** Sin esperas reales: los reintentos se registran pero no duermen. */
function instantAssistant() {
  const assistant = new GroqContentAssistant();
  const sleep = vi
    .spyOn(assistant as unknown as { sleep: (ms: number) => Promise<void> }, 'sleep')
    .mockResolvedValue(undefined);
  return { assistant, sleep };
}

const DRAFT_INPUT = { gameType: 'MEMORY_MATCH', sourceText: 'texto fuente', instructions: 'instrucciones' };

describe('GroqContentAssistant', () => {
  const touchedEnv = ['GROQ_API_KEY', 'GROQ_MAX_RPM', 'GROQ_MODEL', 'GROQ_VISION_MODEL', 'GROQ_MAX_REQUEST_TOKENS'] as const;
  const originalEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const name of touchedEnv) originalEnv[name] = process.env[name];
    process.env.GROQ_API_KEY = 'test-key';
    // Sin límite realista de por medio: cada test dispara pocas llamadas.
    process.env.GROQ_MAX_RPM = '1000';
    delete process.env.GROQ_MODEL;
    delete process.env.GROQ_VISION_MODEL;
    delete process.env.GROQ_MAX_REQUEST_TOKENS;
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    for (const name of touchedEnv) {
      if (originalEnv[name] === undefined) delete process.env[name];
      else process.env[name] = originalEnv[name];
    }
  });

  describe('configuración', () => {
    it('falla con ServiceUnavailableException si no hay GROQ_API_KEY configurada', async () => {
      delete process.env.GROQ_API_KEY;
      const assistant = new GroqContentAssistant();

      await expect(assistant.describeImage({ buffer: Buffer.from(''), mimeType: 'image/png' })).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
      await expect(assistant.generateGameDraft(DRAFT_INPUT)).rejects.toThrow(/GROQ_API_KEY/);
      expect(fetch).not.toHaveBeenCalled();
    });

    it('usa el modelo de texto por defecto y el de visión por defecto, cada uno en su operación', async () => {
      vi.mocked(fetch).mockResolvedValue(jsonResponse(completion('{"content":[]}')));
      const assistant = new GroqContentAssistant();

      await assistant.generateGameDraft(DRAFT_INPUT);
      await assistant.describeImage({ buffer: Buffer.from('x'), mimeType: 'image/png' });

      expect(requestBody(0).model).toBe('openai/gpt-oss-120b');
      expect(requestBody(1).model).toBe('qwen/qwen3.8-27b');
    });

    it('respeta GROQ_MODEL y GROQ_VISION_MODEL', async () => {
      process.env.GROQ_MODEL = 'otro/modelo-texto';
      process.env.GROQ_VISION_MODEL = 'otro/modelo-vision';
      vi.mocked(fetch).mockResolvedValue(jsonResponse(completion('{"content":[]}')));
      const assistant = new GroqContentAssistant();

      await assistant.generateGameDraft(DRAFT_INPUT);
      await assistant.describeImage({ buffer: Buffer.from('x'), mimeType: 'image/png' });

      expect(requestBody(0).model).toBe('otro/modelo-texto');
      expect(requestBody(1).model).toBe('otro/modelo-vision');
    });
  });

  describe('describeImage', () => {
    it('manda la imagen como data URL al modelo de visión y devuelve el texto', async () => {
      vi.mocked(fetch).mockResolvedValue(jsonResponse(completion('  texto extraído  ')));
      const assistant = new GroqContentAssistant();

      const result = await assistant.describeImage({ buffer: Buffer.from('img-bytes'), mimeType: 'image/png' });

      expect(result).toBe('texto extraído');
      const [url, init] = vi.mocked(fetch).mock.calls[0];
      expect(url).toBe('https://api.groq.com/openai/v1/chat/completions');
      const body = requestBody();
      expect(body.messages[0].content[1].image_url.url).toBe(
        `data:image/png;base64,${Buffer.from('img-bytes').toString('base64')}`,
      );
      expect(body.max_tokens).toBeGreaterThan(0);
      // El modelo de visión (qwen) no recibe reasoning_effort: solo los gpt-oss.
      expect(body.reasoning_effort).toBeUndefined();
      expect((init as RequestInit).headers).toMatchObject({ Authorization: 'Bearer test-key' });
    });

    it('devuelve cadena vacía (no lanza) si el modelo no escribió nada', async () => {
      vi.mocked(fetch).mockResolvedValue(jsonResponse({ choices: [{ message: { content: null } }] }));
      const assistant = new GroqContentAssistant();

      await expect(assistant.describeImage({ buffer: Buffer.from('x'), mimeType: 'image/png' })).resolves.toBe('');
    });

    it('no gasta una petición con una imagen que pasa el límite de 4 MB de Groq, y lo explica', async () => {
      const assistant = new GroqContentAssistant();

      await expect(
        assistant.describeImage({ buffer: Buffer.alloc(3_100_000), mimeType: 'image/jpeg' }),
      ).rejects.toThrow(/pesa demasiado.*3 MB/);
      expect(fetch).not.toHaveBeenCalled();
    });

    it('explica que la imagen es demasiado grande cuando Groq responde 413', async () => {
      vi.mocked(fetch).mockResolvedValue(jsonResponse(errorBody('Request too large for model'), false, 413));
      const assistant = new GroqContentAssistant();

      await expect(assistant.describeImage({ buffer: Buffer.from('x'), mimeType: 'image/png' })).rejects.toThrow(
        /demasiado grande/,
      );
    });
  });

  describe('generateGameDraft', () => {
    it('pide response_format json_object, reasoning bajo y parsea la respuesta', async () => {
      vi.mocked(fetch).mockResolvedValue(
        jsonResponse(completion(JSON.stringify({ config: { a: 1 }, content: [1, 2] }))),
      );
      const assistant = new GroqContentAssistant();

      const result = await assistant.generateGameDraft(DRAFT_INPUT);

      expect(result).toEqual({ config: { a: 1 }, content: [1, 2] });
      const body = requestBody();
      expect(body.response_format).toEqual({ type: 'json_object' });
      expect(body.reasoning_effort).toBe('low');
      expect(body.max_tokens).toBe(3200);
    });

    it('incluye las descripciones de imágenes numeradas en el prompt', async () => {
      vi.mocked(fetch).mockResolvedValue(jsonResponse(completion('{"content":[]}')));
      const assistant = new GroqContentAssistant();

      await assistant.generateGameDraft({ ...DRAFT_INPUT, imageDescriptions: ['una bandera', ''] });

      const prompt = requestBody().messages[0].content as string;
      expect(prompt).toContain('0: una bandera');
      expect(prompt).toContain('1: (sin descripción legible)');
    });

    it('lee el JSON aunque venga dentro de una valla de markdown o con texto alrededor', async () => {
      vi.mocked(fetch)
        .mockResolvedValueOnce(jsonResponse(completion('```json\n{"config":{"x":1},"content":[7]}\n```')))
        .mockResolvedValueOnce(jsonResponse(completion('Aquí está: {"content":[8]} ¡listo!')));
      const assistant = new GroqContentAssistant();

      await expect(assistant.generateGameDraft(DRAFT_INPUT)).resolves.toEqual({ config: { x: 1 }, content: [7] });
      await expect(assistant.generateGameDraft(DRAFT_INPUT)).resolves.toEqual({ config: {}, content: [8] });
    });

    it('lanza InvalidGameContentError si la IA responde algo que no es JSON', async () => {
      vi.mocked(fetch).mockResolvedValue(jsonResponse(completion('no es json')));
      const assistant = new GroqContentAssistant();

      await expect(assistant.generateGameDraft(DRAFT_INPUT)).rejects.toBeInstanceOf(InvalidGameContentError);
    });

    it('distingue una respuesta cortada por longitud', async () => {
      vi.mocked(fetch).mockResolvedValue(jsonResponse(completion('{"content":[{"a":', 'length')));
      const assistant = new GroqContentAssistant();

      await expect(assistant.generateGameDraft(DRAFT_INPUT)).rejects.toThrow(/se cortó/);
    });

    it('lanza InvalidGameContentError si no hay contenido o la forma es inesperada', async () => {
      const assistant = new GroqContentAssistant();

      vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(completion('')));
      await expect(assistant.generateGameDraft(DRAFT_INPUT)).rejects.toBeInstanceOf(InvalidGameContentError);

      vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(completion('{"config":{}}')));
      await expect(assistant.generateGameDraft(DRAFT_INPUT)).rejects.toThrow(/forma inesperada/);

      vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(completion('[1,2,3]')));
      await expect(assistant.generateGameDraft(DRAFT_INPUT)).rejects.toThrow(/forma inesperada/);
    });

    it('recorta un texto fuente larguísimo al presupuesto de tokens y lo avisa', async () => {
      vi.mocked(fetch).mockResolvedValue(jsonResponse(completion('{"content":[]}')));
      const assistant = new GroqContentAssistant();
      const longText = 'Una oración de relleno para el texto fuente. '.repeat(10_000);

      const result = await assistant.generateGameDraft({ ...DRAFT_INPUT, sourceText: longText });

      expect(result.sourceTruncated).toBe(true);
      const prompt = requestBody().messages[0].content as string;
      expect(prompt.length).toBeLessThan(15_000);
      expect(prompt).toContain('se recortó por ser muy largo');
    });

    it('no marca sourceTruncated cuando el texto cabe', async () => {
      vi.mocked(fetch).mockResolvedValue(jsonResponse(completion('{"content":[]}')));
      const assistant = new GroqContentAssistant();

      const result = await assistant.generateGameDraft(DRAFT_INPUT);

      expect(result).not.toHaveProperty('sourceTruncated');
    });

    it('reintenta con la mitad del texto cuando Groq responde 413, y avisa que se recortó', async () => {
      const { assistant } = instantAssistant();
      vi.mocked(fetch)
        .mockResolvedValueOnce(jsonResponse(errorBody('Request too large for model on tokens per minute (TPM)'), false, 413))
        .mockResolvedValueOnce(jsonResponse(completion('{"content":[1]}')));
      const text = 'Texto de relleno con varias palabras. '.repeat(400);

      const result = await assistant.generateGameDraft({ ...DRAFT_INPUT, sourceText: text });

      expect(fetch).toHaveBeenCalledTimes(2);
      const first = (requestBody(0).messages[0].content as string).length;
      const second = (requestBody(1).messages[0].content as string).length;
      expect(second).toBeLessThan(first);
      expect(result).toMatchObject({ content: [1], sourceTruncated: true });
    });

    it('si el 413 persiste, explica que el texto es demasiado largo', async () => {
      const { assistant } = instantAssistant();
      vi.mocked(fetch).mockResolvedValue(jsonResponse(errorBody('Request too large'), false, 413));

      await expect(
        assistant.generateGameDraft({ ...DRAFT_INPUT, sourceText: 'palabra '.repeat(5_000) }),
      ).rejects.toThrow(/demasiado largo/);
      // 1 intento inicial + 2 reducciones, ni una más.
      expect(fetch).toHaveBeenCalledTimes(3);
    });
  });

  describe('errores y reintentos', () => {
    it('espera el retry-after de Groq y reintenta cuando hay 429 por minuto', async () => {
      const { assistant, sleep } = instantAssistant();
      vi.mocked(fetch)
        .mockResolvedValueOnce(
          jsonResponse(errorBody('Rate limit reached on tokens per minute (TPM)'), false, 429, { 'retry-after': '18' }),
        )
        .mockResolvedValueOnce(jsonResponse(completion('{"content":[1]}')));

      await expect(assistant.generateGameDraft(DRAFT_INPUT)).resolves.toMatchObject({ content: [1] });

      expect(sleep).toHaveBeenCalledTimes(1);
      expect(sleep).toHaveBeenCalledWith(18_500);
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('sin retry-after espera un tiempo creciente por defecto', async () => {
      const { assistant, sleep } = instantAssistant();
      vi.mocked(fetch)
        .mockResolvedValueOnce(jsonResponse(errorBody('Rate limit'), false, 429))
        .mockResolvedValueOnce(jsonResponse(errorBody('Rate limit'), false, 429))
        .mockResolvedValueOnce(jsonResponse(completion('{"content":[1]}')));

      await assistant.generateGameDraft(DRAFT_INPUT);

      expect(sleep).toHaveBeenNthCalledWith(1, 5_500);
      expect(sleep).toHaveBeenNthCalledWith(2, 10_500);
    });

    it('se rinde con un mensaje claro tras agotar los reintentos del 429', async () => {
      const { assistant } = instantAssistant();
      vi.mocked(fetch).mockResolvedValue(
        jsonResponse(errorBody('Rate limit reached'), false, 429, { 'retry-after': '2' }),
      );

      await expect(assistant.generateGameDraft(DRAFT_INPUT)).rejects.toThrow(/límite de uso por minuto/);
      // 1 intento + 3 reintentos.
      expect(fetch).toHaveBeenCalledTimes(4);
    });

    it('no espera ni reintenta si el límite es diario', async () => {
      const { assistant, sleep } = instantAssistant();
      vi.mocked(fetch).mockResolvedValue(
        jsonResponse(errorBody('Rate limit reached on requests per day (RPD): Limit 1000'), false, 429, {
          'retry-after': '3000',
        }),
      );

      await expect(assistant.generateGameDraft(DRAFT_INPUT)).rejects.toThrow(/límite diario/);
      expect(sleep).not.toHaveBeenCalled();
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('no espera más del máximo razonable aunque el límite sea por minuto', async () => {
      const { assistant, sleep } = instantAssistant();
      vi.mocked(fetch).mockResolvedValue(
        jsonResponse(errorBody('Rate limit reached (TPM)'), false, 429, { 'retry-after': '600' }),
      );

      await expect(assistant.generateGameDraft(DRAFT_INPUT)).rejects.toBeInstanceOf(ServiceUnavailableException);
      expect(sleep).not.toHaveBeenCalled();
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('reintenta los errores 5xx y se recupera', async () => {
      const { assistant, sleep } = instantAssistant();
      vi.mocked(fetch)
        .mockResolvedValueOnce(jsonResponse(errorBody('boom'), false, 503))
        .mockResolvedValueOnce(jsonResponse(errorBody('boom'), false, 500))
        .mockResolvedValueOnce(jsonResponse(completion('{"content":[1]}')));

      await expect(assistant.generateGameDraft(DRAFT_INPUT)).resolves.toMatchObject({ content: [1] });
      expect(sleep).toHaveBeenNthCalledWith(1, 1_000);
      expect(sleep).toHaveBeenNthCalledWith(2, 2_000);
    });

    it('si el 5xx persiste, avisa que el servicio no está disponible', async () => {
      const { assistant } = instantAssistant();
      vi.mocked(fetch).mockResolvedValue(jsonResponse(errorBody('boom'), false, 502));

      await expect(assistant.generateGameDraft(DRAFT_INPUT)).rejects.toThrow(/no está disponible/);
      expect(fetch).toHaveBeenCalledTimes(3);
    });

    it('reintenta un error de red y se recupera', async () => {
      const { assistant } = instantAssistant();
      vi.mocked(fetch)
        .mockRejectedValueOnce(new Error('network down'))
        .mockResolvedValueOnce(jsonResponse(completion('{"content":[1]}')));

      await expect(assistant.generateGameDraft(DRAFT_INPUT)).resolves.toMatchObject({ content: [1] });
    });

    it('envuelve un error de red persistente en ServiceUnavailableException', async () => {
      const { assistant } = instantAssistant();
      vi.mocked(fetch).mockRejectedValue(new Error('network down'));

      await expect(assistant.describeImage({ buffer: Buffer.from(''), mimeType: 'image/png' })).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
      expect(fetch).toHaveBeenCalledTimes(3);
    });

    it('no reintenta una key inválida y lo dice claramente', async () => {
      const { assistant } = instantAssistant();
      vi.mocked(fetch).mockResolvedValue(jsonResponse(errorBody('Invalid API Key'), false, 401));

      await expect(assistant.generateGameDraft(DRAFT_INPUT)).rejects.toThrow(/GROQ_API_KEY/);
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('nombra el modelo cuando Groq responde 404', async () => {
      const { assistant } = instantAssistant();
      vi.mocked(fetch).mockResolvedValue(jsonResponse(errorBody('model_not_found'), false, 404));

      await expect(assistant.describeImage({ buffer: Buffer.from('x'), mimeType: 'image/png' })).rejects.toThrow(
        /qwen\/qwen3\.8-27b/,
      );
    });

    it('un cuerpo de error que no es JSON tampoco rompe nada', async () => {
      const { assistant } = instantAssistant();
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 400,
        headers: new Headers(),
        text: () => Promise.resolve('<html>Bad Request</html>'),
      } as unknown as Response);

      await expect(assistant.generateGameDraft(DRAFT_INPUT)).rejects.toBeInstanceOf(ServiceUnavailableException);
    });
  });
});
