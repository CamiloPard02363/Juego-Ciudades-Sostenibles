import type { GameSummary } from '../../../services/game.service'

type GameCardProps = {
  game: GameSummary
  onClick: () => void
}

export function GameCard({ game, onClick }: GameCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col overflow-hidden rounded-2xl border border-border bg-bg text-left shadow-[var(--shadow)] transition-transform hover:-translate-y-0.5"
    >
      <div
        className="flex h-28 items-center justify-center text-3xl"
        style={{
          background: `linear-gradient(135deg, ${game.theme.primaryColor}22, ${game.theme.primaryColor}0a)`,
        }}
      >
        {game.theme.coverImageUrl ? (
          <img
            src={game.theme.coverImageUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <span aria-hidden="true" style={{ color: game.theme.primaryColor }}>

          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <h3 className="text-[15px] font-semibold text-text-h">{game.title}</h3>
        <p className="line-clamp-2 text-[13px] leading-snug text-text">{game.description}</p>
      </div>
    </button>
  )
}
