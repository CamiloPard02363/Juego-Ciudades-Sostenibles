import type { MemoryMatchPair } from './memoryMatchTypes'
import type { Difficulty } from './PlayOptionsPopup'
import { useMemoryMatchGame } from './useMemoryMatchGame'

type MemoryMatchGameProps = {
  title: string
  primaryColor: string
  pairs: MemoryMatchPair[]
  pairCount: number
  difficulty: Difficulty
  showPreview: boolean
  perZone: number
  timePerZoneSeconds: number
  previewSeconds: number
  onExit: () => void
}

export function MemoryMatchGame({
  title,
  primaryColor,
  pairs,
  pairCount,
  difficulty,
  showPreview,
  perZone,
  timePerZoneSeconds,
  previewSeconds,
  onExit,
}: MemoryMatchGameProps) {
  const game = useMemoryMatchGame({
    pairs,
    pairCount,
    difficulty,
    showPreview,
    perZone,
    baseTimePerZoneSeconds: timePerZoneSeconds,
    previewSeconds,
  })

  const minutes = Math.floor(game.timeLeft / 60)
    .toString()
    .padStart(2, '0')
  const seconds = (game.timeLeft % 60).toString().padStart(2, '0')

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-bg">
      <div className="mx-auto flex min-h-full max-w-[820px] flex-col p-5 sm:p-8">
        <header className="relative mb-5 text-center">
          <button
            type="button"
            className="absolute left-0 top-0 rounded-lg border border-border px-3 py-1.5 text-[12px] font-medium text-text-h"
            onClick={onExit}
          >
            ← Salir
          </button>
          <p className="text-[12px] font-semibold uppercase tracking-wide text-accent">{title}</p>
          <h1 className="mt-1 text-[20px] tracking-tight text-text-h">
            Zona {game.zoneIndex + 1} de {game.zones.length}
          </h1>
        </header>

        <div className="mx-auto mb-5 flex flex-wrap justify-center gap-4 rounded-2xl border border-border bg-code-bg px-6 py-3">
          <Stat label="Parejas" value={`${game.matchedInZone} / ${game.totalPairsInZone}`} />
          <Stat
            label="Tiempo"
            value={
              game.phase === 'preview' ? `👁️ ${game.previewSecondsLeft}s` : `${minutes}:${seconds}`
            }
          />
          <Stat label="Puntos" value={String(game.totalScore)} />
          <Stat
            label="Combo"
            value={`x${game.combo >= 4 ? 1.5 : game.combo >= 2 ? 1.2 : 1}`}
          />
        </div>

        <div className="mb-6 h-1.5 overflow-hidden rounded-full bg-border">
          <div
            className="h-full transition-all"
            style={{
              width: `${game.totalPairsInZone ? (game.matchedInZone / game.totalPairsInZone) * 100 : 0}%`,
              background: primaryColor,
            }}
          />
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {game.currentZone?.cards.map((card) => {
            const isFlipped =
              game.phase === 'preview' ||
              game.flippedIds.includes(card.cardId) ||
              game.matchedPairIds.includes(card.pairId)
            const isMatched = game.matchedPairIds.includes(card.pairId)
            const isShaking = game.shakingIds.includes(card.cardId)

            return (
              <button
                key={card.cardId}
                type="button"
                disabled={isMatched}
                onClick={() => game.flipCard(card.cardId)}
                className={`group aspect-[5/7] [perspective:1000px] ${isShaking ? 'animate-[shake_0.4s]' : ''}`}
              >
                <div
                  className="relative h-full w-full rounded-xl transition-transform duration-500 [transform-style:preserve-3d]"
                  style={{ transform: isFlipped ? 'rotateY(180deg)' : undefined }}
                >
                  <div
                    className="absolute inset-0 flex items-center justify-center rounded-xl border-2 [backface-visibility:hidden]"
                    style={{ borderColor: primaryColor, background: `${primaryColor}14` }}
                  >
                    <span className="text-2xl" style={{ color: primaryColor }}>
                      ✦
                    </span>
                  </div>
                  <div
                    className={`absolute inset-0 flex flex-col items-center justify-start overflow-hidden rounded-xl border-2 p-2 text-center [backface-visibility:hidden] [transform:rotateY(180deg)] ${
                      isMatched ? 'bg-accent/10' : 'bg-bg'
                    }`}
                    style={{ borderColor: primaryColor }}
                  >
                    {card.imageUrl && (
                      <div className="mb-1.5 h-[42%] w-full overflow-hidden rounded-md">
                        <img
                          src={card.imageUrl}
                          alt=""
                          className="h-full w-full object-cover"
                          onError={(event) => {
                            event.currentTarget.style.display = 'none'
                          }}
                        />
                      </div>
                    )}
                    <span
                      className={`mb-1 rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${
                        card.badge === 'positive'
                          ? 'bg-accent/15 text-accent'
                          : 'bg-danger/15 text-danger'
                      }`}
                    >
                      {card.badge === 'positive' ? 'Positivo' : 'Negativo'}
                    </span>
                    <p className="mb-0.5 text-[11px] font-semibold leading-tight text-text-h">
                      {card.title}
                    </p>
                    <p className="text-[9px] leading-tight text-text">{card.description}</p>
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {game.phase === 'zone-cleared' && (
          <GameEndOverlay
            title="¡Zona superada!"
            message="Encontraste todas las parejas."
            actionLabel={game.zoneIndex + 1 < game.zones.length ? 'Siguiente zona' : 'Ver resultado'}
            onAction={game.advanceZone}
            onExit={onExit}
          />
        )}

        {game.phase === 'time-up' && (
          <GameEndOverlay
            title="Se acabó el tiempo"
            message="No alcanzaste a completar la zona."
            actionLabel="Reintentar zona"
            onAction={game.retryZone}
            onExit={onExit}
          />
        )}

        {game.phase === 'finished' && (
          <GameEndOverlay
            title="¡Juego completado!"
            message={`Puntaje final: ${game.totalScore}`}
            actionLabel="Salir"
            onAction={onExit}
            onExit={onExit}
            hideSecondaryAction
          />
        )}
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center px-1">
      <span className="text-[10px] uppercase tracking-wide text-text/70">{label}</span>
      <span className="mt-0.5 text-[16px] font-semibold text-text-h">{value}</span>
    </div>
  )
}

function GameEndOverlay({
  title,
  message,
  actionLabel,
  onAction,
  onExit,
  hideSecondaryAction,
}: {
  title: string
  message: string
  actionLabel: string
  onAction: () => void
  onExit: () => void
  hideSecondaryAction?: boolean
}) {
  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/50 p-5">
      <div className="w-full max-w-[360px] rounded-2xl border border-border bg-bg p-7 text-center shadow-[var(--shadow)]">
        <h2 className="mb-2 text-[20px] tracking-tight text-text-h">{title}</h2>
        <p className="mb-6 text-[14px] text-text">{message}</p>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            className="rounded-lg bg-accent px-4 py-3 text-[14px] font-medium text-white dark:text-bg"
            onClick={onAction}
          >
            {actionLabel}
          </button>
          {!hideSecondaryAction && (
            <button
              type="button"
              className="rounded-lg border border-border px-4 py-3 text-[14px] font-medium text-text-h"
              onClick={onExit}
            >
              Salir del juego
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
