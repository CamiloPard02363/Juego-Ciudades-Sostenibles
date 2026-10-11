import { useLayoutEffect, useRef } from 'react'
import type { ReactNode } from 'react'

type FitScaleProps = {
  children: ReactNode
  /** Clases del recuadro: tiene que darle un tamaño definido (por ejemplo `h-full` dentro de un grid). */
  className?: string
  /** Clases del contenido (no pongas aquí ancho ni alto: los calcula el componente). */
  contentClassName?: string
  /** Ancho visual máximo del contenido, en px. Por defecto, todo el ancho del recuadro. */
  maxWidth?: number
  /** Escala mínima; por debajo de esto el contenido se recorta antes que verse ilegible. */
  minScale?: number
  align?: 'center' | 'top'
  /** Cambia cuando el contenido cambia de forma (paso de la guía, respuesta elegida...) para volver a medir. */
  fitKey?: string | number
}

/**
 * Hace que su contenido quepa SIEMPRE en el recuadro, sin scroll ni recortes:
 * lo mide y, si no cabe, lo reduce (y a la vez lo hace más ancho, para que el
 * texto ocupe menos líneas) hasta que entre. Así un mismo texto se ve grande
 * en una pantalla de escritorio y un poco más chico en un celular horizontal,
 * en vez de cortarse o necesitar scroll.
 *
 * Usa `transform: scale`, que no cambia el layout: medir y escalar no se
 * retroalimentan.
 */
export function FitScale({
  children,
  className = '',
  contentClassName = '',
  maxWidth,
  minScale = 0.5,
  align = 'center',
  fitKey,
}: FitScaleProps) {
  const boxRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const box = boxRef.current
    const content = contentRef.current
    if (!box || !content) return

    const fit = () => {
      const boxWidth = box.clientWidth
      const boxHeight = box.clientHeight
      if (boxWidth === 0 || boxHeight === 0) return
      const visualWidth = Math.min(boxWidth, maxWidth ?? boxWidth)
      let scale = 1
      for (;;) {
        content.style.width = `${visualWidth / scale}px`
        content.style.transform = `scale(${scale})`
        if (content.offsetHeight * scale <= boxHeight + 0.5 || scale <= minScale) break
        scale = Math.max(minScale, Math.round((scale - 0.04) * 100) / 100)
      }
      const visualHeight = content.offsetHeight * scale
      content.style.left = `${(boxWidth - visualWidth) / 2}px`
      content.style.top = `${align === 'center' ? Math.max(0, (boxHeight - visualHeight) / 2) : 0}px`
    }

    fit()
    // Se vuelve a medir si cambia el recuadro o el propio contenido (ej. cuando
    // la tipografía web termina de cargar y el texto cambia de alto). `fit`
    // siempre llega al mismo resultado con las mismas medidas, así que esto
    // no entra en un ciclo.
    const observer = new ResizeObserver(fit)
    observer.observe(box)
    observer.observe(content)
    const fonts = document.fonts
    fonts?.addEventListener?.('loadingdone', fit)
    return () => {
      observer.disconnect()
      fonts?.removeEventListener?.('loadingdone', fit)
    }
  }, [fitKey, maxWidth, minScale, align])

  return (
    <div ref={boxRef} className={`relative min-h-0 min-w-0 overflow-hidden ${className}`}>
      <div ref={contentRef} className={`absolute ${contentClassName}`} style={{ transformOrigin: 'top left' }}>
        {children}
      </div>
    </div>
  )
}
