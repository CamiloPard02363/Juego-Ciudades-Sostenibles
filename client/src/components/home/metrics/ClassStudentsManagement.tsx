import { useClassStudentsManagement } from './useClassStudentsManagement'

/**
 * "Estudiantes de la clase" del drill-down (issue #226): listado paginado con
 * búsqueda y opción de sacar a un estudiante. Toda la lógica de filtro,
 * paginado y mutación vive en `useClassStudentsManagement` — este componente
 * solo pinta.
 */
export function ClassStudentsManagement({ classId }: { classId: string }) {
  const {
    students,
    total,
    page,
    totalPages,
    setPage,
    search,
    setSearch,
    loading,
    error,
    removeStudent,
  } = useClassStudentsManagement(classId)

  if (loading) return <p className="text-[14px] text-text">Cargando estudiantes…</p>
  if (error) return <p className="text-[14px] text-red-600">{error}</p>

  return (
    <div className="flex flex-col gap-4">
      <input
        type="search"
        placeholder="Buscar por nombre o correo…"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        className="w-full max-w-sm rounded-md border border-border px-3 py-2 text-[14px]"
      />

      {students.length === 0 ? (
        <p className="text-[14px] text-text/70">No hay estudiantes que coincidan con la búsqueda.</p>
      ) : (
        <table className="w-full border-collapse text-[14px]">
          <thead>
            <tr className="border-b border-border text-left text-text/70">
              <th className="py-2 pr-2">Nombre</th>
              <th className="py-2 pr-2">Correo</th>
              <th className="py-2 pr-2" />
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <tr key={student.userId} className="border-b border-border/50">
                <td className="py-2 pr-2">{student.displayName ?? 'Estudiante'}</td>
                <td className="py-2 pr-2">{student.email ?? '—'}</td>
                <td className="py-2 pr-2 text-right">
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`¿Sacar a ${student.displayName ?? 'este estudiante'} de la clase?`)) {
                        removeStudent(student.userId)
                      }
                    }}
                    className="rounded-md border border-red-600 px-3 py-1 text-[13px] text-red-600 hover:bg-red-50"
                  >
                    Sacar de la clase
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {totalPages > 1 && (
        <div className="flex items-center gap-3 text-[13px] text-text/70">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
            className="rounded-md border border-border px-2 py-1 disabled:opacity-40"
          >
            Anterior
          </button>
          <span>
            Página {page} de {totalPages} ({total} estudiantes)
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
            className="rounded-md border border-border px-2 py-1 disabled:opacity-40"
          >
            Siguiente
          </button>
        </div>
      )}
    </div>
  )
}
