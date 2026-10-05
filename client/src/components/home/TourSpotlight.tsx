import { createPortal } from 'react-dom'
import type { SpotlightRect } from './tourSpotlightLayout'

/**
 * Resaltado tipo "spotlight" del recorrido (issue #240): oscurece y
 * desenfoca TODA la pantalla excepto un hueco con la forma del elemento que
 * explica el paso, y dibuja un anillo pulsante del color de acento alrededor.
 *
 * Antes el resaltado subía el `z-index` del propio elemento por encima del
 * fondo oscuro, pero eso falla cuando el elemento vive dentro de un
 * contenedor con su propio contexto de apilamiento o con `overflow` (los
 * ítems del menú lateral recortaban el contorno): el elemento quedaba
 * borroso como el resto. Este overlay va en un portal a `<body>` y se
 * posiciona con coordenadas de pantalla, así que no depende de dónde esté el
 * elemento en el DOM.
 *
 * El hueco queda libre de verdad (no hay nada encima), así que el elemento
 * señalado sigue siendo clicable; los paneles alrededor absorben los clics
 * como lo hacía el fondo de antes.
 */
export function TourSpotlight({ rect }: { rect: SpotlightRect | null }) {
  if (!rect) {
    return createPortal(
      <div className="fixed inset-0 z-40 bg-black/55 backdrop-blur-sm" aria-hidden="true" />,
      document.body,
    )
  }
  const bottom = rect.top + rect.height
  const right = rect.left + rect.width
  // Cuatro paneles desenfocados alrededor del hueco (backdrop-filter no
  // admite "recortes"). El oscurecido va aparte, en la sombra gigante del
  // anillo, para que el hueco tenga las esquinas redondeadas.
  const blurPanel = 'tour-spotlight-panel fixed z-40 backdrop-blur-sm'
  return createPortal(
    <div aria-hidden="true">
      <div className={blurPanel} style={{ top: 0, left: 0, right: 0, height: Math.max(0, rect.top) }} />
      <div className={blurPanel} style={{ top: bottom, left: 0, right: 0, bottom: 0 }} />
      <div className={blurPanel} style={{ top: rect.top, left: 0, width: Math.max(0, rect.left), height: rect.height }} />
      <div className={blurPanel} style={{ top: rect.top, left: right, right: 0, height: rect.height }} />
      <div
        data-testid="tour-spotlight"
        className="tour-spotlight-ring pointer-events-none fixed z-40 rounded-2xl"
        style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height }}
      />
    </div>,
    document.body,
  )
}
