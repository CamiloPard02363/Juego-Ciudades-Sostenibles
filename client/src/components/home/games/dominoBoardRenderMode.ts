import {
  layoutBidirectionalDominoChain,
  layoutDominoChain,
  type BidirectionalDominoChainLayout,
  type DominoChainLayout,
  type DominoChainTile,
  type DominoViewport,
} from './dominoChainLayout'

export type DominoBoardRenderMode = 'linear' | 'serpentine' | 'bidirectional'

export type DominoBoardPresentation =
  | { kind: 'linear' }
  | { kind: 'serpentine'; layout: DominoChainLayout }
  | { kind: 'bidirectional'; layout: BidirectionalDominoChainLayout }

/** Selecciona una vista sin tocar el arreglo lógico recibido del servidor. */
export function resolveDominoBoardPresentation(
  mode: DominoBoardRenderMode,
  board: readonly DominoChainTile[],
  viewport: DominoViewport,
  openingTileId?: string | null,
): DominoBoardPresentation {
  if (mode === 'linear' || board.length === 0 || viewport.width === 0 || viewport.height === 0) return { kind: 'linear' }
  if (mode === 'bidirectional') {
    const layout = layoutBidirectionalDominoChain(board, viewport, openingTileId)
    return layout.viable ? { kind: 'bidirectional', layout } : { kind: 'linear' }
  }
  const layout = layoutDominoChain(board, viewport)
  return layout.viable ? { kind: 'serpentine', layout } : { kind: 'linear' }
}
