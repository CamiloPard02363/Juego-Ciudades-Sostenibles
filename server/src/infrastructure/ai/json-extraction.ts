/**
 * Lee el JSON que devolvió un modelo de IA aunque venga "sucio": con una
 * valla de markdown (```json … ```), con texto antes o después del objeto,
 * etc. Devuelve `undefined` si no hay forma de sacar un JSON válido (un
 * `null` literal sí es un JSON válido y se devuelve tal cual).
 *
 * Los proveedores se piden en "modo JSON", pero un modelo puede seguir
 * escapándose del formato de vez en cuando — esto evita rechazar una
 * respuesta perfectamente útil por un par de caracteres de más.
 */
export function extractJsonObject(raw: string): unknown {
  const text = raw.trim();
  if (!text) return undefined;

  const direct = tryParse(text);
  if (direct !== undefined) return direct;

  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) {
    const parsed = tryParse(fenced[1].trim());
    if (parsed !== undefined) return parsed;
  }

  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start !== -1 && end > start) {
    const parsed = tryParse(text.slice(start, end + 1));
    if (parsed !== undefined) return parsed;
  }

  return undefined;
}

function tryParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

/**
 * Recorta `text` a lo sumo a `maxChars`, preferiendo cortar en un salto de
 * párrafo, de línea o al final de una oración para no dejar una frase a
 * medias. Devuelve el texto tal cual (y `truncated: false`) si ya cabe.
 */
export function cutTextAtBoundary(text: string, maxChars: number): { text: string; truncated: boolean } {
  if (text.length <= maxChars) return { text, truncated: false };

  const slice = text.slice(0, maxChars);
  // Solo vale la pena cortar en un límite natural si no se pierde más de la
  // quinta parte del texto permitido.
  const minAcceptable = Math.floor(maxChars * 0.8);
  const candidates = [slice.lastIndexOf('\n\n'), slice.lastIndexOf('\n'), slice.lastIndexOf('. ')];
  const boundary = candidates.find((index) => index >= minAcceptable);
  return { text: (boundary !== undefined ? slice.slice(0, boundary + 1) : slice).trimEnd(), truncated: true };
}
