import { useMyMetrics } from './useStudentMetrics'
import { StudentGameBreakdownTable } from './StudentGameBreakdownTable'
import { StudentSubjectBreakdownTable } from './StudentSubjectBreakdownTable'
import { ScoreOverTimeChart } from './ScoreOverTimeChart'

/**
 * Vista de métricas propias del estudiante (issue #226): desglose por juego,
 * por materia y evolución en el tiempo. Compone un hook de datos + tres
 * componentes de presentación — cada uno con su propia razón de cambio.
 */
export function MyMetricsPage() {
  const { metrics, loading, error } = useMyMetrics()

  if (loading) return <p className="text-[14px] text-text">Cargando tus métricas…</p>
  if (error) return <p className="text-[14px] text-red-600">{error}</p>
  if (!metrics) return null

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h2 className="text-[22px] tracking-tight text-text-h">Mis métricas</h2>
        <p className="text-[14px] text-text">
          Revisa en qué materias y juegos vas mejor, y cómo ha evolucionado tu progreso.
        </p>
      </header>

      <section>
        <h3 className="mb-2 text-[16px] font-semibold text-text">Evolución en el tiempo</h3>
        <ScoreOverTimeChart points={metrics.scoreOverTime} />
      </section>

      <section>
        <h3 className="mb-2 text-[16px] font-semibold text-text">Por materia</h3>
        <StudentSubjectBreakdownTable subjects={metrics.bySubject} />
      </section>

      <section>
        <h3 className="mb-2 text-[16px] font-semibold text-text">Por juego</h3>
        <StudentGameBreakdownTable games={metrics.byGame} />
      </section>
    </div>
  )
}
