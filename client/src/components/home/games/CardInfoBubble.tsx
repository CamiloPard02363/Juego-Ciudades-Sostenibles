import { useEffect, useRef, useState } from 'react'
import { Info, X } from 'lucide-react'

type CardInfoBubbleProps = {
  info: string
  label: string
}

/**
 * Insignia "i" en la esquina de una tarjeta/bandera que, al tocarla,
 * despliega un dato breve sobre el tema de esa tarjeta (ej. un dato del país
 * si la tarjeta es una bandera). Se usa en "¿Quién Es?" — tablero de
 * descarte, tarjeta secreta propia, modal de acusación y tarjeta revelada al
 * terminar la partida.
 *
 * Quien la usa debe envolverla en un contenedor propio con `relative` que NO
 * tenga `overflow-hidden` (la imagen de la tarjeta sí puede tenerlo aparte)
 * — si no, el globo de texto queda recortado por los bordes redondeados de
 * la imagen.
 */
export function CardInfoBubble({ info, label }: CardInfoBubbleProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handlePointerDown(event: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [open])

  return (
    <div ref={rootRef} className="absolute top-1 left-1 z-20">
      <button
        type="button"
        className="flex h-5 w-5 items-center justify-center rounded-full text-white shadow-[0_2px_8px_-2px_rgba(0,0,0,0.6)] transition-transform hover:scale-110"
        style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))' }}
        onClick={(event) => {
          event.preventDefault()
          event.stopPropagation()
          setOpen((current) => !current)
        }}
        aria-label={`Dato sobre ${label}`}
        aria-expanded={open}
      >
        <Info className="h-3 w-3" strokeWidth={2.5} />
      </button>

      {open && (
        <div
          role="tooltip"
          className="absolute top-6 left-0 w-44 rounded-lg border border-accent/40 bg-surface p-2.5 text-[11px] leading-snug text-text shadow-[var(--shadow)] animate-[fade-in-up_0.15s_ease-out]"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="mb-1 flex items-center justify-between gap-2">
            <span className="truncate text-[10px] font-semibold tracking-wide text-accent uppercase">{label}</span>
            <button
              type="button"
              className="shrink-0 text-text/50 hover:text-text"
              onClick={(event) => {
                event.stopPropagation()
                setOpen(false)
              }}
              aria-label="Cerrar"
            >
              <X className="h-3 w-3" strokeWidth={2.5} />
            </button>
          </div>
          {info}
        </div>
      )}
    </div>
  )
}
