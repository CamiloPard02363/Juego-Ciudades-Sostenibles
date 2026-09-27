import { useEffect, useRef, useState } from 'react'
import { X, Zap } from 'lucide-react'
import studyArt from '../../assets/welcome/study.webp'
import competeArt from '../../assets/welcome/compete.webp'
import createArt from '../../assets/welcome/create.webp'
import exploreArt from '../../assets/welcome/explore.webp'
import studyIcon from '../../assets/welcome/emoji-study.webp'
import competeIcon from '../../assets/welcome/emoji-compete.webp'
import createIcon from '../../assets/welcome/emoji-create.webp'
import exploreIcon from '../../assets/welcome/emoji-explore.webp'

/**
 * Las cuatro formas de empezar que presenta la bienvenida. `width`/`height`
 * son el tamaño nativo de cada dibujo en px CSS (no todos tienen la misma
 * proporción), centrados en una franja de altura fija para que los títulos
 * de las cuatro columnas queden alineados. El icono del título (📚 🏆 🛠️ 🌐)
 * es una imagen y no el carácter emoji: así se ve igual en cualquier sistema
 * en vez de cambiar con la fuente de emojis de cada uno.
 */
const HIGHLIGHTS = [
  { icon: studyIcon, iconSize: [16, 17], title: 'Estudia Solo', text: 'Supera retos y materias a tu propio ritmo.', art: studyArt, width: 110, height: 105 },
  { icon: competeIcon, iconSize: [19, 19], title: 'Reta y Compite', text: 'Desafía a tus amigos o a la comunidad entera.', art: competeArt, width: 110, height: 103 },
  { icon: createIcon, iconSize: [18, 18], title: 'Crea tus Mundos', text: 'Transforma tus temas en juegos interactivos.', art: createArt, width: 104, height: 99 },
  { icon: exploreIcon, iconSize: [18, 17], title: 'Explora la Comunidad', text: 'Juega miles de retos creados por otros.', art: exploreArt, width: 109, height: 107 },
] as const

// Relleno lavanda de la tarjeta (`light-dark` sigue el `color-scheme` de cada
// tema: en claro el lavanda fijo del diseño, en oscuro un tinte del acento).
const CARD_TINT = 'light-dark(#e7e3fc, color-mix(in srgb, var(--accent) 14%, var(--surface)))'
// Violeta apagado del título (en claro #814dbf; en oscuro, un violeta claro sacado del acento).
const TITLE_COLOR =
  'light-dark(#814dbf, color-mix(in srgb, color-mix(in srgb, var(--accent) 85%, var(--accent-2)) 70%, var(--text)))'

// Piso de la reducción: ventanas absurdamente bajas (< ~180px) no pueden mostrarla entera; hasta ahí siempre cabe.
const MIN_FIT = 0.3
// Margen del overlay (p-4) arriba y abajo.
const OVERLAY_PADDING = 32

type WelcomeCardProps = {
  /** "¡Empezar a jugar!", la X, Escape y el clic fuera: todo lleva al inicio. */
  onClose: () => void
  /** "Ver guía rápida": abre el recorrido paso a paso. */
  onQuickGuide: () => void
}

/**
 * Tarjeta de bienvenida que sale en cada carga o login (ver `WelcomeTour`):
 * logo, título, las cuatro formas de empezar con sus dibujos y dos salidas —
 * "¡Empezar a jugar!" (cierra) y "Ver guía rápida" (abre el recorrido). El
 * resto de la pantalla queda desenfocada y oscurecida detrás.
 *
 * Nunca tiene scroll: si la ventana es más baja que la tarjeta (~589px en
 * escritorio, bastante más en el diseño 2×2 de móvil o ventanas angostas), se
 * reduce en proporción hasta caber entera y centrada; si cabe, el tamaño es el
 * de siempre (612px de ancho máximo).
 *
 * Colores y tipografía salen de los tokens del tema (acento, superficie,
 * texto), así que en oscuro/kids se adapta sola; los dibujos son WebP con
 * fondo transparente para no dejar recuadros claros sobre esos fondos.
 */
export function WelcomeCard({ onClose, onQuickGuide }: WelcomeCardProps) {
  const dialogRef = useRef<HTMLElement>(null)
  const fitBoxRef = useRef<HTMLDivElement>(null)
  // Factor (0.7–1) que hace caber la tarjeta en el alto de la ventana.
  const [fit, setFit] = useState(1)

  useEffect(() => {
    // Enfocar el diálogo (no un botón) deja el foco dentro sin dibujar un anillo sobre "Empezar a jugar".
    // Solo al abrir: `onClose` cambia en cada render del padre y no debe quitarle el foco a quien navega con Tab.
    dialogRef.current?.focus({ preventScroll: true })
  }, [])

  useEffect(() => {
    const box = fitBoxRef.current
    if (!box) return
    function update() {
      // `offsetHeight` es el alto de layout: no lo alteran ni la escala ni la animación de entrada.
      const wanted = (window.innerHeight - OVERLAY_PADDING) / (box as HTMLDivElement).offsetHeight
      const next = wanted < 1 ? Math.max(wanted, MIN_FIT) : 1
      setFit((previous) => (Math.abs(previous - next) > 0.004 ? next : previous))
    }
    // Se ejecuta al observar por primera vez (antes de pintar) y cuando cambia el alto de la tarjeta (fuentes, imágenes).
    const observer = new ResizeObserver(update)
    observer.observe(box)
    window.addEventListener('resize', update)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', update)
    }
  }, [])

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-black/55 p-4 backdrop-blur-sm animate-[modal-backdrop-in_0.2s_ease-out]"
      onClick={onClose}
      role="presentation"
    >
      {/* La escala va en este contenedor y no en la tarjeta: la animación de entrada de la tarjeta también usa `transform` y la pisaría.
          Sin `my-auto` ni scroll en el overlay: el centrado (items-center) es simétrico aunque el alto natural sea mayor que la ventana. */}
      <div
        ref={fitBoxRef}
        className="w-full max-w-[612px]"
        style={fit < 1 ? { transform: `scale(${fit})` } : undefined}
      >
        <section
          ref={dialogRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-labelledby="welcome-card-title"
          className="relative outline-none rounded-[22px] border-[4px] border-transparent px-5 pt-[36px] pb-[8px] text-center shadow-[0_24px_70px_-18px_rgba(0,0,0,0.55),inset_0_0_0_1px_rgba(255,255,255,0.5)] animate-[modal-panel-in_0.25s_cubic-bezier(0.16,1,0.3,1)]"
          style={{
            // Dos fondos: el relleno lavanda recortado al padding y, debajo, el
            // degradado rosa → violeta (al 65 %, como en el diseño) que asoma
            // solo en el borde de 4px.
            background: `linear-gradient(${CARD_TINT}, ${CARD_TINT}) padding-box, linear-gradient(90deg, color-mix(in srgb, var(--accent-2) 65%, transparent), color-mix(in srgb, var(--accent) 65%, transparent)) border-box`,
          }}
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar bienvenida"
            className="absolute top-[11px] right-[14px] rounded-full p-1.5 text-text transition-colors hover:bg-accent/10 hover:text-text-h focus-visible:outline-2 focus-visible:outline-accent"
          >
            <X className="h-[22px] w-[22px]" strokeWidth={2} aria-hidden="true" />
          </button>

          <div className="flex items-center justify-center gap-3">
            <span
              className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-[13px] text-white"
              style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))' }}
              aria-hidden="true"
            >
              <Zap className="h-[22px] w-[22px]" fill="currentColor" strokeWidth={0} />
            </span>
            <span className="text-[28px] font-medium tracking-tight text-text-h">NexusPlay</span>
          </div>

          {/* `font-sans`: la app pone Space Grotesk a los h2/h3; el diseño usa Manrope. */}
          <h2
            id="welcome-card-title"
            className="mt-[17.5px] font-sans text-[30.5px] leading-tight font-bold tracking-tight"
            style={{ color: TITLE_COLOR }}
          >
            ¡Bienvenido a NexusPlay!
          </h2>
          <p className="mx-auto mt-[7px] max-w-[440px] text-[14.5px] leading-[21px] text-text-h">
            Tu espacio para aprender jugando y crear tu propio camino de <strong>conocimiento</strong>. ¡Elige cómo quieres
            empezar hoy!
          </p>

          <ul className="mt-[21px] grid grid-cols-2 gap-y-6 min-[650px]:grid-cols-4">
            {HIGHLIGHTS.map((item) => (
              <li key={item.title} className="flex flex-col items-center">
                <span className="flex h-[107px] items-center justify-center">
                  <img src={item.art} alt="" width={item.width} height={item.height} loading="eager" draggable={false} />
                </span>
                <h3 className="mt-[11.3px] font-sans text-[14px] leading-[18px] font-bold tracking-tight text-text-h">
                  <img
                    src={item.icon}
                    alt=""
                    width={item.iconSize[0]}
                    height={item.iconSize[1]}
                    className="mr-1 inline-block align-[-4px]"
                    draggable={false}
                  />
                  {item.title}
                </h3>
                <p className="mx-auto mt-[5px] max-w-[122px] text-[12px] leading-[16.2px] font-medium text-text-h">{item.text}</p>
              </li>
            ))}
          </ul>

          <p className="mt-[21.3px] text-[15px] leading-tight font-bold text-text-h">¿Listo para subir de nivel?</p>

          <button
            type="button"
            onClick={onClose}
            className="mt-[15px] rounded-[14px] px-6 py-3 text-[13.7px] leading-[18px] font-semibold text-white shadow-[-6px_10px_20px_-8px_color-mix(in_srgb,var(--accent-2)_70%,transparent),6px_10px_20px_-8px_color-mix(in_srgb,var(--accent)_70%,transparent)] transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            style={{ background: 'linear-gradient(90deg, var(--accent-2), var(--accent))' }}
          >
            ¡Empezar a jugar!
          </button>

          <div className="mt-[6px]">
            <button
              type="button"
              onClick={onQuickGuide}
              className="rounded-lg px-3 py-1 text-[14.3px] font-medium text-text-h/75 transition-colors hover:text-text-h focus-visible:outline-2 focus-visible:outline-accent"
            >
              Ver guía rápida
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}
