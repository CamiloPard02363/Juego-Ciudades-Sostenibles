import { Gamepad2 } from 'lucide-react'
import type { GameSummary } from '../../../services/game.service'

type GameCardProps = {
  game: GameSummary
  onClick: () => void
  /**
   * Color por psicología del color según la materia del juego (ver
   * `colorForGame` en GamesSection). Si no llega, cae al color que haya
   * elegido quien creó el juego (`game.theme.primaryColor`).
   */
  color?: string
}

export function GameCard({ game, onClick, color }: GameCardProps) {
  const accentColor = color ?? game.theme.primaryColor
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-surface text-left shadow-[var(--shadow)] transition-transform hover:-translate-y-1"
    >
      <div
        className="flex h-28 items-center justify-center text-3xl transition-[filter] group-hover:brightness-110"
        style={{
          background: `linear-gradient(135deg, ${accentColor}55, ${accentColor}15)`,
        }}
      >
        {game.theme.coverImageUrl ? (
          <img
            src={game.theme.coverImageUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <span
            aria-hidden="true"
            className="flex h-12 w-12 items-center justify-center rounded-xl text-white"
            style={{
              background: accentColor,
              boxShadow: `0 0 24px -4px ${accentColor}`,
            }}
          >
            <Gamepad2 className="h-6 w-6" strokeWidth={2} />
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <h3 className="text-[15px] font-semibold text-text-h">{game.title}</h3>
        <p className="line-clamp-2 text-[13px] leading-snug text-text">{game.description}</p>
        {game.creatorDisplayName && (
          <p className="mt-auto pt-1 text-[11.5px] font-medium text-text/70">
            Por {game.creatorDisplayName}
          </p>
        )}
      </div>
    </button>
  )
}
