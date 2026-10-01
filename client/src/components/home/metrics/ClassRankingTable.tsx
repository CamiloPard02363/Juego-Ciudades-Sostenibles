import type { ClassRankingEntry } from '../../../services/metrics.service'

/**
 * Única responsabilidad: pintar la tabla de ranking de mayor a menor puntaje
 * (issue #226, Home de clase). No hace fetching ni conoce el gráfico de pie.
 */
export function ClassRankingTable({ entries }: { entries: ClassRankingEntry[] }) {
  if (entries.length === 0) {
    return <p className="text-[14px] text-text/70">Todavía no hay partidas registradas en esta clase.</p>
  }

  return (
    <table className="w-full border-collapse text-[14px]">
      <thead>
        <tr className="border-b border-border text-left text-text/70">
          <th className="py-2 pr-2">#</th>
          <th className="py-2 pr-2">Estudiante</th>
          <th className="py-2 pr-2">Puntaje</th>
          <th className="py-2 pr-2">Partidas</th>
        </tr>
      </thead>
      <tbody>
        {entries.map((entry) => (
          <tr key={entry.studentUserId} className="border-b border-border/50">
            <td className="py-2 pr-2 font-semibold">{entry.rank}</td>
            <td className="py-2 pr-2">{entry.displayName ?? 'Estudiante'}</td>
            <td className="py-2 pr-2">{entry.totalScore}</td>
            <td className="py-2 pr-2">{entry.gamesPlayed}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
