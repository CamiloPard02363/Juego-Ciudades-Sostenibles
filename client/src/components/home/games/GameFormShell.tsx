import type { ReactNode } from 'react'

type GameFormShellProps = {
  /** Texto del botón de volver, sin la flecha (ej. "Cambiar modo"). */
  backLabel: string
  onBack: () => void
  title: string
  description: ReactNode
  /** El panel de <AiGameAssistantPanel /> ya configurado por el formulario. */
  aiPanel: ReactNode
  /** Ancho máximo de la columna de campos — se mantiene angosta para que los inputs no queden estirados. */
  formMaxWidthClassName?: string
  children: ReactNode
}

/**
 * Layout compartido por los 7 formularios de creación de juego: antes cada
 * uno centraba una sola columna angosta (max-w-[640/680/760px]) dejando
 * mucho espacio vacío a los lados en pantallas anchas. Ahora el panel de IA
 * pasa a una columna lateral fija (sticky en desktop, arriba del formulario
 * en mobile) sobre un fondo con desenfoques de color, aprovechando ese
 * espacio en vez de dejarlo muerto.
 */
export function GameFormShell({
  backLabel,
  onBack,
  title,
  description,
  aiPanel,
  formMaxWidthClassName = 'lg:max-w-[640px]',
  children,
}: GameFormShellProps) {
  return (
    <div className="relative mx-auto max-w-[1180px] p-8">
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

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-10">
          <aside className="order-1 lg:order-2 lg:sticky lg:top-8">{aiPanel}</aside>
          <div className={`order-2 w-full lg:order-1 ${formMaxWidthClassName}`}>{children}</div>
        </div>
      </div>
    </div>
  )
}
