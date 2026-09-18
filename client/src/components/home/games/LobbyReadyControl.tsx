import { CheckCircle2, Circle } from 'lucide-react'

type Participant = { userId: string; displayName: string; isSelf: boolean; ready?: boolean }

export function LobbyReadyControl({ players, onReady, disconnected = false, requireEven = false }: {
  players: Participant[]
  onReady: (ready: boolean) => void
  disconnected?: boolean
  requireEven?: boolean
}) {
  const self = players.find((player) => player.isSelf)
  const readyCount = players.filter((player) => player.ready).length
  const validCount = players.length >= 2 && (!requireEven || players.length % 2 === 0)
  return (
    <section aria-label="Confirmación de jugadores" className="rounded-2xl border border-accent/30 bg-accent/5 p-4">
      <div className="mb-3 flex flex-wrap gap-2" aria-live="polite">
        {players.map((player) => {
          const Icon = player.ready ? CheckCircle2 : Circle
          return <span key={player.userId} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs text-text-h">
            <Icon className={`h-4 w-4 ${player.ready ? 'text-accent' : 'text-text'}`} aria-hidden="true" />
            {player.displayName}{player.isSelf ? ' (tú)' : ''}: {player.ready ? 'Listo' : 'Sin confirmar'}
          </span>
        })}
      </div>
      <p className="mb-3 text-sm text-text" role="status">
        {disconnected ? 'Reconectando con la sala…' : !validCount
          ? requireEven ? 'Se necesitan 2, 4, 6, 8 o 10 jugadores para empezar.' : 'Esperando al segundo jugador…'
          : `${readyCount} de ${players.length} listos. La partida empieza automáticamente cuando todos confirmen.`}
      </p>
      <button type="button" aria-pressed={Boolean(self?.ready)} disabled={!self || disconnected}
        onClick={() => onReady(!self?.ready)}
        className="w-full rounded-xl border border-accent/40 bg-surface px-4 py-3 text-sm font-bold text-text-h transition-colors hover:bg-accent/15 focus-visible:outline-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50">
        {self?.ready ? 'Cancelar mi confirmación' : 'Listo para jugar'}
      </button>
    </section>
  )
}
