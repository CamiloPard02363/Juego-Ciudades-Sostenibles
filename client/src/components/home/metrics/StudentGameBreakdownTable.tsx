import type { GameMetric } from '../../../services/metrics.service'

/** Única responsabilidad: desglose "por juego individual" del estudiante (issue #226). */
export function StudentGameBreakdownTable({ games }: { games: GameMetric[] }) {
  if (games.length === 0) {
    return <p className="text-[14px] text-text/70">Todavía no has jugado ningún juego.</p>
  }

  return (
    <table className="w-full border-collapse text-[14px]">
      <thead>
        <tr className="border-b border-border text-left text-text/70">
          <th className="py-2 pr-2">Juego</th>
          <th className="py-2 pr-2">Puntaje</th>
          <th className="py-2 pr-2">Aciertos</th>
          <th className="py-2 pr-2">Errores</th>
          <th className="py-2 pr-2">Precisión</th>
          <th className="py-2 pr-2">Tiempo jugado</th>
          <th className="py-2 pr-2">Intentos</th>
        </tr>
      </thead>
      <tbody>
        {games.map((game) => (
          <tr key={game.gameId} className="border-b border-border/50">
            <td className="py-2 pr-2">{game.gameTitle}</td>
            <td className="py-2 pr-2">{game.totalScore}</td>
            <td className="py-2 pr-2">{game.correctCount}</td>
            <td className="py-2 pr-2">{game.incorrectCount}</td>
            <td className="py-2 pr-2">{game.accuracy}%</td>
            <td className="py-2 pr-2">{formatDuration(game.timePlayedMs)}</td>
            <td className="py-2 pr-2">{game.attempts}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.round(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`
}
