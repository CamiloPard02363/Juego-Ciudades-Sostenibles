import { GitCompareArrows, ImageIcon, Layers } from 'lucide-react'
import { Modal } from './Modal'
import type { MemoryMatchMode } from './memoryMatchTypes'

type GameModePickerProps = {
  onClose: () => void
  onSelect: (mode: MemoryMatchMode) => void
}

const MODE_OPTIONS: Array<{
  mode: MemoryMatchMode
  title: string
  description: string
  icon: typeof ImageIcon
}> = [
  {
    mode: 'PAIRS',
    title: 'Pares',
    description: 'Cada carta con imagen se empareja con la carta que nombra ese concepto.',
    icon: ImageIcon,
  },
  {
    mode: 'OPPOSITES',
    title: 'Conceptos opuestos',
    description: 'Empareja un aspecto positivo con su contraparte negativa.',
    icon: GitCompareArrows,
  },
]

/** Primer paso al crear un juego de cartas: elegir la variante de la mecánica de memoria. */
export function GameModePicker({ onClose, onSelect }: GameModePickerProps) {
  return (
    <Modal onClose={onClose} maxWidthClassName="max-w-[520px]">
      <div className="mb-6 flex items-center gap-3">
        <span
          className="flex h-10 w-10 items-center justify-center rounded-xl text-white"
          style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))' }}
        >
          <Layers className="h-5 w-5" strokeWidth={2} />
        </span>
        <div>
          <h2 className="text-[18px] tracking-tight text-text-h">Juego de cartas</h2>
          <p className="text-[13px] text-text">Elige cómo quieres que funcionen las parejas.</p>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {MODE_OPTIONS.map(({ mode, title, description, icon: Icon }) => (
          <button
            key={mode}
            type="button"
            className="flex items-start gap-3.5 rounded-xl border border-border p-4 text-left transition-colors hover:border-accent hover:bg-accent/5"
            onClick={() => onSelect(mode)}
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-code-bg text-accent">
              <Icon className="h-5 w-5" strokeWidth={2} />
            </span>
            <span>
              <span className="block text-[14.5px] font-semibold text-text-h">{title}</span>
              <span className="mt-0.5 block text-[12.5px] leading-snug text-text">{description}</span>
            </span>
          </button>
        ))}
      </div>

      <button
        type="button"
        className="mt-6 w-full rounded-lg border border-border px-4 py-2.5 text-[14px] font-medium text-text-h"
        onClick={onClose}
      >
        Cancelar
      </button>
    </Modal>
  )
}
