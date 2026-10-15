import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { GameInstructionsGate } from './GameInstructionsGate'
import type { MemoryMatchPair } from './memoryMatchTypes'
import type { Difficulty } from './PlayOptionsPopup'
import { useMemoryMatchGame } from './useMemoryMatchGame'
import { ConfettiBurst } from '../../kids/ConfettiBurst'
import { MemoryMatchFlash } from './MemoryMatchFlash'
import { MemoryCityBackdrop } from './MemoryCityBackdrop'
import { bestBoardGrid } from './memoryMatchLayout'

const BOARD_GAP = 10
import { useAuth } from '../../../hooks/useAuth'
import { recordGamePlayResult } from '../../../services/metrics.service'

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
  /** Insumos para reportar la partida a `POST /me/game-results` (issue #226). `undefined` si no aplica. */
  gameId?: string
  subjectId?: string
  subjectName?: string
  classId?: string
}

export function MemoryMatchGame(props: MemoryMatchGameProps) {
  return <GameInstructionsGate kind={props.pairs[0]?.mode === 'OPPOSITES' ? 'OPPOSITES' : 'PAIRS'}><MemoryMatchSession {...props} /></GameInstructionsGate>
}

function MemoryMatchSession({
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
  gameId,
  subjectId,
  subjectName,
  classId,
}: MemoryMatchGameProps) {
  const { token } = useAuth()
  const game = useMemoryMatchGame({
    pairs,
    pairCount,
    difficulty,
    showPreview,
    perZone,
    baseTimePerZoneSeconds: timePerZoneSeconds,
    previewSeconds,
  })

  // Reporta el resultado una sola vez al llegar a "finished" (issue #226,
  // conexión de un juego real a `POST /me/game-results`). `reportedRef` evita
  // un doble POST si el componente re-renderiza estando ya en esa fase.
  const reportedRef = useRef(false)
  useEffect(() => {
    if (game.phase !== 'finished' || reportedRef.current || !token || !gameId) return
    reportedRef.current = true
    recordGamePlayResult(token, {
      gameId,
      gameTitle: title,
      classId,
      subjectId,
      subjectName,
      score: game.totalScore,
      correctCount: game.correctCount,
      incorrectCount: game.incorrectCount,
      timePlayedMs: game.getTimePlayedMs(),
    }).catch((err: unknown) => {
      // No bloquea la experiencia de fin de partida si falla el reporte de
      // métricas — el jugador ya vio su resultado en pantalla.
      console.error('No se pudo registrar el resultado de la partida:', err)
    })
  }, [game.phase, token, gameId, title, classId, subjectId, subjectName, game])

  const minutes = Math.floor(game.timeLeft / 60)
    .toString()
    .padStart(2, '0')
  const seconds = (game.timeLeft % 60).toString().padStart(2, '0')

  // Mide el espacio libre del tablero y elige la cuadrícula con la carta más grande que cabe.
  const boardRef = useRef<HTMLDivElement>(null)
  const [boardSize, setBoardSize] = useState({ width: 0, height: 0 })
  useLayoutEffect(() => {
    const element = boardRef.current
    if (!element) return
    const measure = () => setBoardSize({ width: element.clientWidth, height: element.clientHeight })
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  const cardCount = game.currentZone?.cards.length ?? 0
  const grid = useMemo(
    () => bestBoardGrid(cardCount, boardSize.width, boardSize.height, BOARD_GAP),
    [cardCount, boardSize.width, boardSize.height],
  )

  return (
    // Pantalla completa sin scroll: barra superior compacta y el tablero ocupa
    // el resto; las cartas se dimensionan para caber (ver memoryMatchLayout).
    <div className="fixed inset-0 z-50 flex h-dvh flex-col overflow-hidden bg-bg">
      <MemoryCityBackdrop />
      <div className="relative mx-auto flex h-full w-full max-w-[1400px] flex-col gap-2 p-2 sm:gap-3 sm:p-4">
        {/* Encabezado y contadores en una sola placa: se lee bien encima del cielo. */}
        <header className="flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-2xl border border-border bg-bg/85 px-3 py-2 shadow-[var(--shadow)] backdrop-blur-sm">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              className="shrink-0 rounded-lg border border-border bg-bg px-3 py-1.5 text-[12px] font-medium text-text-h"
              onClick={onExit}
            >
              ← Salir
            </button>
            <div className="min-w-0">
              <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-accent">{title}</p>
              <p className="text-[15px] font-semibold leading-tight text-text-h">
                Zona {game.zoneIndex + 1} de {game.zones.length}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 sm:gap-6">
            <Stat label="Parejas" value={`${game.matchedInZone} / ${game.totalPairsInZone}`} />
            <Stat
              label="Tiempo"
              value={
                game.phase === 'preview'
                  ? `👁️ ${game.previewSecondsLeft}s`
                  : `${game.pausedForInfo ? '⏸ ' : ''}${minutes}:${seconds}`
              }
            />
            <Stat label="Puntos" value={String(game.totalScore)} />
            <div className="flex flex-col items-center px-1">
              <span className="text-[10px] uppercase tracking-wide text-text/70">Racha</span>
              {/* key = racha: el número late cada vez que crece (issue #30). */}
              <span
                key={game.combo}
                className={`mt-0.5 text-[16px] font-semibold ${game.combo >= 2 ? 'text-[#ff7a1a]' : 'text-text-h'}`}
                style={{ animation: game.combo > 0 ? 'streak-pop 0.4s ease-out' : undefined }}
              >
                {game.combo >= 2 ? '🔥 ' : ''}
                {game.combo}
              </span>
            </div>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
            <div
              className="h-full transition-all"
              style={{
                width: `${game.totalPairsInZone ? (game.matchedInZone / game.totalPairsInZone) * 100 : 0}%`,
                background: primaryColor,
              }}
            />
          </div>
        </header>

        {game.phase === 'preview' && (
          <div className="flex shrink-0 items-center justify-center gap-3">
            <span className="rounded-full bg-bg/90 px-3 py-1 text-[13px] font-semibold text-text-h shadow-[var(--shadow)]">
              👁️ Memoriza las cartas
            </span>
            <button
              type="button"
              className="rounded-full px-4 py-1 text-[13px] font-bold text-white shadow-[var(--shadow)]"
              style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))' }}
              onClick={game.skipPreview}
            >
              ¡Ya, a jugar! ▶
            </button>
          </div>
        )}

        <div ref={boardRef} className="relative min-h-0 flex-1">
          {game.matchedInZone > 0 && <ConfettiBurst trigger={game.matchedInZone} />}
          <div
            className="absolute inset-0 m-auto grid content-center justify-center"
            style={{
              gap: BOARD_GAP,
              gridTemplateColumns: `repeat(${grid.cols}, ${grid.cardWidth}px)`,
              gridAutoRows: `${grid.cardHeight}px`,
            }}
          >
          {game.currentZone?.cards.map((card) => {
            const isFlipped =
              game.phase === 'preview' ||
              game.flippedIds.includes(card.cardId) ||
              game.matchedPairIds.includes(card.pairId)
            const isMatched = game.matchedPairIds.includes(card.pairId)
            const isShaking = game.shakingIds.includes(card.cardId)
            // Texto proporcional a la carta: legible en una carta grande y sin desbordar en una chica.
            const labelSize = Math.max(11, Math.min(18, Math.round(grid.cardWidth / 10)))

            return (
              <button
                key={card.cardId}
                type="button"
                disabled={isMatched}
                onClick={() => game.flipCard(card.cardId)}
                className={`group h-full w-full [perspective:1000px] ${isShaking ? 'animate-[shake_0.4s]' : ''}`}
              >
                <div
                  className="relative h-full w-full rounded-xl transition-transform duration-500 [transform-style:preserve-3d]"
                  style={{ transform: isFlipped ? 'rotateY(180deg)' : undefined }}
                >
                  <div
                    className="absolute inset-0 flex items-center justify-center rounded-xl border-2 bg-bg/90 shadow-[var(--shadow)] [backface-visibility:hidden]"
                    style={{ borderColor: primaryColor, backgroundImage: `linear-gradient(135deg, ${primaryColor}26, ${primaryColor}0d)` }}
                  >
                    <span style={{ color: primaryColor, fontSize: grid.cardWidth * 0.3 }}>
                      ✦
                    </span>
                  </div>
                  {/* Cara: la imagen llena la carta y el texto va en una franja corta abajo. Sin zonas vacías. */}
                  <div
                    className={`absolute inset-0 flex flex-col overflow-hidden rounded-xl border-[3px] shadow-[var(--shadow)] [backface-visibility:hidden] [transform:rotateY(180deg)] ${
                      isMatched ? 'bg-accent/10' : 'bg-bg'
                    }`}
                    style={{ borderColor: isShaking ? 'var(--color-danger)' : primaryColor }}
                  >
                    {card.imageUrl ? (
                      <div className="relative min-h-0 flex-1">
                        <img
                          src={card.imageUrl}
                          alt=""
                          className="absolute inset-0 h-full w-full object-cover"
                          onError={(event) => {
                            event.currentTarget.style.display = 'none'
                          }}
                        />
                      </div>
                    ) : (
                      <div className="flex min-h-0 flex-1 items-center justify-center p-2">
                        <span className="text-center font-bold leading-tight text-text-h" style={{ fontSize: labelSize + 2 }}>
                          {card.title}
                        </span>
                      </div>
                    )}
                    {card.imageUrl && card.title && (
                      <p
                        className="shrink-0 truncate px-1.5 py-1 text-center font-semibold leading-tight text-text-h"
                        style={{ fontSize: labelSize }}
                        title={card.title}
                      >
                        {card.title}
                      </p>
                    )}
                    {card.badge && (
                      <span
                        aria-label={card.badge === 'positive' ? 'Positivo' : 'Negativo'}
                        className={`absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full text-[14px] font-bold text-white shadow ${
                          card.badge === 'positive' ? 'bg-[#22c55e]' : 'bg-danger'
                        }`}
                      >
                        {card.badge === 'positive' ? '+' : '−'}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            )
          })}
          </div>
        </div>

        <MemoryMatchFlash
          match={game.lastMatch}
          primaryColor={primaryColor}
          onContinue={game.pausedForInfo ? game.resumeAfterInfo : undefined}
        />

        {game.phase === 'zone-cleared' && (
          <GameEndOverlay
            title="¡Zona superada!"
            message="Encontraste todas las parejas."
            actionLabel={game.zoneIndex + 1 < game.zones.length ? 'Siguiente zona' : 'Ver resultado'}
            onAction={game.advanceZone}
            onExit={onExit}
            celebrate
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
            celebrate
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
  celebrate,
}: {
  title: string
  message: string
  actionLabel: string
  onAction: () => void
  onExit: () => void
  hideSecondaryAction?: boolean
  celebrate?: boolean
}) {
  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/50 p-5">
      <div className="relative w-full max-w-[360px] rounded-2xl border border-border bg-bg p-7 text-center shadow-[var(--shadow)]">
        {celebrate && <ConfettiBurst trigger={title} />}
        <h2 className="mb-2 text-[20px] tracking-tight text-text-h">{title}</h2>
        <p className="mb-6 text-[14px] text-text">{message}</p>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            className="rounded-lg px-4 py-3 text-[14px] font-semibold text-white shadow-[0_8px_20px_-8px_var(--accent)] transition-transform hover:-translate-y-0.5"
            style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))' }}
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
