import { useRef } from 'react'
import type { ReactNode } from 'react'
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp } from 'lucide-react'
import type { MazeCollectorConfig, MazeCollectorItem, MazeLayoutDef } from './mazeCollectorTypes'
import { iconForConcept } from './mazeCollectorTypes'
import { useMazeCollectorGame } from './useMazeCollectorGame'
import type { Direction } from './useMazeCollectorGame'
import { useMazeCollectorPixiRenderer, CELL_SIZE } from './useMazeCollectorPixiRenderer'
import { MazeCollectorQuestionModal } from './MazeCollectorQuestionModal'
import { MazeCollectorHud } from './MazeCollectorHud'
import { ConfettiBurst } from '../../kids/ConfettiBurst'

type MazeCollectorGameProps = {
  title: string
  primaryColor: string
  layout: MazeLayoutDef
  items: MazeCollectorItem[]
  config: MazeCollectorConfig
  onExit: () => void
}

export function MazeCollectorGame({ title, primaryColor, layout, items, config, onExit }: MazeCollectorGameProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const game = useMazeCollectorGame({ layout, items, config })

  const width = layout.cols * CELL_SIZE
  const height = layout.rows * CELL_SIZE

  useMazeCollectorPixiRenderer({
    hostRef,
    layout,
    items,
    config,
    playerPos: game.playerPos,
    facing: game.facing,
    enemyPositions: game.enemyPositions,
    remainingItemPositions: game.remainingItemPositions,
    superCollectTicksLeft: game.superCollectTicksLeft,
  })

  const CollectorIcon = iconForConcept(config.collectorIcon)
  const EnemyIcon = iconForConcept(config.enemyIcon)

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-bg">
      <div className="mx-auto flex min-h-full max-w-[900px] flex-col items-center p-5 sm:p-8">
        <header className="relative mb-4 w-full text-center">
          <button
            type="button"
            className="absolute left-0 top-0 rounded-lg border border-border px-3 py-1.5 text-[12px] font-medium text-text-h"
            onClick={onExit}
          >
            ← Salir
          </button>
          <p className="text-[12px] font-semibold uppercase tracking-wide text-accent">{title}</p>
          <h1 className="mt-1 flex items-center justify-center gap-2 text-[20px] tracking-tight text-text-h">
            <CollectorIcon className="h-5 w-5" style={{ color: primaryColor }} strokeWidth={2} />
            {config.collectorLabel}
            <span className="text-text">vs.</span>
            <EnemyIcon className="h-5 w-5 text-danger" strokeWidth={2} />
            {config.enemyLabel}
          </h1>
        </header>

        <MazeCollectorHud
          lives={game.lives}
          energy={game.energy}
          collectedCount={game.collectedCount}
          totalItems={game.totalItems}
          score={game.score}
        />

        <div
          className="relative w-full overflow-x-auto rounded-xl p-3"
          style={{ background: 'linear-gradient(180deg, #7dd3fc 0%, #bae6fd 60%, #e0f2fe 100%)' }}
        >
          {game.collectedCount > 0 && <ConfettiBurst trigger={game.collectedCount} />}
          <div
            ref={hostRef}
            className="mx-auto overflow-hidden rounded-xl border-2 shadow-[0_12px_24px_-8px_rgba(0,0,0,0.4)] [&>canvas]:block [&>canvas]:h-full [&>canvas]:w-full"
            style={{ borderColor: primaryColor, width: '100%', maxWidth: width, aspectRatio: `${width} / ${height}` }}
          />

          {game.pendingQuestion && (
            <MazeCollectorQuestionModal item={game.pendingQuestion} onAnswer={game.answerQuestion} />
          )}

          {game.pendingZoneQuestion && (
            <MazeCollectorQuestionModal item={game.pendingZoneQuestion.item} onAnswer={game.answerZoneQuestion} />
          )}

          {game.phase === 'ready' && (
            <Overlay>
              <p className="mb-4 text-[14px] text-text-h">Usa las flechas o botones para moverte.</p>
              <button
                type="button"
                className="rounded-lg px-4 py-2.5 text-[14px] font-semibold text-white"
                style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))' }}
                onClick={() => game.setDirection('RIGHT')}
              >
                Empezar
              </button>
            </Overlay>
          )}

          {game.phase === 'won' && (
            <Overlay celebrate>
              <h2 className="mb-2 text-[20px] text-text-h">¡Recolectaste todo!</h2>
              <p className="mb-4 text-[14px] text-text">Puntaje final: {game.score}</p>
              <button
                type="button"
                className="rounded-lg px-4 py-2.5 text-[14px] font-semibold text-white"
                style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))' }}
                onClick={onExit}
              >
                Salir
              </button>
            </Overlay>
          )}

          {game.phase === 'lost' && (
            <Overlay>
              <h2 className="mb-2 text-[20px] text-text-h">Sin vidas</h2>
              <p className="mb-4 text-[14px] text-text">Puntaje final: {game.score}</p>
              <button
                type="button"
                className="rounded-lg px-4 py-2.5 text-[14px] font-semibold text-white"
                style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))' }}
                onClick={onExit}
              >
                Salir
              </button>
            </Overlay>
          )}
        </div>

        {game.lastCollected?.fact && game.phase === 'playing' && (
          <p
            key={game.lastCollected.itemId}
            className="mt-4 max-w-[420px] rounded-lg border border-accent/30 bg-accent/10 px-4 py-2.5 text-center text-[13px] text-text-h"
          >
            💡 {game.lastCollected.fact}
          </p>
        )}

        <DirectionPad onPress={game.setDirection} />
      </div>
    </div>
  )
}

function Overlay({ children, celebrate }: { children: ReactNode; celebrate?: boolean }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center rounded-xl bg-black/60 p-5 text-center">
      {celebrate && <ConfettiBurst trigger="won" />}
      {children}
    </div>
  )
}

/** Controles táctiles para móvil; en desktop el teclado ya funciona vía el hook. */
function DirectionPad({ onPress }: { onPress: (direction: Direction) => void }) {
  return (
    <div className="mt-5 grid grid-cols-3 gap-1.5 sm:hidden">
      <span />
      <PadButton direction="UP" onPress={onPress} icon={ArrowUp} />
      <span />
      <PadButton direction="LEFT" onPress={onPress} icon={ArrowLeft} />
      <PadButton direction="DOWN" onPress={onPress} icon={ArrowDown} />
      <PadButton direction="RIGHT" onPress={onPress} icon={ArrowRight} />
    </div>
  )
}

function PadButton({
  direction,
  onPress,
  icon: Icon,
}: {
  direction: Direction
  onPress: (direction: Direction) => void
  icon: typeof ArrowUp
}) {
  return (
    <button
      type="button"
      className="flex h-12 w-12 items-center justify-center rounded-lg border border-border bg-code-bg text-text-h active:bg-accent/10"
      onClick={() => onPress(direction)}
    >
      <Icon className="h-5 w-5" strokeWidth={2} />
    </button>
  )
}
