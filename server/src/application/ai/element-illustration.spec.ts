import { describe, expect, it } from 'vitest';
import {
  buildIllustrationSvg,
  findRepeatedGlyphs,
  illustrationDataUrl,
  initialOf,
  resolveIllustrationColor,
  sanitizeEmoji,
} from './element-illustration.js';

function svgOf(input: Parameters<typeof buildIllustrationSvg>[0]): string {
  return buildIllustrationSvg(input).toString('utf-8');
}

describe('sanitizeEmoji', () => {
  it.each([
    ['un pictograma', '🦅'],
    ['una bandera (indicadores regionales)', '🇦🇷'],
    ['una secuencia con ZWJ', '👩‍🔬'],
    ['un emoji con selector de variación', '❤️'],
    ['un emoji con tono de piel', '👍🏽'],
    ['una figura geométrica sin emoji propio', '▭'],
    ['un cuadrado negro', '⬛'],
  ])('acepta %s', (_name, emoji) => {
    expect(sanitizeEmoji(emoji)).toBe(emoji);
  });

  it('se queda solo con el primer emoji si la IA manda varios', () => {
    expect(sanitizeEmoji('🦅🐆🌳')).toBe('🦅');
    expect(sanitizeEmoji('  🧊 cubo  ')).toBe('🧊');
  });

  it.each([
    ['texto normal', 'Águila'],
    ['una etiqueta HTML', '<script>alert(1)</script>'],
    ['una cadena vacía', ''],
    ['solo espacios', '   '],
    ['un número', 42],
    ['null', null],
    ['undefined', undefined],
    ['un objeto', { emoji: '🦅' }],
    ['solo un dígito (no es un emoji por sí solo)', '7'],
    ['puntuación', '!!!'],
  ])('rechaza %s', (_name, value) => {
    expect(sanitizeEmoji(value)).toBeNull();
  });
});

describe('resolveIllustrationColor', () => {
  it('acepta #rrggbb y #rgb (lo expande) en cualquier mayúscula', () => {
    expect(resolveIllustrationColor('#BAE6FD', 'x')).toBe('#bae6fd');
    expect(resolveIllustrationColor('#abc', 'x')).toBe('#aabbcc');
    expect(resolveIllustrationColor('  #22c55e ', 'x')).toBe('#22c55e');
  });

  it.each(['rojo', 'red', 'rgb(1,2,3)', '#12', '#12345', '#gggggg', 'javascript:alert(1)', '', null, undefined, 7])(
    'rechaza %s y devuelve un color de la paleta, estable para el mismo concepto',
    (invalid) => {
      const first = resolveIllustrationColor(invalid, 'Jaguar');
      expect(first).toMatch(/^#[0-9a-f]{6}$/);
      expect(resolveIllustrationColor(invalid, 'Jaguar')).toBe(first);
      expect(resolveIllustrationColor(invalid, '  jaguar ')).toBe(first);
    },
  );

  it('reparte los conceptos entre varios colores de respaldo', () => {
    const colors = new Set(['Águila', 'Jaguar', 'Ceiba', 'Cóndor', 'Delfín', 'Tucán', 'Rana', 'Oso'].map((label) =>
      resolveIllustrationColor(undefined, label),
    ));
    expect(colors.size).toBeGreaterThan(2);
  });
});

describe('buildIllustrationSvg', () => {
  it('arma un SVG cuadrado con el emoji centrado y el color pedido', () => {
    const svg = svgOf({ label: 'Águila', emoji: '🦅', color: '#bae6fd' });

    expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(true);
    expect(svg.endsWith('</svg>')).toBe(true);
    expect(svg).toContain('viewBox="0 0 100 100"');
    expect(svg).toContain('>🦅</text>');
    expect(svg).toContain('Segoe UI Emoji');
    // Degradado aclarado a partir del color base.
    expect(svg).toMatch(/stop-color="#[0-9a-f]{6}"/);
  });

  it('sin emoji válido usa las dos primeras letras del concepto (la primera en mayúscula)', () => {
    expect(svgOf({ label: 'águila', emoji: 'nada' })).toContain('>Ág</text>');
    expect(svgOf({ label: 'Rectángulo' })).toContain('>Re</text>');
    expect(svgOf({ label: 'Rombo' })).toContain('>Ro</text>');
    expect(svgOf({ label: '3 triángulos' })).toContain('>3t</text>');
    expect(svgOf({ label: 'X' })).toContain('>X</text>');
    expect(svgOf({ label: '¿?' })).toContain('>?</text>');
    expect(svgOf({ label: '' })).toContain('>?</text>');
  });

  it('las iniciales van en un tono oscuro del color base (se leen sobre el fondo claro)', () => {
    const svg = svgOf({ label: 'Rombo', color: '#ffffff' });
    expect(svg).toMatch(/fill="#999999"[^>]*>Ro<\/text>|>Ro<\/text>/);
    const fill = svg.match(/fill="(#[0-9a-f]{6})"[^>]*>Ro<\/text>/)?.[1];
    expect(fill).toBe('#999999');
  });

  it('con badge agrega la inicial en una esquina; sin badge no hay insignia', () => {
    const withBadge = svgOf({ label: 'Pirámide', emoji: '🔺', badge: true });
    const without = svgOf({ label: 'Pirámide', emoji: '🔺' });

    expect(withBadge).toContain('>P</text>');
    expect(withBadge).toContain('cx="82" cy="82"');
    expect(without).not.toContain('cx="82"');
    expect(withBadge).not.toBe(without);
  });

  it('la inicial nunca incluye marcado: se escapa todo lo dinámico', () => {
    const svg = svgOf({ label: '<script>alert(1)</script>', emoji: '"><script>alert(1)</script>', color: '"/><script>' });

    expect(svg).not.toContain('<script');
    expect(svg).not.toContain('alert');
    expect(svg).not.toContain('onload');
    expect(svg).not.toContain('href');
  });

  it('contiene exactamente los elementos de la plantilla fija (nada generado por el modelo)', () => {
    const svg = svgOf({ label: 'Cubo', emoji: '🧊', color: '#fecaca' });
    const tags = [...svg.matchAll(/<([a-zA-Z]+)/g)].map((match) => match[1]);

    expect(new Set(tags)).toEqual(new Set(['svg', 'defs', 'linearGradient', 'stop', 'rect', 'circle', 'text']));
  });

  it('es determinista: mismo concepto, mismo resultado', () => {
    const input = { label: 'Cubo', emoji: '🧊', color: undefined };
    expect(svgOf(input)).toBe(svgOf(input));
  });

  it('escapa los caracteres especiales XML de la inicial', () => {
    expect(svgOf({ label: '&' })).toContain('>?</text>');
  });
});

describe('initialOf', () => {
  it.each([
    ['águila', 'Á'],
    ['  cubo', 'C'],
    ['3 lados', '3'],
    ['¿Quién?', 'Q'],
    ['', '?'],
    ['!!!', '?'],
  ])('%j → %s', (label, expected) => {
    expect(initialOf(label)).toBe(expected);
  });
});

describe('findRepeatedGlyphs', () => {
  it('marca solo a partir de la segunda aparición del mismo emoji', () => {
    expect(
      findRepeatedGlyphs([
        { label: 'Triángulo', emoji: '🔺' },
        { label: 'Cubo', emoji: '🧊' },
        { label: 'Pirámide', emoji: '🔺' },
        { label: 'Tetraedro', emoji: '🔺' },
      ]),
    ).toEqual([false, false, true, true]);
  });

  it('sin emoji válido compara las iniciales: "Re" y "Ro" son distintas, dos "Re" no', () => {
    expect(
      findRepeatedGlyphs([
        { label: 'Rectángulo' },
        { label: 'Rombo' },
        { label: 'Rectas paralelas', emoji: 'nada' },
      ]),
    ).toEqual([false, false, true]);
  });

  it('un emoji y unas iniciales nunca se consideran repetidos entre sí', () => {
    expect(findRepeatedGlyphs([{ label: 'Re', emoji: '🔺' }, { label: 'Re' }])).toEqual([false, false]);
  });

  it('una lista vacía no marca nada', () => {
    expect(findRepeatedGlyphs([])).toEqual([]);
  });
});

describe('illustrationDataUrl', () => {
  it('es un data URL SVG en base64 que decodifica al mismo SVG', () => {
    const url = illustrationDataUrl({ label: 'Águila', emoji: '🦅', color: '#bae6fd' });

    expect(url.startsWith('data:image/svg+xml;base64,')).toBe(true);
    expect(Buffer.from(url.split(',')[1], 'base64').toString('utf-8')).toBe(
      svgOf({ label: 'Águila', emoji: '🦅', color: '#bae6fd' }),
    );
  });

  it('es lo bastante corto para caber en el campo de URL (2048) incluso con un emoji compuesto', () => {
    expect(illustrationDataUrl({ label: 'Familia', emoji: '👨‍👩‍👧‍👦', color: '#fecaca' }).length).toBeLessThan(1800);
    expect(illustrationDataUrl({ label: 'Colombia', emoji: '🇨🇴' }).length).toBeLessThan(1800);
  });
});
