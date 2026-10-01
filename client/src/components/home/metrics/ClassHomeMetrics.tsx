import { useClassRanking } from './useClassRanking'
import { ClassRankingTable } from './ClassRankingTable'
import { PieChart } from './PieChart'

/**
 * "Home de la clase" del drill-down (issue #226): ranking + gráfico de pie de
 * los mejores estudiantes. Compone un hook de datos + dos componentes de
 * presentación — no tiene lógica propia de cálculo.
 */
export function ClassHomeMetrics({ classId }: { classId: string }) {
  const { ranking, loading, error } = useClassRanking(classId)

  if (loading) return <p className="text-[14px] text-text">Cargando métricas…</p>
  if (error) return <p className="text-[14px] text-red-600">{error}</p>
  if (!ranking) return null

  const slices = ranking.topForPieChart.map((entry) => ({
    label: entry.displayName ?? 'Estudiante',
    value: entry.totalScore,
  }))

  return (
    <div className="flex flex-col gap-6">
      <section>
        <h3 className="mb-2 text-[16px] font-semibold text-text">Ranking de la clase</h3>
        <ClassRankingTable entries={ranking.entries} />
      </section>
      <section>
        <h3 className="mb-2 text-[16px] font-semibold text-text">Mejores estudiantes</h3>
        <PieChart slices={slices} />
      </section>
    </div>
  )
}
