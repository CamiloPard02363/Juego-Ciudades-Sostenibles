import type { Game } from '../../domain/entities/game.entity.js';

const MAX_SOURCE_TEXT_LENGTH = 24_000;
const MAX_VALUE_LENGTH = 600;

/** Claves que no aportan significado al modelo (estilo, ids, multimedia). */
const IGNORED_KEYS = new Set([
  'id',
  'icon',
  'color',
  'imageUrl',
  'audioUrl',
  'posImageUrl',
  'negImageUrl',
  'imageIndex',
  'imageQuery',
  'cellNumber',
  'triggerType',
]);

const KEY_LABELS: Record<string, string> = {
  label: 'Concepto',
  info: 'Dato',
  fact: 'Dato',
  prompt: 'Pregunta',
  posTitle: 'Concepto A',
  posDescription: 'Descripción A',
  negTitle: 'Concepto opuesto B',
  negDescription: 'Descripción B',
};

function looksLikeUrlOrColor(value: string): boolean {
  return /^https?:\/\//i.test(value) || /^#[0-9a-f]{3,8}$/i.test(value);
}

function collectStrings(value: unknown, key: string, out: string[], depth: number): void {
  if (depth > 4 || IGNORED_KEYS.has(key)) return;

  if (typeof value === 'string') {
    const text = value.trim();
    if (text && !looksLikeUrlOrColor(text)) {
      out.push(`${KEY_LABELS[key] ?? key}: ${text.slice(0, MAX_VALUE_LENGTH)}`);
    }
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((entry) => collectStrings(entry, key, out, depth + 1));
    return;
  }

  if (value && typeof value === 'object') {
    for (const [childKey, childValue] of Object.entries(value as Record<string, unknown>)) {
      collectStrings(childValue, childKey, out, depth + 1);
    }
  }
}

function describeItem(item: unknown): string {
  if (typeof item !== 'object' || item === null) {
    return typeof item === 'string' ? item.trim() : '';
  }

  const raw = item as Record<string, unknown>;
  const lines: string[] = [];

  // Preguntas de opción múltiple: se dejan explícitas la respuesta correcta y
  // las opciones, en vez de un array de strings sin contexto.
  if (typeof raw.prompt === 'string' && Array.isArray(raw.options)) {
    const options = raw.options.filter((option): option is string => typeof option === 'string');
    lines.push(`Pregunta: ${raw.prompt.trim().slice(0, MAX_VALUE_LENGTH)}`);
    const correctIndex = raw.correctOptionIndex;
    if (typeof correctIndex === 'number' && options[correctIndex] !== undefined) {
      lines.push(`Respuesta correcta: ${options[correctIndex].slice(0, MAX_VALUE_LENGTH)}`);
    }
    const wrong = options.filter((_, index) => index !== correctIndex);
    if (wrong.length > 0) {
      lines.push(`Otras opciones: ${wrong.map((option) => option.slice(0, 200)).join(' | ')}`);
    }
    return lines.join('\n');
  }

  collectStrings(raw, '', lines, 0);
  return lines.join('\n');
}

/**
 * Serializa el tema de un juego existente a texto plano para usarlo como
 * fuente del asistente de IA al adaptarlo a otro tipo de juego (issue #8).
 * Es agnóstico del tipo de origen: recorre `content` y se queda con los
 * textos con significado (conceptos, datos, preguntas), descartando colores,
 * URLs, íconos e índices que solo tienen sentido dentro de la mecánica
 * original.
 */
export function buildGameSourceText(game: Game): string {
  const header = [
    `Tema del juego original: ${game.title}`,
    game.description ? `Descripción: ${game.description}` : '',
    'Contenido del juego original:',
  ]
    .filter(Boolean)
    .join('\n');

  const items = game.content
    .map((item, index) => {
      const body = describeItem(item);
      return body ? `[${index + 1}]\n${body}` : '';
    })
    .filter(Boolean);

  return [header, ...items].join('\n\n').slice(0, MAX_SOURCE_TEXT_LENGTH);
}
