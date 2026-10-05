import { useState } from 'react'
import { GraduationCap, Presentation } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { ApiError } from '../utils/http'
import { RoleCharacterIllustration } from './RoleCharacterIllustration'
import { ThemeToggle } from './ThemeToggle'

type RoleOption = 'STUDENT' | 'TEACHER'

const ROLE_COPY: Record<
  RoleOption,
  { title: string; description: string; bullets: string[]; icon: typeof GraduationCap }
> = {
  STUDENT: {
    title: 'Soy estudiante',
    description: 'Juego, aprendo y participo en las clases a las que me inviten.',
    bullets: [
      'Juego las actividades que crean mis profesores',
      'Veo mi progreso y mis logros',
      'Me uno a clases con un código de invitación',
    ],
    icon: GraduationCap,
  },
  TEACHER: {
    title: 'Soy profesor',
    description: 'Creo actividades, armo clases y sigo el progreso de mis estudiantes.',
    bullets: [
      'Creo juegos y actividades educativas',
      'Organizo clases y agrego estudiantes',
      'Veo el progreso y las métricas de mi grupo',
    ],
    icon: Presentation,
  },
}

/**
 * Pantalla obligatoria post-registro: toda cuenta nace STUDENT
 * (`User.create` en el backend), pero nunca se le pregunta a la persona qué
 * perfil se le acomoda más. Se bloquea el resto de la app hasta que eligen
 * (ver `App.tsx`, `!user.hasChosenRole`). El mismo cambio queda disponible
 * luego, sin restricciones, en Configuración del perfil.
 */
export function RoleSelectionPage() {
  const { chooseRole } = useAuth()
  const [selected, setSelected] = useState<RoleOption | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleConfirm = async () => {
    if (!selected || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      await chooseRole(selected)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Ocurrió un error inesperado. Intenta de nuevo.')
      setSubmitting(false)
    }
  }

  return (
    <main className="relative flex min-h-svh flex-col items-center justify-center gap-8 overflow-hidden p-5 sm:p-8">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 15% 20%, color-mix(in srgb, var(--accent) 22%, transparent), transparent 55%), radial-gradient(circle at 85% 80%, color-mix(in srgb, var(--accent-2) 18%, transparent), transparent 50%)',
        }}
      />

      <div className="absolute top-5 right-5 sm:top-8 sm:right-8">
        <ThemeToggle />
      </div>

      <header className="relative max-w-xl text-center">
        <h1 className="mb-2 text-[28px] tracking-tight text-text-h">¿Cómo quieres usar NexusPlay?</h1>
        <p className="text-[15px]">
          Elige el perfil que se te acomode más. Podrás cambiarlo cuando quieras desde Configuración.
        </p>
      </header>

      <div className="relative grid w-full max-w-3xl grid-cols-1 gap-5 sm:grid-cols-2">
        {(Object.keys(ROLE_COPY) as RoleOption[]).map((role) => {
          const copy = ROLE_COPY[role]
          const Icon = copy.icon
          const isSelected = selected === role

          return (
            <button
              key={role}
              type="button"
              onClick={() => setSelected(role)}
              aria-pressed={isSelected}
              className={`group relative flex flex-col items-center rounded-2xl border p-6 text-left transition-all duration-300 ${
                isSelected
                  ? 'border-accent bg-surface shadow-[var(--shadow),var(--glow)] -translate-y-1'
                  : 'border-border bg-surface/70 hover:-translate-y-1 hover:border-accent/60 hover:shadow-[var(--shadow)]'
              }`}
            >
              <div
                className={`flex h-40 w-28 items-center justify-center transition-transform duration-300 ${
                  isSelected ? 'scale-110' : 'group-hover:scale-105'
                }`}
              >
                <RoleCharacterIllustration
                  variant={role === 'STUDENT' ? 'student' : 'teacher'}
                  className="h-full w-full text-text"
                />
              </div>

              <div className="mt-3 flex items-center gap-2">
                <Icon className="h-5 w-5 text-accent" />
                <h2 className="text-[19px] text-text-h">{copy.title}</h2>
              </div>
              <p className="mt-1.5 text-center text-[14px]">{copy.description}</p>

              <ul className="mt-4 w-full space-y-1.5 text-[13px]">
                {copy.bullets.map((bullet) => (
                  <li key={bullet} className="flex items-start gap-2">
                    <span aria-hidden="true" className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>

              {isSelected && (
                <span
                  aria-hidden="true"
                  className="absolute -top-2.5 -right-2.5 flex h-7 w-7 items-center justify-center rounded-full text-[13px] font-semibold text-white"
                  style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))' }}
                >
                  ✓
                </span>
              )}
            </button>
          )
        })}
      </div>

      {error && <p className="relative text-[13px] text-red-500">{error}</p>}

      <button
        type="button"
        onClick={handleConfirm}
        disabled={!selected || submitting}
        className="relative rounded-xl px-8 py-3 text-[15px] font-medium text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
        style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))' }}
      >
        {submitting ? 'Guardando…' : 'Continuar'}
      </button>
    </main>
  )
}
