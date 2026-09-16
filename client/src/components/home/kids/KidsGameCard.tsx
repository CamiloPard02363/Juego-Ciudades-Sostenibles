import { Gamepad2 } from 'lucide-react'
import type { GameSummary } from '../../../services/game.service'

type KidsGameCardProps = {
  game: GameSummary
  color: string
  onClick: () => void
}

/**
 * Tile grande y táctil para un juego dentro del Modo Kids: prioriza el
 * reconocimiento visual (portada o ícono + color) sobre el texto — solo el
 * título, sin descripción — para que un niño que todavía no lee con soltura
 * identifique el juego igual que reconocería un ícono de app en una
 * tablet. Área táctil generosa (min ~140px de alto) siguiendo el mismo
 * criterio de apps infantiles nativas.
 */
export function KidsGameCard({ game, color, onClick }: KidsGameCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col overflow-hidden rounded-[28px] border-4 text-left shadow-[0_10px_0_-2px_rgba(0,0,0,0.08)] transition-transform hover:-translate-y-1 active:translate-y-0 active:shadow-none"
      style={{ borderColor: color, background: 'var(--surface)' }}
    >
      <div
        className="flex h-[140px] items-center justify-center sm:h-[160px]"
        style={{ background: `linear-gradient(135deg, ${color}66, ${color}22)` }}
      >
        {game.theme.coverImageUrl ? (
          <img src={game.theme.coverImageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span
            aria-hidden="true"
            className="flex h-16 w-16 items-center justify-center rounded-3xl text-white"
            style={{ background: color, boxShadow: `0 0 0 6px ${color}33` }}
          >
            <Gamepad2 className="h-8 w-8" strokeWidth={2.5} />
          </span>
        )}
      </div>
      <div className="px-3 py-3 text-center">
        <p className="line-clamp-2 text-[16px] leading-snug font-extrabold text-text-h">{game.title}</p>
      </div>
    </button>
  )
}
