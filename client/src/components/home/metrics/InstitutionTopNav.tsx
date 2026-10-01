export type InstitutionSection = 'members' | 'students' | 'teachers' | 'classes' | 'games'

const SECTIONS: { id: InstitutionSection; label: string }[] = [
  { id: 'members', label: 'Miembros' },
  { id: 'students', label: 'Estudiantes' },
  { id: 'teachers', label: 'Profesores' },
  { id: 'classes', label: 'Clases' },
  { id: 'games', label: 'Juegos' },
]

/**
 * Menú superior del drill-down de institución (issue #226): indica en qué
 * organización está parado el usuario y permite moverse entre las secciones
 * de nivel institución. Es horizontal (no lateral) por pedido explícito del
 * issue. "Miembros" preserva la administración ya existente en
 * `OrganizationDashboard` (altas/bajas/roles) — las demás son nuevas.
 *
 * Única responsabilidad: navegación. No conoce de dónde vienen los datos de
 * cada sección — cada una es su propio componente/hook.
 */
export function InstitutionTopNav({
  organizationName,
  activeSection,
  onSectionChange,
}: {
  organizationName: string
  activeSection: InstitutionSection
  onSectionChange: (section: InstitutionSection) => void
}) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-[12.5px] font-medium uppercase tracking-wide text-text/60">
        Estás en: <span className="text-text-h">{organizationName}</span>
      </p>
      <nav className="flex flex-wrap gap-2 border-b border-border">
        {SECTIONS.map((section) => (
          <button
            key={section.id}
            type="button"
            onClick={() => onSectionChange(section.id)}
            className={`px-3 py-2 text-[14px] ${
              activeSection === section.id
                ? 'border-b-2 border-text-h font-semibold text-text-h'
                : 'text-text/70 hover:text-text'
            }`}
          >
            {section.label}
          </button>
        ))}
      </nav>
    </div>
  )
}
