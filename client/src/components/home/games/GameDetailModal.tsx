import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import type { GameDetail } from '../../../services/game.service'
import { Modal } from './Modal'

type GameDetailModalProps = {
  game: GameDetail
  canDelete: boolean
  deleting: boolean
  onClose: () => void
  onPlay: () => void
  onDelete: () => void
}

export function GameDetailModal({
  game,
  canDelete,
  deleting,
  onClose,
  onPlay,
  onDelete,
}: GameDetailModalProps) {
  const isGuessWho = game.gameType === 'GUESS_WHO'
  const [confirming, setConfirming] = useState(false)

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

      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h2 className="mb-2 text-[22px] tracking-tight text-text-h">{game.title}</h2>
          <p className="text-[14px] leading-relaxed text-text">{game.description}</p>
        </div>
        {canDelete && !confirming && (
          <button
            type="button"
            aria-label="Eliminar juego"
            title="Eliminar juego"
            className="shrink-0 rounded-lg border border-border p-2 text-text/70 transition-colors hover:border-danger hover:bg-danger/10 hover:text-danger"
            onClick={() => setConfirming(true)}
            disabled={deleting}
          >
            <Trash2 className="h-4 w-4" strokeWidth={2} />
          </button>
        )}
      </div>

      {confirming ? (
        <div className="mb-6 rounded-xl border border-danger/35 bg-danger/10 p-4">
          <p className="mb-3 text-[13.5px] leading-snug text-text-h">
            ¿Eliminar "{game.title}"? Esta acción no se puede deshacer y el juego dejará de
            estar disponible para todos.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              className="flex-1 rounded-lg bg-danger px-3.5 py-2 text-[13px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              onClick={onDelete}
              disabled={deleting}
            >
              {deleting ? 'Eliminando…' : 'Sí, eliminar'}
            </button>
            <button
              type="button"
              className="rounded-lg border border-border px-3.5 py-2 text-[13px] font-medium text-text-h"
              onClick={() => setConfirming(false)}
              disabled={deleting}
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <button
            type="button"
            className="flex-1 rounded-lg px-4 py-3 text-[15px] font-semibold text-white shadow-[0_8px_20px_-8px_var(--accent)] transition-transform hover:-translate-y-0.5"
            style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))' }}
            onClick={onPlay}
          >
            {isGuessWho ? 'Abrir sala' : 'Jugar'}
          </button>
          <button
            type="button"
            className="rounded-lg border border-border px-4 py-3 text-[15px] font-medium text-text-h"
            onClick={onClose}
          >
            Cerrar
          </button>
        </div>
      )}
    </Modal>
  )
}
