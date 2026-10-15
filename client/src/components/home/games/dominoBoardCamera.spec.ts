import { describe, expect, it } from 'vitest'
import { layoutBidirectionalDominoChain, type DominoChainTile } from './dominoChainLayout'
import { resolveDominoBoardPresentation } from './dominoBoardRenderMode'
import {
  DOMINO_LOGICAL_VIEWPORT_REFERENCE,
  centerDominoBoardCamera,
  dominoEndDropZoneFocus,
  dominoBoardCameraTransform,
  focusDominoBoardCamera,
  resolveDominoLogicalViewport,
} from './dominoBoardCamera'

function chain(count: number, openingIndex = Math.floor(count / 2)): DominoChainTile[] {
  return Array.from({ length: count }, (_, index) => ({ id: index === openingIndex ? 'opening' : `tile-${index}`, isDouble: false }))
}

function openingCenter(board: DominoChainTile[], logicalViewport = DOMINO_LOGICAL_VIEWPORT_REFERENCE) {
  const layout = layoutBidirectionalDominoChain(board, logicalViewport, 'opening')
  expect(layout.viable, layout.viable ? undefined : layout.reason).toBe(true)
  if (!layout.viable) throw new Error(layout.reason)
  const opening = layout.tiles.find((tile) => tile.id === 'opening')!
  return { x: opening.x + opening.width / 2, y: opening.y + opening.height / 2 }
}

function layoutFor(board: DominoChainTile[], logicalViewport = DOMINO_LOGICAL_VIEWPORT_REFERENCE) {
  const layout = layoutBidirectionalDominoChain(board, logicalViewport, 'opening')
  expect(layout.viable, layout.viable ? undefined : layout.reason).toBe(true)
  if (!layout.viable) throw new Error(layout.reason)
  return layout
}

function isVisible(
  focus: { x: number; y: number; width?: number; height?: number },
  camera: { x: number; y: number },
  viewport: { width: number; height: number },
) {
  return focus.x + camera.x >= 0
    && focus.y + camera.y >= 0
    && focus.x + (focus.width ?? 0) + camera.x <= viewport.width
    && focus.y + (focus.height ?? 0) + camera.y <= viewport.height
}

function growingChain(leftCount: number, rightCount: number): DominoChainTile[] {
  return [
    ...Array.from({ length: leftCount }, (_, offset) => ({ id: `left-${leftCount - offset}`, isDouble: false })),
    { id: 'opening', isDouble: false },
    ...Array.from({ length: rightCount }, (_, offset) => ({ id: `right-${offset + 1}`, isDouble: false })),
  ]
}

describe('tablero virtual de Dominexo', () => {
  it('separa el viewport visible del mundo lógico de referencia', () => {
    expect(resolveDominoLogicalViewport({ width: 1326, height: 403 })).toEqual(DOMINO_LOGICAL_VIEWPORT_REFERENCE)
  })

  it('no recorta una pantalla visible mayor que el mundo de referencia', () => {
    expect(resolveDominoLogicalViewport({ width: 1920, height: 1080 })).toEqual({ width: 1920, height: 1080 })
  })

  it.each([
    { width: 1366, height: 768 },
    { width: 1440, height: 900 },
    { width: 1920, height: 1080 },
  ])('centra la ficha inaugural en un viewport visible de $width × $height', (visible) => {
    const logical = resolveDominoLogicalViewport(visible)
    const center = openingCenter(chain(10), logical)
    const camera = centerDominoBoardCamera(visible, logical, center)

    expect(center.x + camera.x).toBeCloseTo(visible.width / 2)
    expect(center.y + camera.y).toBeCloseTo(visible.height / 2)
  })

  it('mantiene la cámara de apertura al agregar fichas', () => {
    const visible = { width: 1326, height: 403 }
    const logical = resolveDominoLogicalViewport(visible)
    const firstCamera = centerDominoBoardCamera(visible, logical, openingCenter(chain(3, 1), logical))
    const extendedCamera = centerDominoBoardCamera(visible, logical, openingCenter(chain(10, 5), logical))

    expect(extendedCamera).toEqual(firstCamera)
  })

  it('mantiene una traslación uniforme para las coordenadas relativas del mundo', () => {
    const camera = centerDominoBoardCamera(
      { width: 1326, height: 403 },
      DOMINO_LOGICAL_VIEWPORT_REFERENCE,
      { x: 780, y: 412 },
    )
    const first = { x: 120 + camera.x, y: 90 + camera.y }
    const second = { x: 460 + camera.x, y: 290 + camera.y }

    expect(second.x - first.x).toBe(340)
    expect(second.y - first.y).toBe(200)
    expect(dominoBoardCameraTransform(camera)).toMatch(/^translate3d\(/)
    expect(dominoBoardCameraTransform(camera)).not.toContain('scale')
  })

  it('muestra completamente las zonas de colocación de ambos extremos lógicos', () => {
    const visible = { width: 640, height: 360 }
    const layout = layoutFor(chain(21))
    for (const end of [layout.leftEnd, layout.rightEnd]) {
      const focus = dominoEndDropZoneFocus(end)
      const camera = focusDominoBoardCamera(visible, DOMINO_LOGICAL_VIEWPORT_REFERENCE, focus)
      expect(isVisible(focus, camera, visible)).toBe(true)
    }
  })

  it('sigue el extremo elegido al crecer y no mueve la cámara por crecimiento opuesto', () => {
    const visible = { width: 640, height: 360 }
    const before = layoutFor(growingChain(2, 1))
    const rightGrowth = layoutFor(growingChain(2, 3))
    const leftGrowth = layoutFor(growingChain(4, 1))
    const leftCamera = focusDominoBoardCamera(visible, DOMINO_LOGICAL_VIEWPORT_REFERENCE, dominoEndDropZoneFocus(before.leftEnd))
    const unchangedLeftCamera = focusDominoBoardCamera(visible, DOMINO_LOGICAL_VIEWPORT_REFERENCE, dominoEndDropZoneFocus(rightGrowth.leftEnd))
    const updatedLeftCamera = focusDominoBoardCamera(visible, DOMINO_LOGICAL_VIEWPORT_REFERENCE, dominoEndDropZoneFocus(leftGrowth.leftEnd))

    expect(unchangedLeftCamera).toEqual(leftCamera)
    expect(updatedLeftCamera).not.toEqual(leftCamera)
    expect(isVisible(dominoEndDropZoneFocus(leftGrowth.leftEnd), updatedLeftCamera, visible)).toBe(true)
  })

  it('recalcula el enfoque al redimensionar sin alterar la escala del mundo', () => {
    const layout = layoutFor(chain(14))
    const focus = dominoEndDropZoneFocus(layout.rightEnd)
    const compact = focusDominoBoardCamera({ width: 560, height: 320 }, DOMINO_LOGICAL_VIEWPORT_REFERENCE, focus)
    const wide = focusDominoBoardCamera({ width: 1120, height: 620 }, DOMINO_LOGICAL_VIEWPORT_REFERENCE, focus)

    expect(compact).not.toEqual(wide)
    expect(dominoBoardCameraTransform(compact)).not.toContain('scale')
    expect(dominoBoardCameraTransform(wide)).not.toContain('scale')
  })

  it('mantiene giros en un viewport visible bajo usando el mundo lógico', () => {
    const visible = { width: 1326, height: 403 }
    const logical = resolveDominoLogicalViewport(visible)
    const presentation = resolveDominoBoardPresentation('bidirectional', chain(10), logical, 'opening')

    expect(presentation.kind).toBe('bidirectional')
    if (presentation.kind === 'bidirectional') {
      expect(presentation.layout.tiles.some((tile) => tile.flowDirection === 'up' || tile.flowDirection === 'down')).toBe(true)
    }
  })

  it('conserva el fallback lineal si el mundo lógico no puede contener la cadena', () => {
    expect(resolveDominoBoardPresentation('bidirectional', chain(28), DOMINO_LOGICAL_VIEWPORT_REFERENCE, 'opening')).toEqual({ kind: 'linear' })
  })
})
