import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'

/** Píxeles de contenido oculto abajo a partir de los cuales vale la pena avisar. */
const MIN_HIDDEN_PX = 48

type ScrollMoreHintProps = {
  /**
   * `container` (por defecto): se coloca como ÚLTIMO hijo directo del
   * elemento con `overflow-y: auto` y se pega a su borde inferior.
   * `window`: para páginas que hacen scroll con la ventana (públicas, login…).
   */
  scope?: 'container' | 'window'
  /** Color de fondo del área, para que el degradado se funda con ella. */
  fade?: 'bg' | 'surface'
}

/**
 * Indicador de "hay más contenido abajo" (issue #240): un degradado en el
 * borde inferior + una píldora "Desliza para ver más" con una flecha que
 * rebota. Solo aparece cuando de verdad hay contenido oculto abajo y se
 * oculta al llegar al final; al tocarla, baja un tramo con scroll suave.
 *
 * La píldora usa los colores de texto/fondo invertidos del tema activo
 * (`text-h` sobre `bg`), así mantiene el máximo contraste con la página en
 * claro, oscuro y Kids sin depender del color de acento.
 *
 * No hay que conectarle ningún `ref`: busca solo su contenedor (el padre
 * directo) y vigila scroll, cambios de tamaño y contenido que carga después
 * (imágenes, listas que llegan de la API, cambios de ruta dentro del layout).
 */
export function ScrollMoreHint({ scope = 'container', fade = 'bg' }: ScrollMoreHintProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  // `sticky` se pega al borde del área de contenido, no al del contenedor:
  // con `padding` abajo (p. ej. el `p-8` del <main>) quedaría flotando por
  // encima del borde real. Se compensa con ese mismo padding.
  const [bottomOffset, setBottomOffset] = useState(0)

  useEffect(() => {
    const element = scope === 'window' ? document.scrollingElement : ref.current?.parentElement
    if (!element) return
    const scrollTarget: HTMLElement | Window = scope === 'window' ? window : (element as HTMLElement)

    let frame = 0
    const update = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const hidden = element.scrollHeight - element.clientHeight - element.scrollTop
        // Con un diálogo modal abierto encima (que no sea este mismo
        // contenedor), el aviso de la página de atrás sobra y podría
        // asomarse por encima del modal.
        const dialog = document.querySelector('[aria-modal="true"]')
        const coveredByDialog = !!dialog && !dialog.contains(element)
        setVisible(hidden > MIN_HIDDEN_PX && !coveredByDialog)
        if (scope === 'container') setBottomOffset(parseFloat(getComputedStyle(element).paddingBottom) || 0)
      })
    }

    const resize = new ResizeObserver(update)
    const observeChildren = () => {
      resize.observe(element)
      for (const child of Array.from(element.children)) resize.observe(child)
    }
    observeChildren()
    const mutation = new MutationObserver(() => {
      observeChildren()
      update()
    })
    mutation.observe(element, { childList: true, subtree: true })
    // Diálogos que se abren fuera de este contenedor (portales, paneles hermanos).
    const dialogs = new MutationObserver(update)
    dialogs.observe(document.body, { childList: true, subtree: true })
    scrollTarget.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    update()

    return () => {
      cancelAnimationFrame(frame)
      resize.disconnect()
      mutation.disconnect()
      dialogs.disconnect()
      scrollTarget.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [scope])

  function scrollDown() {
    const element = scope === 'window' ? document.scrollingElement : ref.current?.parentElement
    if (!element) return
    const top = Math.round(element.clientHeight * 0.7)
    if (scope === 'window') window.scrollBy({ top, behavior: 'smooth' })
    else element.scrollBy({ top, behavior: 'smooth' })
  }

  const wrapper = scope === 'window'
    ? 'pointer-events-none fixed inset-x-0 bottom-0 z-30 h-0'
    : 'pointer-events-none sticky bottom-0 z-30 h-0 shrink-0'
  const fadeColor = fade === 'surface' ? 'from-surface' : 'from-bg'

  return (
    <div
      ref={ref}
      className={wrapper}
      style={bottomOffset ? { bottom: -bottomOffset } : undefined}
      data-scroll-hint={visible ? 'visible' : 'hidden'}
    >
      <div
        aria-hidden="true"
        className={`absolute inset-x-0 bottom-0 h-14 bg-linear-to-t ${fadeColor} to-transparent transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
      />
      <button
        type="button"
        onClick={scrollDown}
        tabIndex={visible ? 0 : -1}
        aria-hidden={!visible}
        className={`absolute bottom-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full border-2 border-accent bg-text-h py-1.5 pr-3.5 pl-3 text-[12.5px] font-semibold whitespace-nowrap text-bg shadow-lg transition-opacity duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${visible ? 'pointer-events-auto opacity-100' : 'opacity-0'}`}
      >
        <ChevronDown className="h-4 w-4 animate-bounce" strokeWidth={2.75} aria-hidden="true" />
        Desliza para ver más
      </button>
    </div>
  )
}
