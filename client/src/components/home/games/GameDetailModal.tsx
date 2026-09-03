import type { GameDetail } from '../../../services/game.service'
import { Modal } from './Modal'

type GameDetailModalProps = {
  game: GameDetail
  onClose: () => void
  onPlay: () => void
}

export function GameDetailModal({ game, onClose, onPlay }: GameDetailModalProps) {
  return (
    <Modal onClose={onClose}>
      <div
        className="mb-5 flex h-32 items-center justify-center rounded-xl text-4xl"
        style={{
          background: `linear-gradient(135deg, ${game.theme.primaryColor}22, ${game.theme.primaryColor}0a)`,
        }}
      >
        {game.theme.coverImageUrl ? (
          <img
            src={game.theme.coverImageUrl}
            alt=""
            className="h-full w-full rounded-xl object-cover"
          />
        ) : (
          <span aria-hidden="true" style={{ color: game.theme.primaryColor }}>

          </span>
        )}
      </div>

      <h2 className="mb-2 text-[22px] tracking-tight text-text-h">{game.title}</h2>
      <p className="mb-6 text-[14px] leading-relaxed text-text">{game.description}</p>

      <div className="flex gap-2">
        <button
          type="button"
          className="flex-1 rounded-lg px-4 py-3 text-[15px] font-semibold text-white shadow-[0_8px_20px_-8px_var(--accent)] transition-transform hover:-translate-y-0.5"
          style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))' }}
          onClick={onPlay}
        >
          Jugar
        </button>
        <button
          type="button"
          className="rounded-lg border border-border px-4 py-3 text-[15px] font-medium text-text-h"
          onClick={onClose}
        >
          Cerrar
        </button>
      </div>
    </Modal>
  )
}
