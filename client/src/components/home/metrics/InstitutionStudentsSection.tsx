import { useInstitutionStudents } from './useInstitutionStudents'

/** "Estudiantes a nivel de institución" (issue #226): solo lectura, sin paginado — reutiliza el listado ya existente. */
export function InstitutionStudentsSection({ organizationId }: { organizationId: string }) {
  const { students, loading, error } = useInstitutionStudents(organizationId)

  if (loading) return <p className="text-[14px] text-text">Cargando estudiantes…</p>
  if (error) return <p className="text-[14px] text-red-600">{error}</p>
  if (students.length === 0) {
    return <p className="text-[14px] text-text/70">Esta institución todavía no tiene estudiantes.</p>
  }

  return (
    <table className="w-full border-collapse text-[14px]">
      <thead>
        <tr className="border-b border-border text-left text-text/70">
          <th className="py-2 pr-2">Nombre</th>
          <th className="py-2 pr-2">Correo</th>
        </tr>
      </thead>
      <tbody>
        {students.map((student) => (
          <tr key={student.userId} className="border-b border-border/50">
            <td className="py-2 pr-2 text-text-h">{student.displayName ?? '—'}</td>
            <td className="py-2 pr-2 text-text">{student.email ?? '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
