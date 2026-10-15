import type { DominoViewport, Point } from './dominoChainLayout'

/** Superficie mínima del mundo lógico: permite giros sin reducir las fichas. */
export const DOMINO_LOGICAL_VIEWPORT_REFERENCE: DominoViewport = { width: 1560, height: 824 }

export type DominoBoardCamera = Readonly<{ x: number; y: number }>
export type DominoCameraDestination = 'left' | 'opening' | 'right'
export type DominoCameraFocus = Readonly<{ x: number; y: number; width?: number; height?: number }>

/** Tamaño visual de EndDropZone y margen mínimo para tocarlo sin quedar al borde. */
export const DOMINO_END_DROP_ZONE = { width: 40, height: 68, margin: 24 } as const

/**
 * El mundo nunca es menor que la zona visible. Así las pantallas grandes no
 * quedan recortadas por la referencia y las compactas conservan el área para
 * formar giros.
 */
export function resolveDominoLogicalViewport(visibleViewport: DominoViewport): DominoViewport {
  return {
    width: Math.max(DOMINO_LOGICAL_VIEWPORT_REFERENCE.width, visibleViewport.width),
    height: Math.max(DOMINO_LOGICAL_VIEWPORT_REFERENCE.height, visibleViewport.height),
  }
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value))
}

/** Centra un punto del mundo lógico sin permitir que la cámara revele un vacío exterior. */
export function centerDominoBoardCamera(
  visibleViewport: DominoViewport,
  logicalViewport: DominoViewport,
  focus: Point,
): DominoBoardCamera {
  return focusDominoBoardCamera(visibleViewport, logicalViewport, focus)
}

/**
 * Lleva un punto o rectángulo del mundo al centro del viewport visible. El
 * recorte se limita a los bordes del mundo lógico, sin revelar espacio vacío.
 */
export function focusDominoBoardCamera(
  visibleViewport: DominoViewport,
  logicalViewport: DominoViewport,
  focus: DominoCameraFocus,
): DominoBoardCamera {
  const minimumX = Math.min(0, visibleViewport.width - logicalViewport.width)
  const minimumY = Math.min(0, visibleViewport.height - logicalViewport.height)
  const centerX = focus.x + (focus.width ?? 0) / 2
  const centerY = focus.y + (focus.height ?? 0) / 2
  return {
    x: clamp(visibleViewport.width / 2 - centerX, minimumX, 0),
    y: clamp(visibleViewport.height / 2 - centerY, minimumY, 0),
  }
}

/** Rectángulo completo de la zona interactiva asociada a un extremo lógico. */
export function dominoEndDropZoneFocus(end: Point): DominoCameraFocus {
  return {
    x: end.x - DOMINO_END_DROP_ZONE.width / 2,
    y: end.y - DOMINO_END_DROP_ZONE.height / 2,
    width: DOMINO_END_DROP_ZONE.width,
    height: DOMINO_END_DROP_ZONE.height,
  }
}

/** La cámara mueve el mundo; no cambia el tamaño de fichas, texto ni iconos. */
export function dominoBoardCameraTransform(camera: DominoBoardCamera): string {
  return `translate3d(${camera.x}px, ${camera.y}px, 0)`
}
