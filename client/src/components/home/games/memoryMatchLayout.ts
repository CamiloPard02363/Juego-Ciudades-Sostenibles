/**
 * Reparto y tamaño del tablero de MatchMente, sin DOM, para poder probarlo.
 *
 * Antes cada zona traía hasta 8 parejas (16 cartas) en una cuadrícula fija de
 * 4 columnas: en una laptop eso obligaba a hacer scroll. Ahora las zonas son
 * más chicas y parejas entre sí, y la cuadrícula se calcula para que todas
 * las cartas quepan en la pantalla con el mayor tamaño posible.
 */

/** Más de 6 parejas (12 cartas) por zona satura la vista y obliga a cartas diminutas. */
export const MAX_PAIRS_PER_ZONE = 6

/**
 * Cuántas parejas va en cada zona: el mínimo de zonas posible y repartidas
 * en partes iguales (10 → [5, 5], no [6, 4]; 16 → [6, 5, 5]).
 */
export function zonePairSizes(totalPairs: number, perZone: number): number[] {
  if (totalPairs <= 0) return []
  const cap = Math.max(1, Math.min(perZone, MAX_PAIRS_PER_ZONE))
  const zoneCount = Math.ceil(totalPairs / cap)
  const base = Math.floor(totalPairs / zoneCount)
  const extra = totalPairs % zoneCount
  return Array.from({ length: zoneCount }, (_, index) => base + (index < extra ? 1 : 0))
}

export type BoardGrid = { cols: number; rows: number; cardWidth: number; cardHeight: number }

/** Proporción ancho/alto de una carta: imagen casi cuadrada y una línea de texto debajo. */
export const CARD_ASPECT = 0.8

/**
 * Elige las columnas que dan la carta más grande dentro de `width` × `height`.
 * Solo se aceptan cuadrículas sin huecos (filas completas) cuando existen, para
 * que el tablero se vea ordenado; si no, se permite una última fila incompleta.
 */
export function bestBoardGrid(cardCount: number, width: number, height: number, gap: number): BoardGrid {
  if (cardCount <= 0 || width <= 0 || height <= 0) return { cols: 1, rows: 1, cardWidth: 0, cardHeight: 0 }

  let best: BoardGrid | null = null
  let bestComplete: BoardGrid | null = null
  for (let cols = 1; cols <= cardCount; cols++) {
    const rows = Math.ceil(cardCount / cols)
    const cellWidth = (width - gap * (cols - 1)) / cols
    const cellHeight = (height - gap * (rows - 1)) / rows
    if (cellWidth <= 0 || cellHeight <= 0) continue
    const cardWidth = Math.min(cellWidth, cellHeight * CARD_ASPECT)
    const grid = { cols, rows, cardWidth: Math.floor(cardWidth), cardHeight: Math.floor(cardWidth / CARD_ASPECT) }
    if (!best || grid.cardWidth > best.cardWidth) best = grid
    if (cardCount % cols === 0 && (!bestComplete || grid.cardWidth > bestComplete.cardWidth)) bestComplete = grid
  }
  // Una cuadrícula completa gana si su carta no es mucho más chica (≤ 15 %).
  if (best && bestComplete && bestComplete.cardWidth >= best.cardWidth * 0.85) return bestComplete
  return best ?? { cols: 1, rows: cardCount, cardWidth: 0, cardHeight: 0 }
}
