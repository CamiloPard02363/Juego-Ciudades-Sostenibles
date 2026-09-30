import { Archive, Gamepad2, User, Users } from 'lucide-react'
import type { GameSummary } from '../../../services/game.service'
import { LIVE_ROOM_GAME_TYPES } from './resolveRoomCode'
import { modeColorForGameType } from './gameModeVisuals'

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
  edition?: string
}

export function GameCard({ game, onClick, color, isTypeArchived = false, edition }: GameCardProps) {
  const accentColor = color ?? game.theme.primaryColor
  const isMultiplayer = LIVE_ROOM_GAME_TYPES.includes(game.gameType)
  const modeColor = modeColorForGameType(game.gameType)
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative flex h-full min-w-0 w-full flex-col overflow-hidden rounded-2xl border border-border bg-surface text-left shadow-[var(--shadow)] transition-transform hover:-translate-y-1"
    >
      {/* Izquierda: 1 jugador vs multijugador (ver LIVE_ROOM_GAME_TYPES), con
          color fijo por modo (issue #216, ver gameModeVisuals.ts) para que se
          distinga de un vistazo sin tener que leer el texto — a la derecha,
          si aplica, va "Tipo archivado". */}
      <span
        className="absolute left-2 top-2 z-10 flex items-center gap-1 rounded-full px-2 py-1 text-[10.5px] font-semibold text-white shadow-[var(--shadow)]"
        style={{ background: modeColor }}
        title={isMultiplayer ? 'Se juega con más personas, en una sala.' : 'Se juega en solitario.'}
      >
        {isMultiplayer ? <Users className="h-3 w-3" strokeWidth={2.5} /> : <User className="h-3 w-3" strokeWidth={2.5} />}
        {isMultiplayer ? 'Multijugador' : '1 jugador'}
      </span>
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
        className="flex h-28 shrink-0 items-center justify-center text-3xl transition-[filter] group-hover:brightness-110"
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
        {edition ? (
          <div className="space-y-1">
            <h3 className="text-[22px] font-bold leading-tight text-text-h [overflow-wrap:anywhere]">{game.title}</h3>
            <p className="text-[14px] font-medium text-text">{edition}</p>
          </div>
        ) : (
          <h3 className="text-[15px] font-semibold text-text-h">{game.title}</h3>
        )}
        <p className="text-[13px] leading-snug text-text [overflow-wrap:anywhere]">{game.description}</p>
        {game.creatorDisplayName && (
          <p className="mt-auto pt-1 text-[11.5px] font-medium text-text/70">
            Por {game.creatorDisplayName}
          </p>
        )}
      </div>
    </button>
  )
}
