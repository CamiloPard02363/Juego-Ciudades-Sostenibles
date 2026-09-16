type MazeCollectorHudProps = {
  lives: number
  energy: number
  collectedCount: number
  totalItems: number
  score: number
}

/** HUD persistente arriba del tablero: vidas, energía, progreso de limpieza y puntaje. */
export function MazeCollectorHud({ lives, energy, collectedCount, totalItems, score }: MazeCollectorHudProps) {
  const progressPct = totalItems > 0 ? Math.round((collectedCount / totalItems) * 100) : 0

  return (
    <div className="mx-auto mb-4 flex w-full max-w-[560px] flex-col gap-3 rounded-2xl border border-border bg-code-bg px-5 py-3.5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 font-mono text-[15px]" aria-label={`${lives} vidas`}>
          {'🚛'.repeat(Math.max(0, lives))}
        </div>
        <div className="font-mono text-[15px] font-semibold text-text-h">{score} pts</div>
      </div>

      <EnergyBar energy={energy} />
      <CleanupProgressBar percent={progressPct} collected={collectedCount} total={totalItems} />
    </div>
  )
}

function EnergyBar({ energy }: { energy: number }) {
  const clamped = Math.max(0, Math.min(100, energy))
  const color = clamped > 60 ? '#22c55e' : clamped > 30 ? '#eab308' : '#ef4444'
  const pulse = clamped <= 15 ? 'animate-pulse' : ''

  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[11px] font-medium uppercase tracking-wide text-text/70">
        <span>Energía</span>
        <span>{Math.round(clamped)}%</span>
      </div>
      <div className={`h-2.5 w-full overflow-hidden rounded-full bg-border/40 ${pulse}`}>
        <div
          className="h-full rounded-full transition-[width] duration-200"
          style={{ width: `${clamped}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}

function CleanupProgressBar({ percent, collected, total }: { percent: number; collected: number; total: number }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[11px] font-medium uppercase tracking-wide text-text/70">
        <span>Ciudad limpia</span>
        <span>
          {collected}/{total} ({percent}%)
        </span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-border/40">
        <div
          className="h-full rounded-full transition-[width] duration-200"
          style={{ width: `${percent}%`, background: 'linear-gradient(90deg, var(--accent), var(--accent-2))' }}
        />
      </div>
    </div>
  )
}
