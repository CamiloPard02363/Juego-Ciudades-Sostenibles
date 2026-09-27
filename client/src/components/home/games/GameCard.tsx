import { Archive, Gamepad2 } from 'lucide-react'
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
  /**
   * Solo lo pasa GamesSection cuando el requester es ADMIN (issue #156): un
   * ADMIN sigue viendo juegos de tipos archivados en todos lados, pero sin
   * esta marca no tendría forma de saberlo con solo mirar la tarjeta. Nunca
   * se muestra a no-ADMIN.
   */
  isTypeArchived?: boolean
}

export function GameCard({ game, onClick, color, isTypeArchived = false }: GameCardProps) {
  const accentColor = color ?? game.theme.primaryColor
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-surface text-left shadow-[var(--shadow)] transition-transform hover:-translate-y-1"
    >
      {isTypeArchived && (
        <span
          className="absolute right-2 top-2 z-10 flex items-center gap-1 rounded-full bg-surface/95 px-2 py-1 text-[10.5px] font-medium text-text shadow-[var(--shadow)]"
          title="Este tipo de juego está archivado: solo lo ven los administradores y no admite juegos nuevos."
        >
          <Archive className="h-3 w-3" strokeWidth={2.5} />
          Tipo archivado
        </span>
      )}
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
