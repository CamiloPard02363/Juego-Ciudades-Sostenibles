import type { SubjectMetric } from '../../../services/metrics.service'

/** Única responsabilidad: desglose "por materia/submateria" del estudiante (issue #226). */
export function StudentSubjectBreakdownTable({ subjects }: { subjects: SubjectMetric[] }) {
  if (subjects.length === 0) {
    return (
      <p className="text-[14px] text-text/70">
        Todavía no hay resultados asociados a una materia.
      </p>
    )
  }

  return (
    <table className="w-full border-collapse text-[14px]">
      <thead>
        <tr className="border-b border-border text-left text-text/70">
          <th className="py-2 pr-2">Materia</th>
          <th className="py-2 pr-2">Puntaje</th>
          <th className="py-2 pr-2">Precisión</th>
          <th className="py-2 pr-2">Intentos</th>
        </tr>
      </thead>
      <tbody>
        {subjects.map((subject) => (
          <tr key={subject.subjectId} className="border-b border-border/50">
            <td className="py-2 pr-2">{subject.subjectName}</td>
            <td className="py-2 pr-2">{subject.totalScore}</td>
            <td className="py-2 pr-2">{subject.accuracy}%</td>
            <td className="py-2 pr-2">{subject.attempts}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
