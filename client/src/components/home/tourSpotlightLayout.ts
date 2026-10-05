import { useEffect, useState } from 'react'

export type SpotlightRect = { top: number; left: number; width: number; height: number }

/** Margen entre el elemento señalado y el borde del "agujero" iluminado. */
const PADDING = 8

/**
 * Sigue cuadro a cuadro la posición en pantalla del elemento que coincide
 * con `selector` (scroll de cualquier contenedor, menú que se contrae con
 * transición, cambio de tamaño de ventana, objetivo que aparece tarde porque
 * sus permisos cargan después…) y la devuelve con el margen ya aplicado.
 * `null` si no hay selector o el elemento no existe / no se ve.
 */
export function useSpotlightRect(selector: string | null): SpotlightRect | null {
  const [measured, setMeasured] = useState<{ selector: string; rect: SpotlightRect | null } | null>(null)

  useEffect(() => {
    if (!selector) return
    let frame = 0
    let last = ''
    const measure = () => {
      const box = document.querySelector(selector)?.getBoundingClientRect()
      const rect = !box || (box.width === 0 && box.height === 0) ? null : {
        top: Math.round(box.top - PADDING),
        left: Math.round(box.left - PADDING),
        width: Math.round(box.width + PADDING * 2),
        height: Math.round(box.height + PADDING * 2),
      }
      const key = JSON.stringify(rect)
      if (key !== last) {
        last = key
        setMeasured({ selector, rect })
      }
      frame = requestAnimationFrame(measure)
    }
    frame = requestAnimationFrame(measure)
    return () => cancelAnimationFrame(frame)
  }, [selector])

  return selector && measured?.selector === selector ? measured.rect : null
}

export type CardCorner = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'

/**
 * Elige la esquina de la pantalla donde poner la tarjeta del recorrido para
 * que NO tape el elemento iluminado: abajo a la derecha por defecto (como
 * siempre), y si choca, la primera esquina libre. Si ninguna queda libre
 * (pantallas muy pequeñas), la que menos se superpone.
 */
export function pickCardCorner(
  rect: SpotlightRect | null,
  card: { width: number; height: number },
  viewport: { width: number; height: number },
  margin = 24,
): CardCorner {
  const corners: CardCorner[] = ['bottom-right', 'bottom-left', 'top-right', 'top-left']
  if (!rect) return corners[0]
  const overlap = (corner: CardCorner) => {
    const left = corner.endsWith('right') ? viewport.width - margin - card.width : margin
    const top = corner.startsWith('bottom') ? viewport.height - margin - card.height : margin
    const x = Math.max(0, Math.min(left + card.width, rect.left + rect.width) - Math.max(left, rect.left))
    const y = Math.max(0, Math.min(top + card.height, rect.top + rect.height) - Math.max(top, rect.top))
    return x * y
  }
  return corners.reduce((best, corner) => (overlap(corner) < overlap(best) ? corner : best), corners[0])
}

/**
 * Tamaño máximo que ocupa la tarjeta del recorrido (mismos topes que
 * `.welcome-tour-card` en index.css y su `w-[min(360px,…)]`): se usa el
 * máximo para no depender de medir el DOM durante el render.
 */
export function tourCardBounds(viewport: { width: number; height: number }) {
  return {
    width: Math.min(360, viewport.width - 24),
    height: Math.min(440, viewport.height * 0.55),
  }
}

export const cardCornerClasses: Record<CardCorner, string> = {
  'bottom-right': 'right-3 bottom-3 sm:right-6 sm:bottom-6',
  'bottom-left': 'left-3 bottom-3 sm:left-6 sm:bottom-6',
  'top-right': 'right-3 top-3 sm:right-6 sm:top-6',
  'top-left': 'left-3 top-3 sm:left-6 sm:top-6',
}
