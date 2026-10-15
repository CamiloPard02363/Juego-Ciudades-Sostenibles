export type DominoTooltipRect = {
  left: number
  top: number
  right: number
  bottom: number
  width: number
  height: number
}

export type DominoTooltipViewport = {
  width: number
  height: number
}

export type DominoTooltipPlacement = {
  left: number
  top: number
  side: 'top' | 'bottom'
}

const EDGE_GAP = 12
const ANCHOR_GAP = 10

/** Posiciona el tooltip en el viewport real, independiente del mundo virtual. */
export function resolveDominoTooltipPlacement(
  anchor: DominoTooltipRect,
  tooltip: Pick<DominoTooltipRect, 'width' | 'height'>,
  viewport: DominoTooltipViewport,
): DominoTooltipPlacement {
  const left = Math.min(
    Math.max(EDGE_GAP, anchor.left + anchor.width / 2 - tooltip.width / 2),
    Math.max(EDGE_GAP, viewport.width - tooltip.width - EDGE_GAP),
  )
  const canShowBelow = anchor.bottom + ANCHOR_GAP + tooltip.height <= viewport.height - EDGE_GAP
  const side = canShowBelow || anchor.top < tooltip.height + ANCHOR_GAP + EDGE_GAP ? 'bottom' : 'top'
  const top = side === 'bottom'
    ? Math.min(anchor.bottom + ANCHOR_GAP, viewport.height - tooltip.height - EDGE_GAP)
    : Math.max(EDGE_GAP, anchor.top - tooltip.height - ANCHOR_GAP)

  return { left, top, side }
}
