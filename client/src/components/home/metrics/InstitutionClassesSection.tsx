import { useInstitutionClasses } from './useInstitutionClasses'

/**
 * "Clases" de la institución (issue #226): cards de clase; al hacer clic se
 * entra al drill-down de esa clase (`ClassDrilldownTabs`, orquestado por el
 * padre vía `onSelectClass`). Este componente no conoce `ClassDrilldownTabs`
 * para evitar un ciclo de import innecesario — solo navega hacia arriba.
 */
export function InstitutionClassesSection({
  organizationId,
  onSelectClass,
}: {
  organizationId: string
  onSelectClass: (classId: string, className: string) => void
}) {
  const { classes, loading, error } = useInstitutionClasses(organizationId)

  if (loading) return <p className="text-[14px] text-text">Cargando clases…</p>
  if (error) return <p className="text-[14px] text-red-600">{error}</p>
  if (classes.length === 0) {
    return <p className="text-[14px] text-text/70">Esta institución todavía no tiene clases.</p>
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {classes.map((classItem) => (
        <button
          key={classItem.id}
          type="button"
          onClick={() => onSelectClass(classItem.id, classItem.name)}
          className="rounded-2xl border border-border p-4 text-left transition-transform hover:-translate-y-0.5 hover:border-accent"
        >
          <h4 className="text-[15px] font-semibold text-text-h">{classItem.name}</h4>
          <p className="mt-1 line-clamp-2 text-[13px] text-text">{classItem.description}</p>
          {!classItem.isActive && (
            <span className="mt-2 inline-block rounded-full bg-danger/10 px-2.5 py-1 text-[11.5px] font-medium text-danger">
              Inactiva
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
