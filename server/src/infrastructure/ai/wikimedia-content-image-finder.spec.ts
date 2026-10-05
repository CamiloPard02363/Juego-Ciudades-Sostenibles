import { afterEach, describe, expect, it, vi } from 'vitest';
import { WikimediaContentImageFinder } from './wikimedia-content-image-finder.js';

function jsonResponse(data: unknown): Response {
  return new Response(JSON.stringify(data), { status: 200, headers: { 'content-type': 'application/json' } });
}

/** Responde según el host de la URL pedida; lo que no esté mapeado da 404. */
function mockFetch(routes: Record<string, () => Response | Promise<Response>>) {
  const fetchMock = vi.fn(async (input: string | URL | Request) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const route = Object.keys(routes).find((prefix) => url.startsWith(prefix));
    return route ? routes[route]() : new Response('not found', { status: 404 });
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('WikimediaContentImageFinder (issue #240)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('combina Wikipedia en inglés y Commons, en orden de relevancia y sin SVG ni duplicados', async () => {
    const fetchMock = mockFetch({
      'https://en.wikipedia.org/': () =>
        jsonResponse({
          query: {
            pages: [
              { index: 2, thumbnail: { source: 'https://upload.test/b.jpg?x=1' } },
              { index: 1, thumbnail: { source: 'https://upload.test/a.png' } },
              { index: 3 },
            ],
          },
        }),
      'https://commons.wikimedia.org/': () =>
        jsonResponse({
          query: {
            pages: [
              { index: 1, imageinfo: [{ thumburl: 'https://upload.test/a.png?dup', mime: 'image/png' }] },
              { index: 2, imageinfo: [{ thumburl: 'https://upload.test/c.svg', mime: 'image/svg+xml' }] },
              { index: 3, imageinfo: [{ thumburl: 'https://upload.test/d.jpg', mime: 'image/jpeg' }] },
            ],
          },
        }),
    });

    const candidates = await new WikimediaContentImageFinder().search('Flag of Argentina', 'Argentina');

    expect(candidates.map((candidate) => candidate.url)).toEqual([
      'https://upload.test/a.png',
      'https://upload.test/b.jpg?x=1',
      'https://upload.test/d.jpg',
    ]);
    const [firstUrl, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(firstUrl).toContain('gsrsearch=Flag+of+Argentina');
    expect((init.headers as Record<string, string>)['User-Agent']).toContain('NexusPlay');
  });

  it('si no hay resultados en inglés, prueba Wikipedia en español con el label', async () => {
    const fetchMock = mockFetch({
      'https://en.wikipedia.org/': () => jsonResponse({}),
      'https://commons.wikimedia.org/': () => jsonResponse({}),
      'https://es.wikipedia.org/': () =>
        jsonResponse({ query: { pages: [{ index: 1, thumbnail: { source: 'https://upload.test/es.jpg' } }] } }),
    });

    const candidates = await new WikimediaContentImageFinder().search('obscure query', 'Cóndor andino');

    expect(candidates).toEqual([{ url: 'https://upload.test/es.jpg' }]);
    expect(String(fetchMock.mock.calls.at(-1)?.[0])).toContain('gsrsearch=C%C3%B3ndor+andino');
  });

  it('un error de red se trata como "sin resultados", nunca lanza', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNRESET')));

    await expect(new WikimediaContentImageFinder().search('Flag of Peru', 'Perú')).resolves.toEqual([]);
  });

  it('descarga solo imágenes raster válidas', async () => {
    mockFetch({
      'https://upload.test/ok.jpg': () =>
        new Response(Buffer.from('jpeg-bytes'), { status: 200, headers: { 'content-type': 'image/jpeg' } }),
      'https://upload.test/page.html': () =>
        new Response('<html></html>', { status: 200, headers: { 'content-type': 'text/html' } }),
    });
    const finder = new WikimediaContentImageFinder();

    await expect(finder.download({ url: 'https://upload.test/ok.jpg' })).resolves.toEqual({
      buffer: Buffer.from('jpeg-bytes'),
      mimeType: 'image/jpeg',
    });
    await expect(finder.download({ url: 'https://upload.test/page.html' })).resolves.toBeNull();
    await expect(finder.download({ url: 'https://upload.test/missing.png' })).resolves.toBeNull();
  });
});
