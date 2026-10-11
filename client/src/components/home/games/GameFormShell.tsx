import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { PencilLine, X } from 'lucide-react'
import { AiDraftAppliedContext } from './aiDraftContext'

type GameFormShellProps = {
  /** Texto del botón de volver, sin la flecha (ej. "Cambiar modo"). */
  backLabel: string
  onBack: () => void
  title: string
  description: ReactNode
  /** El panel de <AiGameAssistantPanel /> ya configurado por el formulario. */
  aiPanel: ReactNode
  /**
   * Ancho máximo de la columna de campos en pantallas grandes. Por defecto
   * ahora no limita (solo lg:max-w-none) — el grid ya reparte el espacio
   * entre esta columna y el panel de IA, así que restringir el ancho acá
   * solo dejaba espacio muerto en pantallas anchas (feedback tras probar el
   * wizard multifase, issue #218).
   */
  formMaxWidthClassName?: string
  children: ReactNode
}

/**
 * Layout compartido por los 7 formularios de creación de juego: antes cada
 * uno centraba una sola columna angosta (max-w-[640/680/760px]) dejando
 * mucho espacio vacío a los lados en pantallas anchas. Ahora el panel de IA
 * pasa a una columna lateral fija (sticky en desktop, arriba del formulario
 * en mobile) sobre un fondo con desenfoques de color, aprovechando ese
 * espacio en vez de dejarlo muerto. El contenedor exterior también crece con
 * la pantalla (xl/2xl) en vez de topar siempre en 1180px, para que en
 * monitores grandes el formulario "respire" en vez de quedar en una columna
 * angosta centrada — en mobile sigue siendo una sola columna apilada.
 */
export function GameFormShell({
  backLabel,
  onBack,
  title,
  description,
  aiPanel,
  formMaxWidthClassName = 'lg:max-w-none',
  children,
}: GameFormShellProps) {
  // Cuántas veces se aplicó un borrador de IA (0 = nunca): cada aplicación
  // vuelve a mostrar el aviso aunque el usuario lo haya cerrado antes.
  const [aiDraftCount, setAiDraftCount] = useState(0)
  const [noticeDismissed, setNoticeDismissed] = useState(false)
  const noticeRef = useRef<HTMLDivElement>(null)

  const markAiDraftApplied = useCallback(() => {
    setAiDraftCount((count) => count + 1)
    setNoticeDismissed(false)
  }, [])

  // En mobile el panel de IA queda arriba y el aviso más abajo: se lleva a la vista.
  useEffect(() => {
    if (aiDraftCount > 0) noticeRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' })
  }, [aiDraftCount])

  const showAiNotice = aiDraftCount > 0 && !noticeDismissed

  return (
    <AiDraftAppliedContext.Provider value={markAiDraftApplied}>
    <div className="relative mx-auto max-w-[1180px] p-5 sm:p-8 xl:max-w-[1440px] 2xl:max-w-[1680px]">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden rounded-[32px]">
        <div className="absolute -top-24 -right-16 h-80 w-80 rounded-full bg-accent/20 blur-[110px]" />
        <div className="absolute top-1/3 -right-44 h-[460px] w-[460px] rounded-full bg-accent-2/20 blur-[130px]" />
        <div className="absolute bottom-[-10%] left-[-8%] h-72 w-72 rounded-full bg-accent/10 blur-[100px]" />
      </div>

      <div className="relative">
        <button
          type="button"
          className="mb-3 text-[12.5px] font-medium text-accent hover:underline"
          onClick={onBack}
        >
          ← {backLabel}
        </button>
        <h2 className="mb-1 text-[20px] tracking-tight text-text-h">{title}</h2>
        <p className="mb-6 max-w-[640px] text-[13px] text-text">{description}</p>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-10 xl:grid-cols-[minmax(0,1fr)_380px]">
          {/*
            Antes esta columna entera tenía su propio max-height + scroll
            interno (independiente del scroll de la página). Con muchos
            archivos subidos, un solo evento de rueda "grande" (mouse/
            trackpad con scroll acelerado) no siempre encadena el scroll
            sobrante hacia el contenedor de la página — algunos navegadores/
            dispositivos sí lo hacen con ticks pequeños, otros no con un
            evento grande, así que el usuario podía quedar "atrapado" sin
            poder bajar hasta el fondo del formulario. Ahora esta columna NO
            tiene scroll propio (solo sticky): AiGameAssistantPanel es solo
            un botón acá — su lista de archivos y el resto del chat viven en
            un modal aparte, con su propio scroll — así que los botones y el
            formulario de abajo siempre son alcanzables con el scroll normal
            de la página.
          */}
          <aside className="order-1 lg:order-2 lg:sticky lg:top-8">{aiPanel}</aside>
          <div className={`order-2 w-full lg:order-1 ${formMaxWidthClassName}`}>
            {showAiNotice && (
              <div
                ref={noticeRef}
                role="status"
                className="mb-5 flex items-start gap-3 rounded-xl border border-accent/40 bg-accent/10 px-4 py-3 text-[13px] leading-relaxed text-text-h"
              >
                <PencilLine className="mt-0.5 h-4 w-4 shrink-0 text-accent" strokeWidth={2.2} />
                <p className="flex-1">
                  La IA llenó el contenido y los ajustes del juego. <strong>Ahora te toca a ti:</strong> escribe el{' '}
                  <strong>nombre del juego</strong> y la <strong>descripción</strong>, y elige la{' '}
                  <strong>materia</strong> — la IA no los completa. Revisa también lo que generó antes de crear el
                  juego.
                </p>
                <button
                  type="button"
                  aria-label="Cerrar aviso"
                  className="shrink-0 rounded-md p-0.5 text-text hover:text-text-h"
                  onClick={() => setNoticeDismissed(true)}
                >
                  <X className="h-4 w-4" strokeWidth={2.2} />
                </button>
              </div>
            )}
            {children}
          </div>
        </div>
      </div>
    </div>
    </AiDraftAppliedContext.Provider>
  )
}
