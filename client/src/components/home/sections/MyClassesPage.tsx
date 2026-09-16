import { useEffect, useState } from 'react'
import { Plus, Users } from 'lucide-react'
import { useAuth } from '../../../hooks/useAuth'
import { ApiError } from '../../../utils/http'
import { createClass, listMyClasses, type TeacherClass } from '../../../services/class.service'

export function MyClassesPage() {
  const { token, user } = useAuth()
  const [classes, setClasses] = useState<TeacherClass[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  useEffect(() => {
    if (!token || user?.role !== 'TEACHER') return
    listMyClasses(token)
      .then(setClasses)
      .catch((err: unknown) => setError(err instanceof ApiError ? err.message : 'No se pudieron cargar tus clases.'))
      .finally(() => setLoading(false))
  }, [token, user?.role])

  async function handleCreate() {
    if (!token || !name.trim()) return
    setCreating(true)
    setError(null)
    try {
      const classItem = await createClass(token, { name: name.trim(), description: description.trim() || undefined })
      setClasses((current) => [classItem, ...current])
      setName('')
      setDescription('')
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : 'No se pudo crear la clase.')
    } finally {
      setCreating(false)
    }
  }

  if (user?.role !== 'TEACHER') return null

  return (
    <section className="flex flex-col gap-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="mb-1 text-[22px] tracking-tight text-text-h">Mis clases</h2>
          <p className="text-[14px] text-text">Organiza tus grupos y accede a las actividades de cada clase.</p>
        </div>
        <button
          type="button"
          onClick={() => setCreating((current) => !current)}
          className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13.5px] font-semibold text-white shadow-[0_10px_28px_-10px_var(--accent)] transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
          style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))' }}
        >
          <Plus className="h-[18px] w-[18px]" strokeWidth={2.25} />
          {creating ? 'Cerrar' : 'Crear clase'}
        </button>
      </div>

      {creating && (
        <div className="rounded-2xl border border-border bg-surface p-5 shadow-[var(--shadow)]">
          <div className="grid gap-3 sm:grid-cols-[1fr_1.4fr_auto] sm:items-end">
            <label className="flex flex-col gap-1.5 text-[13px] font-medium text-text-h">
              Nombre de la clase
              <input
                value={name}
                maxLength={80}
                onChange={(event) => setName(event.target.value)}
                placeholder="Ej. Matemáticas 6.º A"
                className="rounded-xl border border-border bg-bg px-3 py-2.5 text-[14px] text-text-h outline-none focus:border-accent focus:ring-2 focus:ring-accent/10"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-[13px] font-medium text-text-h">
              Descripción <span className="font-normal text-text">(opcional)</span>
              <input
                value={description}
                maxLength={240}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Grupo de ciencias del segundo semestre"
                className="rounded-xl border border-border bg-bg px-3 py-2.5 text-[14px] text-text-h outline-none focus:border-accent focus:ring-2 focus:ring-accent/10"
              />
            </label>
            <button
              type="button"
              disabled={creating && !name.trim()}
              onClick={handleCreate}
              className="rounded-xl px-4 py-2.5 text-[13.5px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))' }}
            >
              Guardar
            </button>
          </div>
        </div>
      )}

      {error && <p className="rounded-lg border border-danger/35 bg-danger/10 px-3 py-2.5 text-sm text-danger" role="alert">{error}</p>}

      {loading ? (
        <p className="text-[14px] text-text">Cargando clases…</p>
      ) : classes.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16 text-center">
          <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full text-white" style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))' }}>
            <Users className="h-6 w-6" strokeWidth={2} />
          </span>
          <p className="text-[15px] font-medium text-text-h">Aún no tienes clases</p>
          <p className="mt-1 max-w-[360px] text-[13px] text-text">Cuando crees o recibas una clase, aparecerá en este espacio.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {classes.map((classItem) => (
            <article key={classItem.id} className="rounded-2xl border border-border bg-surface p-5 shadow-[var(--shadow)]">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
                <Users className="h-5 w-5" strokeWidth={2} />
              </div>
              <h3 className="truncate text-[16px] font-semibold text-text-h">{classItem.name}</h3>
              <p className="mt-2 min-h-[40px] text-[13px] leading-relaxed text-text">
                {classItem.description || 'Sin descripción todavía.'}
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
