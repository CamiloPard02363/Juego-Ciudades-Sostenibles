import { useInstitutionTeachers } from './useInstitutionTeachers'

/** "Profesores" de la institución (issue #226): solo lectura. */
export function InstitutionTeachersSection({ organizationId }: { organizationId: string }) {
  const { teachers, loading, error } = useInstitutionTeachers(organizationId)

  if (loading) return <p className="text-[14px] text-text">Cargando profesores…</p>
  if (error) return <p className="text-[14px] text-red-600">{error}</p>
  if (teachers.length === 0) {
    return <p className="text-[14px] text-text/70">Esta institución todavía no tiene profesores.</p>
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
        {teachers.map((teacher) => (
          <tr key={teacher.userId} className="border-b border-border/50">
            <td className="py-2 pr-2 text-text-h">{teacher.displayName ?? '—'}</td>
            <td className="py-2 pr-2 text-text">{teacher.email ?? '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
