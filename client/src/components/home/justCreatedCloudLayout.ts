import type { SpotlightRect } from './tourSpotlightLayout'

export type CloudSide = 'top' | 'bottom' | 'left' | 'right'

export type CloudPlacement = {
  /** Lado de la tarjeta donde queda la nube (la cola apunta hacia la tarjeta). */
  side: CloudSide
  top: number
  left: number
  width: number
  /** Alto máximo permitido para que la nube nunca tape la tarjeta; el contenido hace scroll si lo excede. */
  maxHeight: number
  /** Distancia (px) desde el borde de la nube hasta el centro de la cola, a lo largo del lado pegado a la tarjeta. */
  tailOffset: number
}

/** Ancho preferido de la nube en escritorio. */
export const CLOUD_MAX_WIDTH = 380
/** Por debajo de este ancho de pantalla la nube ocupa todo el ancho y solo va arriba o abajo. */
export const CLOUD_COMPACT_BREAKPOINT = 640
const TAIL_EDGE = 24

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max))

/**
 * Decide dónde poner la nube del foco post-creación (issue #2) respecto a la
 * tarjeta iluminada. Orden de preferencia: abajo, arriba, derecha, izquierda
 * (lado lateral solo en pantallas anchas). Si ninguno cabe completo se usa el
 * de mayor espacio y se limita el alto (`maxHeight`) para que la nube jamás
 * se superponga a la tarjeta ni se salga de la pantalla.
 *
 * `cloud` es el tamaño medido (o estimado) del contenido; en modo compacto el
 * ancho se ignora y se usa todo el ancho útil.
 */
export function pickCloudPlacement(
  rect: SpotlightRect,
  cloud: { width: number; height: number },
  viewport: { width: number; height: number },
  gap = 18,
  margin = 12,
): CloudPlacement {
  const compact = viewport.width < CLOUD_COMPACT_BREAKPOINT
  const width = compact ? viewport.width - margin * 2 : Math.min(cloud.width, CLOUD_MAX_WIDTH, viewport.width - margin * 2)
  const rectBottom = rect.top + rect.height
  const rectRight = rect.left + rect.width

  const space: Record<CloudSide, number> = {
    bottom: viewport.height - rectBottom - margin - gap,
    top: rect.top - margin - gap,
    right: viewport.width - rectRight - margin - gap,
    left: rect.left - margin - gap,
  }
  const sides: CloudSide[] = compact ? ['bottom', 'top'] : ['bottom', 'top', 'right', 'left']
  const fits = (side: CloudSide) =>
    side === 'top' || side === 'bottom' ? space[side] >= cloud.height : space[side] >= width
  const side = sides.find(fits) ?? sides.reduce((best, s) => (space[s] > space[best] ? s : best), sides[0])

  const vertical = side === 'top' || side === 'bottom'
  const maxHeight = Math.max(120, vertical ? space[side] : viewport.height - margin * 2)
  const height = Math.min(cloud.height, maxHeight)
  const centerX = rect.left + rect.width / 2
  const centerY = rect.top + rect.height / 2

  if (vertical) {
    const left = clamp(centerX - width / 2, margin, viewport.width - margin - width)
    const top = side === 'bottom' ? rectBottom + gap : rect.top - gap - height
    return { side, top, left, width, maxHeight, tailOffset: clamp(centerX - left, TAIL_EDGE, Math.max(TAIL_EDGE, width - TAIL_EDGE)) }
  }
  const top = clamp(centerY - height / 2, margin, Math.max(margin, viewport.height - margin - height))
  const left = side === 'right' ? rectRight + gap : rect.left - gap - width
  return { side, top, left, width, maxHeight, tailOffset: clamp(centerY - top, TAIL_EDGE, Math.max(TAIL_EDGE, height - TAIL_EDGE)) }
}
