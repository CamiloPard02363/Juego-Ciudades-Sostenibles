import { useState } from 'react'
import { Settings, Trash2 } from 'lucide-react'
import { updateGame, type GameDetail } from '../../../services/game.service'
import { useAuth } from '../../../hooks/useAuth'
import { ApiError } from '../../../utils/http'
import { Modal } from './Modal'

type GameDetailModalProps = {
  game: GameDetail
  canDelete: boolean
  deleting: boolean
  onClose: () => void
  onPlay: () => void
  onDelete: () => void
  onUpdated: (game: GameDetail) => void
  /** Color por psicología del color según la materia (ver `colorForGame` en GamesSection); si no llega, usa el del creador. */
  color?: string
}

export function GameDetailModal({
  game,
  canDelete,
  deleting,
  onClose,
  onPlay,
  onDelete,
  onUpdated,
  color,
}: GameDetailModalProps) {
  const { token } = useAuth()
  const accentColor = color ?? game.theme.primaryColor
  const isGuessWho = game.gameType === 'GUESS_WHO'
  const [confirming, setConfirming] = useState(false)
  const [editingConfig, setEditingConfig] = useState(false)
  const config = game.config as { maxAccusationCount?: number; turnDurationSeconds?: number }
  const [maxAccusationCount, setMaxAccusationCount] = useState(config.maxAccusationCount ?? 6)
  const [savingConfig, setSavingConfig] = useState(false)
  const [configError, setConfigError] = useState<string | null>(null)

  async function handleSaveConfig() {
    if (!token) return
    if (!Number.isInteger(maxAccusationCount) || maxAccusationCount < 2 || maxAccusationCount > 12) {
      setConfigError('Las cartas restantes para acusar deben ser un entero entre 2 y 12.')
      return
    }
    setSavingConfig(true)
    setConfigError(null)
    try {
      // El turno del juego ya no se edita aquí (vive en la sala de juego),
      // pero hay que reenviar el valor ya guardado: la API reemplaza el
      // config entero y de lo contrario lo resetearía a su default.
      const updated = await updateGame(token, game.id, {
        config: { maxAccusationCount, turnDurationSeconds: config.turnDurationSeconds },
      })
      onUpdated(updated)
      setEditingConfig(false)
    } catch (err) {
      setConfigError(err instanceof ApiError ? err.message : 'No se pudo guardar la configuración.')
    } finally {
      setSavingConfig(false)
    }
  }

  return (
    <Modal onClose={onClose}>
      <div
        className="mb-5 flex h-32 items-center justify-center rounded-xl text-4xl"
        style={{
          background: `linear-gradient(135deg, ${accentColor}22, ${accentColor}0a)`,
        }}
      >
        {game.theme.coverImageUrl ? (
          <img
            src={game.theme.coverImageUrl}
            alt=""
            className="h-full w-full rounded-xl object-cover"
          />
        ) : (
          <span aria-hidden="true" style={{ color: accentColor }}>

          </span>
        )}
      </div>

      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h2 className="mb-2 text-[22px] tracking-tight text-text-h">{game.title}</h2>
          <p className="text-[14px] leading-relaxed text-text">{game.description}</p>
        </div>
        {canDelete && !confirming && !editingConfig && (
          <div className="flex shrink-0 gap-2">
            {isGuessWho && (
              <button
                type="button"
                aria-label="Editar configuración del juego"
                title="Editar configuración"
                className="rounded-lg border border-border p-2 text-text/70 transition-colors hover:border-accent hover:bg-accent/10 hover:text-accent"
                onClick={() => setEditingConfig(true)}
              >
                <Settings className="h-4 w-4" strokeWidth={2} />
              </button>
            )}
            <button
              type="button"
              aria-label="Eliminar juego"
              title="Eliminar juego"
              className="rounded-lg border border-border p-2 text-text/70 transition-colors hover:border-danger hover:bg-danger/10 hover:text-danger"
              onClick={() => setConfirming(true)}
              disabled={deleting}
            >
              <Trash2 className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>
        )}
      </div>

      {editingConfig ? (
        <div className="mb-6 rounded-xl border border-border p-4">
          <p className="mb-3 text-[13.5px] font-semibold text-text-h">Configuración de la partida</p>
          <div>
            <label
              className="mb-1.5 block text-[13px] font-medium text-text-h"
              htmlFor="edit-max-accusation-count"
            >
              Cartas restantes para acusar
            </label>
            <input
              id="edit-max-accusation-count"
              type="number"
              min={2}
              max={12}
              className="w-full rounded-lg border border-border bg-bg px-[13px] py-2 text-[14px] text-text-h outline-none focus:border-accent"
              value={maxAccusationCount}
              disabled={savingConfig}
              onChange={(event) => setMaxAccusationCount(Number(event.target.value))}
            />
          </div>
          <p className="mt-2 text-[11.5px] text-text">
            Los segundos por turno se eligen al abrir la sala, justo antes de empezar la partida.
          </p>
          {configError && (
            <p className="mt-3 text-[12.5px] text-danger" role="alert">
              {configError}
            </p>
          )}
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              className="flex-1 rounded-lg px-3.5 py-2 text-[13px] font-semibold text-white shadow-[0_8px_20px_-8px_var(--accent)] disabled:cursor-not-allowed disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))' }}
              onClick={handleSaveConfig}
              disabled={savingConfig}
            >
              {savingConfig ? 'Guardando…' : 'Guardar cambios'}
            </button>
            <button
              type="button"
              className="rounded-lg border border-border px-3.5 py-2 text-[13px] font-medium text-text-h"
              onClick={() => {
                setEditingConfig(false)
                setConfigError(null)
                setMaxAccusationCount(config.maxAccusationCount ?? 6)
              }}
              disabled={savingConfig}
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : confirming ? (
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
