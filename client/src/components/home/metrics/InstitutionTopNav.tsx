import { GraduationCap, LayoutGrid, Puzzle, Users, Users2 } from 'lucide-react'

export type InstitutionSection = 'members' | 'students' | 'teachers' | 'classes' | 'games'

const SECTIONS: { id: InstitutionSection; label: string; icon: typeof Users2 }[] = [
  { id: 'members', label: 'Miembros', icon: Users2 },
  { id: 'students', label: 'Estudiantes', icon: GraduationCap },
  { id: 'teachers', label: 'Profesores', icon: Users },
  { id: 'classes', label: 'Clases', icon: LayoutGrid },
  { id: 'games', label: 'Juegos', icon: Puzzle },
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
 *
 * Estilo en pills con ícono (issue #226, feedback de Manuel sobre jerarquía
 * visual): reutiliza el mismo tratamiento de "tab activa = gradiente de
 * marca" que ya usa el wizard de creación de juego (`GameFormShell`/
 * `CreateGameLayout`), en vez de inventar un sistema nuevo.
 */
export function InstitutionTopNav({
  activeSection,
  onSectionChange,
}: {
  activeSection: InstitutionSection
  onSectionChange: (section: InstitutionSection) => void
}) {
  return (
    <nav className="flex flex-wrap gap-2 rounded-2xl border border-border bg-code-bg/40 p-2">
      {SECTIONS.map((section) => {
        const Icon = section.icon
        const isActive = activeSection === section.id
        return (
          <button
            key={section.id}
            type="button"
            onClick={() => onSectionChange(section.id)}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-[13.5px] font-medium transition-all ${
              isActive
                ? 'text-white shadow-[0_8px_20px_-8px_var(--accent)]'
                : 'text-text/70 hover:bg-bg hover:text-text-h'
            }`}
            style={isActive ? { background: 'linear-gradient(135deg, var(--accent), var(--accent-2))' } : undefined}
          >
            <Icon className="h-[15px] w-[15px]" strokeWidth={2} />
            {section.label}
          </button>
        )
      })}
    </nav>
  )
}
