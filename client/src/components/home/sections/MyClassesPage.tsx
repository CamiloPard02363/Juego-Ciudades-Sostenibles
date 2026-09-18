import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, Plus, Search, Trash2, Users } from 'lucide-react'
import { useAuth } from '../../../hooks/useAuth'
import { ApiError } from '../../../utils/http'
import {
  createClass,
  listMyClasses,
  listClassGames,
  addGameToClass,
  removeGameFromClass,
  type TeacherClass,
} from '../../../services/class.service'
import { listGames, type GameSummary } from '../../../services/game.service'
import { listSubjects, type SubjectWithGameCount } from '../../../services/subject.service'
import { iconForCategory } from '../gamesCatalogVisuals'
import { Modal } from '../games/Modal'

export function MyClassesPage() {
  const { token, user } = useAuth()
  const navigate = useNavigate()
  const { classId } = useParams<{ classId?: string }>()

  const [classes, setClasses] = useState<TeacherClass[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [savingClass, setSavingClass] = useState(false)

  useEffect(() => {
    if (!token || user?.role !== 'TEACHER') return
    listMyClasses(token)
      .then(setClasses)
      .catch((err: unknown) => setError(err instanceof ApiError ? err.message : 'No se pudieron cargar tus clases.'))
      .finally(() => setLoading(false))
  }, [token, user?.role])

  async function handleCreate() {
    if (!token || !name.trim()) return
    setSavingClass(true)
    setError(null)
    try {
      const classItem = await createClass(token, { name: name.trim(), description: description.trim() || undefined })
      setClasses((current) => [classItem, ...current])
      setName('')
      setDescription('')
      setCreating(false)
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : 'No se pudo crear la clase.')
    } finally {
      setSavingClass(false)
    }
  }

  if (user?.role !== 'TEACHER') return null

  const activeClass = classId ? classes.find((c) => c.id === classId) ?? null : null

  if (classId) {
    return <ClassDetail classId={classId} classInfo={activeClass} onBack={() => navigate('/mis-clases')} />
  }

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
              disabled={savingClass || !name.trim()}
              onClick={handleCreate}
              className="rounded-xl px-4 py-2.5 text-[13.5px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))' }}
            >
              {savingClass ? 'Guardando…' : 'Guardar'}
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
            <ClassCard key={classItem.id} classItem={classItem} onOpen={() => navigate(`/mis-clases/${classItem.id}`)} />
          ))}
        </div>
      )}
    </section>
  )
}

function ClassCard({ classItem, onOpen }: { classItem: TeacherClass; onOpen: () => void }) {
  const { token } = useAuth()
  const [gameCount, setGameCount] = useState<number | null>(null)

  useEffect(() => {
    if (!token) return
    listClassGames(token, classItem.id)
      .then((games) => setGameCount(games.length))
      .catch(() => setGameCount(0))
  }, [token, classItem.id])

  return (
    <button
      type="button"
      onClick={onOpen}
      className="rounded-2xl border border-border bg-surface p-5 text-left shadow-[var(--shadow)] transition-transform hover:-translate-y-0.5"
    >
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
        <Users className="h-5 w-5" strokeWidth={2} />
      </div>
      <h3 className="truncate text-[16px] font-semibold text-text-h">{classItem.name}</h3>
      <p className="mt-2 min-h-[40px] text-[13px] leading-relaxed text-text">
        {classItem.description || 'Sin descripción todavía.'}
      </p>
      <span className="mt-2 inline-block rounded-full bg-bg px-2.5 py-1 text-[11.5px] font-medium text-text">
        {gameCount === null ? '…' : `${gameCount} ${gameCount === 1 ? 'juego asignado' : 'juegos asignados'}`}
      </span>
    </button>
  )
}

function ClassDetail({
  classId,
  classInfo,
  onBack,
}: {
  classId: string
  classInfo: TeacherClass | null
  onBack: () => void
}) {
  const { token } = useAuth()
  const [games, setGames] = useState<GameSummary[]>([])
  const [subjects, setSubjects] = useState<SubjectWithGameCount[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)

  function reload() {
    if (!token) return
    setLoading(true)
    listClassGames(token, classId)
      .then(setGames)
      .catch((err: unknown) => setError(err instanceof ApiError ? err.message : 'No se pudieron cargar los juegos de la clase.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, classId])

  useEffect(() => {
    if (!token) return
    listSubjects(token)
      .then(setSubjects)
      .catch(() => {})
  }, [token])

  function subjectNameFor(categoryId: string): string {
    return subjects.find((s) => s.id === categoryId)?.name ?? 'Materia'
  }

  async function handleRemove(gameId: string) {
    if (!token) return
    setRemovingId(gameId)
    try {
      await removeGameFromClass(token, classId, gameId)
      setGames((current) => current.filter((g) => g.id !== gameId))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo quitar el juego de la clase.')
    } finally {
      setRemovingId(null)
    }
  }

  return (
    <section className="flex flex-col gap-6">
      <div>
        <button
          type="button"
          onClick={onBack}
          className="mb-3 flex items-center gap-1.5 text-[13px] font-medium text-text hover:text-text-h"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={2.25} />
          Mis Clases
        </button>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[13px] text-text">Mis Clases / {classInfo?.name ?? 'Clase'}</p>
            <h2 className="mt-1 text-[22px] tracking-tight text-text-h">{classInfo?.name ?? 'Clase'}</h2>
          </div>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13.5px] font-semibold text-white shadow-[0_10px_28px_-10px_var(--accent)] transition-transform hover:-translate-y-0.5"
            style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))' }}
          >
            <Plus className="h-[18px] w-[18px]" strokeWidth={2.25} />
            Agregar juego
          </button>
        </div>
      </div>

      {error && <p className="rounded-lg border border-danger/35 bg-danger/10 px-3 py-2.5 text-sm text-danger" role="alert">{error}</p>}

      {loading ? (
        <p className="text-[14px] text-text">Cargando juegos…</p>
      ) : games.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16 text-center">
          <p className="text-[15px] font-medium text-text-h">Aún no hay juegos en esta clase</p>
          <p className="mt-1 max-w-[360px] text-[13px] text-text">Agrega juegos existentes de cualquier materia.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {games.map((game) => {
            const Icon = iconForCategory(subjectNameFor(game.categoryId))
            return (
              <li
                key={game.id}
                className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3.5"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                  <Icon className="h-4 w-4" strokeWidth={2} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-semibold text-text-h">{game.title}</span>
                  <span className="text-[12px] text-text">{subjectNameFor(game.categoryId)}</span>
                </span>
                <button
                  type="button"
                  aria-label={`Quitar ${game.title} de esta clase`}
                  title="Quitar de esta clase"
                  disabled={removingId === game.id}
                  onClick={() => handleRemove(game.id)}
                  className="shrink-0 rounded-lg border border-border p-2 text-text/70 transition-colors hover:border-danger hover:bg-danger/10 hover:text-danger disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Trash2 className="h-4 w-4" strokeWidth={2} />
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {showAddModal && (
        <AddGameModal
          classId={classId}
          className={classInfo?.name ?? 'esta clase'}
          existingGameIds={games.map((g) => g.id)}
          subjectNameFor={subjectNameFor}
          onClose={() => setShowAddModal(false)}
          onAdded={() => {
            setShowAddModal(false)
            reload()
          }}
        />
      )}
    </section>
  )
}

function AddGameModal({
  classId,
  className,
  existingGameIds,
  subjectNameFor,
  onClose,
  onAdded,
}: {
  classId: string
  className: string
  existingGameIds: string[]
  subjectNameFor: (categoryId: string) => string
  onClose: () => void
  onAdded: () => void
}) {
  const { token } = useAuth()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<GameSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    setLoading(true)
    const timeout = setTimeout(() => {
      listGames(token, { search: query || undefined, pageSize: 40 })
        .then((result) => setResults(result.items))
        .catch(() => setResults([]))
        .finally(() => setLoading(false))
    }, 250)
    return () => clearTimeout(timeout)
  }, [token, query])

  const selectable = results.filter((game) => !existingGameIds.includes(game.id))

  function toggle(gameId: string) {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (next.has(gameId)) next.delete(gameId)
      else next.add(gameId)
      return next
    })
  }

  async function handleConfirm() {
    if (!token || selectedIds.size === 0) return
    setSaving(true)
    setError(null)
    try {
      for (const gameId of selectedIds) {
        await addGameToClass(token, classId, gameId)
      }
      onAdded()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudieron agregar los juegos seleccionados.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal onClose={onClose} maxWidthClassName="max-w-[520px]">
      <h2 className="mb-1 text-[18px] tracking-tight text-text-h">Agregar juego a {className}</h2>
      <p className="mb-4 text-[13px] text-text">Busca entre todos los juegos del catálogo, sin importar la materia.</p>

      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text/50" strokeWidth={2} />
        <input
          type="text"
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar juegos…"
          className="w-full rounded-lg border border-border bg-bg py-2.5 pl-9 pr-3 text-[13px] text-text-h outline-none focus:border-accent"
        />
      </div>

      <div className="max-h-[300px] overflow-y-auto rounded-lg border border-border">
        {loading ? (
          <p className="p-4 text-center text-[13px] text-text">Buscando…</p>
        ) : selectable.length === 0 ? (
          <p className="p-4 text-center text-[13px] text-text">No hay juegos que coincidan.</p>
        ) : (
          <ul className="divide-y divide-border">
            {selectable.map((game) => (
              <li key={game.id}>
                <label className="flex cursor-pointer items-center gap-3 px-3.5 py-3 hover:bg-bg">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(game.id)}
                    onChange={() => toggle(game.id)}
                    className="h-4 w-4 shrink-0 accent-accent"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-medium text-text-h">{game.title}</span>
                    <span className="text-[12px] text-text">— {subjectNameFor(game.categoryId)}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </div>

      {error && (
        <p className="mt-3 text-[13px] text-danger" role="alert">
          {error}
        </p>
      )}

      <p className="mt-3 text-[12.5px] text-text">
        {selectedIds.size} {selectedIds.size === 1 ? 'juego seleccionado' : 'juegos seleccionados'}
      </p>

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          className="flex-1 rounded-lg px-4 py-2.5 text-[14px] font-semibold text-white shadow-[0_8px_20px_-8px_var(--accent)] transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))' }}
          disabled={saving || selectedIds.size === 0}
          onClick={handleConfirm}
        >
          {saving ? 'Agregando…' : `Agregar ${selectedIds.size} ${selectedIds.size === 1 ? 'juego seleccionado' : 'juegos seleccionados'}`}
        </button>
        <button
          type="button"
          className="rounded-lg border border-border px-4 py-2.5 text-[14px] font-medium text-text-h"
          onClick={onClose}
          disabled={saving}
        >
          Cancelar
        </button>
      </div>
    </Modal>
  )
}
