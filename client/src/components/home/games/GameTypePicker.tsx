import { Layers, UserRoundSearch } from 'lucide-react'
import { Modal } from './Modal'

export type GameTypeChoice = 'CARDS' | 'GUESS_WHO'

type GameTypePickerProps = {
  onClose: () => void
  onSelect: (choice: GameTypeChoice) => void
}

const TYPE_OPTIONS: Array<{
  choice: GameTypeChoice
  title: string
  description: string
  icon: typeof Layers
}> = [
  {
    choice: 'CARDS',
    title: 'Cartas',
    description: 'Juego de memoria: parejas de imagen y concepto, o conceptos opuestos.',
    icon: Layers,
  },
  {
    choice: 'GUESS_WHO',
    title: '¿Quién Es?',
    description: 'Es un juego parecido a Adivina Quién: dos jugadores, cada uno adivina la tarjeta secreta del otro.',
    icon: UserRoundSearch,
  },
]

/** Primer paso al crear un juego: elegir la mecánica base. */
export function GameTypePicker({ onClose, onSelect }: GameTypePickerProps) {
  return (
    <Modal onClose={onClose} maxWidthClassName="max-w-[520px]">
      <h2 className="mb-1 text-[20px] tracking-tight text-text-h">Nueva partida</h2>
      <p className="mb-6 text-[13px] text-text">Elige qué tipo de juego quieres crear.</p>

      <div className="flex flex-col gap-3">
        {TYPE_OPTIONS.map(({ choice, title, description, icon: Icon }) => (
          <button
            key={choice}
            type="button"
            className="flex items-start gap-3.5 rounded-xl border border-border p-4 text-left transition-colors hover:border-accent hover:bg-accent/5"
            onClick={() => onSelect(choice)}
          >
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white"
              style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))' }}
            >
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
