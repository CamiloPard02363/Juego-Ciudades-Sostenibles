/**
 * Ilustración básica de respaldo para una tarjeta que no tiene imagen: un
 * cuadro de color con un emoji (o, si no hay uno válido, la inicial del
 * concepto) en el centro. La IA solo elige el emoji y el color — el SVG lo
 * arma este módulo con una plantilla fija, así que NUNCA hay marcado
 * generado por un modelo en la imagen final (nada de scripts, enlaces ni
 * estilos externos): todo lo dinámico se valida y se escapa acá.
 *
 * Se usa cuando el usuario no subió imágenes y tampoco hubo una foto libre
 * en Wikimedia Commons (ver `ContentImageResolver`). Es "básica" a
 * propósito: lo importante es que cada tarjeta tenga algo reconocible y que
 * el usuario pueda reemplazarla por la suya.
 */

export interface IllustrationInput {
  /** Nombre del concepto (se usa para elegir color e iniciales de respaldo). */
  label: string;
  /** Emoji (o símbolo) que propone la IA; se ignora si no es válido. */
  emoji?: unknown;
  /** Color base "#rgb" o "#rrggbb" que propone la IA; se ignora si no es válido. */
  color?: unknown;
  /**
   * Agrega en una esquina la inicial del concepto. Se usa cuando dos
   * elementos terminarían con el mismo dibujo (ver `findRepeatedGlyphs`): sin
   * esto, dos tarjetas distintas de un juego de memoria se verían idénticas.
   */
  badge?: boolean;
}

const HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
// Una secuencia emoji: pictogramas, banderas (indicadores regionales), modificadores
// de tono de piel, selectores de variación, uniones ZWJ y marcos de tecla. También se
// aceptan otros símbolos gráficos (\p{So}: figuras geométricas como ▭, flechas, etc.)
// porque un modelo los usa para formas que no tienen emoji.
const EMOJI_SEQUENCE = /^(?:\p{Extended_Pictographic}|\p{Regional_Indicator}|\p{Emoji_Modifier}|\p{So}|\u200d|\ufe0f|\u20e3)+$/u;
const HAS_VISIBLE_SYMBOL = /\p{Extended_Pictographic}|\p{Regional_Indicator}|\p{So}/u;
const MAX_EMOJI_CODE_POINTS = 12;

/** Colores base pensados para que un emoji se vea bien encima (se aclaran al dibujar). */
const FALLBACK_PALETTE = [
  '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#a855f7', '#14b8a6',
  '#ec4899', '#6366f1', '#84cc16', '#f97316', '#06b6d4', '#eab308',
] as const;

const EMOJI_FONT_STACK = "'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif";

/** Hash determinista (FNV-1a) para que el mismo concepto siempre tenga el mismo color de respaldo. */
function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function expandHex(color: string): string {
  const hex = color.slice(1).toLowerCase();
  return hex.length === 3 ? `#${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}` : `#${hex}`;
}

/** Mezcla `color` con `target` (0 = negro, 255 = blanco) en la proporción `amount` (0 = el color, 1 = `target`). */
function mix(color: string, target: number, amount: number): string {
  const channel = (offset: number) => {
    const value = Number.parseInt(color.slice(offset, offset + 2), 16);
    return Math.round(value + (target - value) * amount)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${channel(1)}${channel(3)}${channel(5)}`;
}

const lighten = (color: string, amount: number) => mix(color, 255, amount);
const darken = (color: string, amount: number) => mix(color, 0, amount);

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Primer emoji de `value` (un solo "carácter" visible, p. ej. 🇦🇷 o 👩‍🔬), o `null` si no hay uno válido. */
export function sanitizeEmoji(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const first = firstGrapheme(trimmed);
  if (!first || [...first].length > MAX_EMOJI_CODE_POINTS) return null;
  return EMOJI_SEQUENCE.test(first) && HAS_VISIBLE_SYMBOL.test(first) ? first : null;
}

function firstGrapheme(value: string): string {
  const Segmenter = (Intl as { Segmenter?: typeof Intl.Segmenter }).Segmenter;
  if (Segmenter) {
    const first = new Segmenter(undefined, { granularity: 'grapheme' }).segment(value)[Symbol.iterator]().next();
    return first.done ? '' : first.value.segment;
  }
  return [...value][0] ?? '';
}

/** Color base válido ("#rrggbb"): el propuesto si sirve, o uno estable según el concepto. */
export function resolveIllustrationColor(color: unknown, label: string): string {
  if (typeof color === 'string' && HEX_COLOR.test(color.trim())) return expandHex(color.trim());
  return FALLBACK_PALETTE[hashString(label.trim().toLowerCase()) % FALLBACK_PALETTE.length];
}

/** Primera letra o número del concepto, en mayúscula ("?" si no tiene ninguno). */
export function initialOf(label: string): string {
  const match = label.match(/[\p{L}\p{N}]/u);
  return match ? match[0].toLocaleUpperCase('es') : '?';
}

/** Primeras dos letras ("Re", "Ro"): distingue conceptos que empiezan igual cuando no hay emoji. */
function initialsOf(label: string): string {
  const chars = [...label.matchAll(/[\p{L}\p{N}]/gu)].slice(0, 2).map((match) => match[0]);
  if (chars.length === 0) return '?';
  return chars[0].toLocaleUpperCase('es') + (chars[1]?.toLocaleLowerCase('es') ?? '');
}

/**
 * Qué dibujo llevaría cada elemento (el emoji válido, o sus iniciales) y cuáles
 * repiten el dibujo de uno anterior. Devuelve, por posición, si ese elemento
 * necesita la insignia con su inicial para no verse igual que otro.
 */
export function findRepeatedGlyphs(inputs: IllustrationInput[]): boolean[] {
  const seen = new Set<string>();
  return inputs.map((input) => {
    const key = sanitizeEmoji(input.emoji) ?? `letras:${initialsOf(input.label)}`;
    if (seen.has(key)) return true;
    seen.add(key);
    return false;
  });
}

/** SVG cuadrado de 512×512 listo para subir como imagen de la tarjeta. */
export function buildIllustrationSvg(input: IllustrationInput): Buffer {
  const base = resolveIllustrationColor(input.color, input.label);
  const emoji = sanitizeEmoji(input.emoji);

  const glyph = emoji
    ? `<text x="50" y="54" font-size="46" text-anchor="middle" dominant-baseline="central" font-family="${EMOJI_FONT_STACK}">${escapeXml(emoji)}</text>`
    : `<text x="50" y="53" font-size="36" font-weight="700" text-anchor="middle" dominant-baseline="central" font-family="Arial,Helvetica,sans-serif" fill="${darken(base, 0.4)}">${escapeXml(initialsOf(input.label))}</text>`;

  const badge = input.badge
    ? '<circle cx="82" cy="82" r="12" fill="#ffffff"/>' +
      `<text x="82" y="83" font-size="15" font-weight="700" text-anchor="middle" dominant-baseline="central" font-family="Arial,Helvetica,sans-serif" fill="${darken(base, 0.4)}">${escapeXml(initialOf(input.label))}</text>`
    : '';

  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="512" height="512">' +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${lighten(base, 0.55)}"/><stop offset="1" stop-color="${lighten(base, 0.2)}"/></linearGradient></defs>` +
    '<rect width="100" height="100" fill="url(#g)"/>' +
    '<circle cx="50" cy="50" r="34" fill="#ffffff" fill-opacity="0.6"/>' +
    glyph +
    badge +
    '</svg>';

  return Buffer.from(svg, 'utf-8');
}

/** La misma ilustración como `data:` URL, por si no hay dónde subirla (sigue siendo corta). */
export function illustrationDataUrl(input: IllustrationInput): string {
  return `data:image/svg+xml;base64,${buildIllustrationSvg(input).toString('base64')}`;
}
