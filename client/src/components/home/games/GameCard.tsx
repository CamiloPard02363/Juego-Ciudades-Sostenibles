import { Archive, Gamepad2, Sparkles, User, Users } from 'lucide-react'
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
  /**
   * true cuando este es el juego recién creado que redirigió aquí (issue
   * #218): pinta un resaltado temporal (glow) con una minisección "Este es
   * el juego que acabas de crear" + CTA para abrirlo. GamesSection controla
   * cuándo desaparece (interacción o timeout), esta tarjeta solo pinta.
   */
  justCreated?: boolean
  /** Se dispara al interactuar con el resaltado (click en la tarjeta o en el CTA), para apagarlo ya. */
  onDismissJustCreated?: () => void
}

export function GameCard({
  game,
  onClick,
  color,
  isTypeArchived = false,
  edition,
  justCreated = false,
  onDismissJustCreated,
}: GameCardProps) {
  const accentColor = color ?? game.theme.primaryColor

  function handleClick() {
    if (justCreated) onDismissJustCreated?.()
    onClick()
  }

  const isMultiplayer = LIVE_ROOM_GAME_TYPES.includes(game.gameType)
  const modeColor = modeColorForGameType(game.gameType)
  return (
    <button
      type="button"
      onClick={handleClick}
      className={`group relative flex h-full min-w-0 w-full flex-col overflow-hidden rounded-2xl border bg-surface text-left shadow-[var(--shadow)] transition-transform hover:-translate-y-1 ${
        justCreated
          ? 'border-accent ring-2 ring-accent/60 shadow-[0_0_0_4px_rgba(var(--accent-rgb,59,130,246),0.15),0_0_28px_-4px_var(--accent)] animate-[glow-pulse_1.8s_ease-in-out_infinite]'
          : 'border-border'
      }`}
    >
      {justCreated && (
        <div className="absolute inset-x-0 top-0 z-20 flex items-center gap-1.5 bg-accent px-3 py-1.5 text-[11px] font-semibold text-white shadow-[var(--shadow)]">
          <Sparkles className="h-3.5 w-3.5 shrink-0" strokeWidth={2.5} />
          <span className="truncate">Este es el juego que acabas de crear</span>
          <span
            role="button"
            tabIndex={-1}
            className="ml-auto shrink-0 rounded-full bg-white/20 px-2 py-0.5 text-[10.5px] font-semibold"
          >
            Ábrelo aquí →
          </span>
        </div>
      )}
      {/* Izquierda: 1 jugador vs multijugador (ver LIVE_ROOM_GAME_TYPES), con
          color fijo por modo (issue #216, ver gameModeVisuals.ts) para que se
          distinga de un vistazo sin tener que leer el texto — a la derecha,
          si aplica, va "Tipo archivado". Bajan un poco si el banner de
          "recién creado" ya ocupa la franja superior. */}
      <span
        className={`absolute left-2 z-10 flex items-center gap-1 rounded-full px-2 py-1 text-[10.5px] font-semibold text-white shadow-[var(--shadow)] ${justCreated ? 'top-9' : 'top-2'}`}
        style={{ background: modeColor }}
        title={isMultiplayer ? 'Se juega con más personas, en una sala.' : 'Se juega en solitario.'}
      >
        {isMultiplayer ? <Users className="h-3 w-3" strokeWidth={2.5} /> : <User className="h-3 w-3" strokeWidth={2.5} />}
        {isMultiplayer ? 'Multijugador' : '1 jugador'}
      </span>
      {isTypeArchived && (
        <span
          className={`absolute right-2 z-10 flex items-center gap-1 rounded-full bg-surface/95 px-2 py-1 text-[10.5px] font-medium text-text shadow-[var(--shadow)] ${justCreated ? 'top-9' : 'top-2'}`}
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
