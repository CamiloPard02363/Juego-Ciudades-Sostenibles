import { useMemo, useState } from 'react'
import type { GameDetail } from '../../../services/game.service'
import type { MemoryMatchPair } from './memoryMatchTypes'
import { Modal } from './Modal'

type Difficulty = 'relaxed' | 'normal' | 'challenging'

const DIFFICULTIES: { id: Difficulty; label: string; description: string; timeMultiplier: number }[] = [
  { id: 'relaxed', label: 'Relajado', description: 'Más tiempo por zona, ideal para aprender.', timeMultiplier: 1.4 },
  { id: 'normal', label: 'Normal', description: 'El ritmo pensado por quien creó el juego.', timeMultiplier: 1 },
  { id: 'challenging', label: 'Desafiante', description: 'Menos tiempo, más puntos por combo.', timeMultiplier: 0.7 },
]

type PlayOptionsPopupProps = {
  game: GameDetail
  onClose: () => void
  onStart: (options: { pairCount: number; difficulty: Difficulty; showPreview: boolean }) => void
}

export function PlayOptionsPopup({ game, onClose, onStart }: PlayOptionsPopupProps) {
  const totalPairsAvailable = (game.content as MemoryMatchPair[]).length
  const [pairCount, setPairCount] = useState(Math.min(8, totalPairsAvailable))
  const [difficulty, setDifficulty] = useState<Difficulty>('normal')
  const [showPreview, setShowPreview] = useState(true)

  const pairOptions = useMemo(() => {
    const steps = [4, 8, 12, 16, 20, totalPairsAvailable].filter(
      (value, index, all) => value <= totalPairsAvailable && all.indexOf(value) === index,
    )
    return steps.length > 0 ? steps : [totalPairsAvailable]
  }, [totalPairsAvailable])

  return (
    <Modal onClose={onClose}>
      <h2 className="mb-1 text-[20px] tracking-tight text-text-h">Antes de empezar</h2>
      <p className="mb-6 text-[13px] text-text">Elige cómo quieres jugar {game.title}.</p>

      <div className="mb-6">
        <p className="mb-2.5 text-[12px] font-semibold tracking-wide text-text/70 uppercase">
          Cantidad de parejas
        </p>
        <div className="flex flex-wrap gap-2">
          {pairOptions.map((count) => (
            <button
              key={count}
              type="button"
              className={`rounded-lg border px-3.5 py-2 text-[13px] font-medium transition-colors ${
                pairCount === count
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-border text-text-h hover:bg-code-bg'
              }`}
              onClick={() => setPairCount(count)}
            >
              {count}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-6">
        <p className="mb-2.5 text-[12px] font-semibold tracking-wide text-text/70 uppercase">
          Dificultad
        </p>
        <div className="flex flex-col gap-2">
          {DIFFICULTIES.map((option) => (
            <button
              key={option.id}
              type="button"
              className={`rounded-lg border px-3.5 py-2.5 text-left transition-colors ${
                difficulty === option.id
                  ? 'border-accent bg-accent/10'
                  : 'border-border hover:bg-code-bg'
              }`}
              onClick={() => setDifficulty(option.id)}
            >
              <p className="text-[13px] font-medium text-text-h">{option.label}</p>
              <p className="text-[12px] text-text">{option.description}</p>
            </button>
          ))}
        </div>
      </div>

      <label className="mb-6 flex items-center gap-2.5 text-[13px] text-text-h">
        <input
          type="checkbox"
          checked={showPreview}
          onChange={(event) => setShowPreview(event.target.checked)}
          className="h-4 w-4 accent-accent"
        />
        Mostrar las cartas unos segundos antes de empezar
      </label>

      <div className="flex gap-2">
        <button
          type="button"
          className="flex-1 rounded-lg bg-accent px-4 py-3 text-[15px] font-medium text-white dark:text-bg"
          onClick={() => onStart({ pairCount, difficulty, showPreview })}
        >
          Empezar
        </button>
        <button
          type="button"
          className="rounded-lg border border-border px-4 py-3 text-[15px] font-medium text-text-h"
          onClick={onClose}
        >
          Cancelar
        </button>
      </div>
    </Modal>
  )
}

export type { Difficulty }
export { DIFFICULTIES }
