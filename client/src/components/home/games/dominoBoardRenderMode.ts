import { layoutDominoChain, type DominoChainLayout, type DominoChainTile, type DominoViewport } from './dominoChainLayout'

export type DominoBoardRenderMode = 'linear' | 'serpentine'

export type DominoBoardPresentation =
  | { kind: 'linear' }
  | { kind: 'serpentine'; layout: DominoChainLayout }

/** Selecciona una vista sin tocar el arreglo lógico recibido del servidor. */
export function resolveDominoBoardPresentation(
  mode: DominoBoardRenderMode,
  board: readonly DominoChainTile[],
  viewport: DominoViewport,
): DominoBoardPresentation {
  if (mode === 'linear' || board.length === 0 || viewport.width === 0 || viewport.height === 0) return { kind: 'linear' }
  const layout = layoutDominoChain(board, viewport)
  return layout.viable ? { kind: 'serpentine', layout } : { kind: 'linear' }
}
