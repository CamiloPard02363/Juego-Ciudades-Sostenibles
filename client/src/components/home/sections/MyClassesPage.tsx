import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, Copy, Plus, Search, Trash2, Users } from 'lucide-react'
import { useAuth } from '../../../hooks/useAuth'
import { useToast } from '../../../hooks/useToast'
import { ApiError } from '../../../utils/http'
import {
  createClass,
  listMyClassesDetail,
  listClassGames,
  addGameToClass,
  removeGameFromClass,
  deactivateClass,
  reactivateClass,
  type TeacherClassDetail,
} from '../../../services/class.service'
import { listGames, type GameSummary } from '../../../services/game.service'
import { listMyOrganizations, type OrganizationWithMyRole } from '../../../services/organization.service'
import { listSubjects, type SubjectWithGameCount } from '../../../services/subject.service'
import { iconForCategory } from '../gamesCatalogVisuals'
import { Modal } from '../games/Modal'

export function MyClassesPage() {
  const { token, user } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const { classId } = useParams<{ classId?: string }>()

  const [classes, setClasses] = useState<TeacherClassDetail[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [organizationId, setOrganizationId] = useState('')
  const [savingClass, setSavingClass] = useState(false)
  // Separación visual de clases activas/inactivas (issue #133/#136, Frente
  // D, CA-D4) — no se mezclan en la misma grilla. `includeInactive` siempre
  // pide ambas al backend y el filtro real ocurre en cliente: evita un
  // segundo round-trip solo por cambiar de pestaña.
  const [tab, setTab] = useState<'active' | 'inactive'>('active')
  const [togglingClassId, setTogglingClassId] = useState<string | null>(null)
  // Confirmación simple antes de (des)activar (issue #133/#136, CA-D4): es
  // reversible, mismo criterio de "confirmación sin fricción extra" que
  // `OrganizationDashboard` usa para (des)activar una organización.
  const [classPendingToggle, setClassPendingToggle] = useState<TeacherClassDetail | null>(null)

  // Organizaciones propias del profesor, para el selector opcional al crear
  // clase (issue #106/#108, CA1.7). Si son 0 o 1, el selector no se muestra —
  // nunca se fuerza una única opción.
  const [myOrganizations, setMyOrganizations] = useState<OrganizationWithMyRole[]>([])

  function reloadClasses() {
    if (!token || user?.role !== 'TEACHER') return
    // Workaround del bug conocido de query params booleanos (issue #135):
    // solo se envía `includeInactive=true` cuando aplica, nunca `=false`
    // explícito — mismo patrón que `OrganizationDashboard` usa para
    // `isActive` de organizaciones.
    return listMyClassesDetail(token, true)
      .then(setClasses)
      .catch((err: unknown) => setError(err instanceof ApiError ? err.message : 'No se pudieron cargar tus clases.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    reloadClasses()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, user?.role])

  useEffect(() => {
    if (!token || user?.role !== 'TEACHER') return
    listMyOrganizations(token)
      .then(setMyOrganizations)
      .catch((err: unknown) => console.error('No se pudieron cargar las organizaciones del profesor:', err))
  }, [token, user?.role])

  async function handleCreate() {
    if (!token || !name.trim()) return
    setSavingClass(true)
    setError(null)
    try {
      await createClass(token, {
        name: name.trim(),
        description: description.trim() || undefined,
        organizationId: organizationId || undefined,
      })
      setName('')
      setDescription('')
      setOrganizationId('')
      setCreating(false)
    } catch (err: unknown) {
      const message = err instanceof ApiError ? err.message : 'No se pudo crear la clase.'
      if (err instanceof ApiError && err.status === 403) {
        showToast(message, 'error')
      } else {
        setError(message)
      }
      setSavingClass(false)
      return
    }
    // El objeto devuelto por `createClass` no trae `inviteCode`/`students`
    // (esos campos solo existen en `ClassDetailDto`) — se recarga el detalle
    // completo en vez de insertar un item parcial optimista. La clase ya
    // quedó creada en el backend, así que un fallo aquí no debe leerse como
    // "no se pudo crear la clase".
    try {
      await reloadClasses()
    } catch (err: unknown) {
      console.error('La clase se creó, pero no se pudo recargar el listado:', err)
    } finally {
      setSavingClass(false)
    }
  }

  async function handleConfirmToggleClassActive() {
    if (!token || !classPendingToggle) return
    const classItem = classPendingToggle
    setTogglingClassId(classItem.id)
    try {
      if (classItem.isActive) {
        await deactivateClass(token, classItem.id)
      } else {
        await reactivateClass(token, classItem.id)
      }
      setClasses((current) =>
        current.map((c) => (c.id === classItem.id ? { ...c, isActive: !classItem.isActive } : c)),
      )
      showToast(classItem.isActive ? 'Clase desactivada.' : 'Clase reactivada.')
      setClassPendingToggle(null)
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'No se pudo actualizar el estado de la clase.', 'error')
    } finally {
      setTogglingClassId(null)
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
          {myOrganizations.length > 1 && (
            <label className="mt-3 flex flex-col gap-1.5 text-[13px] font-medium text-text-h sm:max-w-[320px]">
              Organización <span className="font-normal text-text">(opcional)</span>
              <select
                value={organizationId}
                onChange={(event) => setOrganizationId(event.target.value)}
                className="rounded-xl border border-border bg-bg px-3 py-2.5 text-[14px] text-text-h outline-none focus:border-accent focus:ring-2 focus:ring-accent/10"
              >
                <option value="">Sin organización</option>
                {myOrganizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      )}

      {error && <p className="rounded-lg border border-danger/35 bg-danger/10 px-3 py-2.5 text-sm text-danger" role="alert">{error}</p>}

      {!loading && classes.length > 0 && (
        <div className="flex gap-2 border-b border-border">
          {(
            [
              { key: 'active' as const, label: 'Clases activas', count: classes.filter((c) => c.isActive).length },
              { key: 'inactive' as const, label: 'Clases inactivas', count: classes.filter((c) => !c.isActive).length },
            ]
          ).map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => setTab(option.key)}
              className={`border-b-2 px-3 py-2 text-[13.5px] font-medium transition-colors ${
                tab === option.key
                  ? 'border-accent text-text-h'
                  : 'border-transparent text-text hover:text-text-h'
              }`}
            >
              {option.label} ({option.count})
            </button>
          ))}
        </div>
      )}

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
        (() => {
          const visibleClasses = classes.filter((c) => (tab === 'active' ? c.isActive : !c.isActive))
          return visibleClasses.length === 0 ? (
            <p className="text-[13.5px] text-text">
              {tab === 'active' ? 'No tienes clases activas.' : 'No tienes clases inactivas.'}
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {visibleClasses.map((classItem) => (
                <ClassCard
                  key={classItem.id}
                  classItem={classItem}
                  toggling={togglingClassId === classItem.id}
                  onOpen={() => navigate(`/mis-clases/${classItem.id}`)}
                  onToggleActive={() => setClassPendingToggle(classItem)}
                />
              ))}
            </div>
          )
        })()
      )}

      {classPendingToggle && (
        <Modal onClose={() => setClassPendingToggle(null)}>
          <h3 className="mb-2 text-[17px] font-semibold text-text-h">
            {classPendingToggle.isActive ? 'Desactivar clase' : 'Reactivar clase'}
          </h3>
          <p className="mb-5 text-[13.5px] text-text">
            {classPendingToggle.isActive
              ? `¿Seguro que quieres desactivar "${classPendingToggle.name}"? Puedes reactivarla cuando quieras.`
              : `¿Seguro que quieres reactivar "${classPendingToggle.name}"?`}
          </p>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              className="rounded-lg border border-border px-3.5 py-2 text-[13px] font-medium text-text-h"
              onClick={() => setClassPendingToggle(null)}
              disabled={togglingClassId === classPendingToggle.id}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="rounded-lg bg-danger px-4 py-2 text-[13px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              onClick={handleConfirmToggleClassActive}
              disabled={togglingClassId === classPendingToggle.id}
            >
              {togglingClassId === classPendingToggle.id
                ? 'Procesando…'
                : classPendingToggle.isActive
                  ? 'Desactivar'
                  : 'Reactivar'}
            </button>
          </div>
        </Modal>
      )}
    </section>
  )
}

function ClassCard({
  classItem,
  toggling,
  onOpen,
  onToggleActive,
}: {
  classItem: TeacherClassDetail
  toggling: boolean
  onOpen: () => void
  onToggleActive: () => void
}) {
  const { token } = useAuth()
  const [gameCount, setGameCount] = useState<number | null>(null)

  useEffect(() => {
    if (!token) return
    listClassGames(token, classItem.id)
      .then((games) => setGameCount(games.length))
      .catch(() => setGameCount(0))
  }, [token, classItem.id])

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 shadow-[var(--shadow)] transition-transform hover:-translate-y-0.5">
      <button type="button" onClick={onOpen} className="block w-full text-left">
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
      <button
        type="button"
        disabled={toggling}
        onClick={onToggleActive}
        className="mt-4 w-full rounded-lg border border-border px-3 py-1.5 text-[12.5px] font-medium text-text-h disabled:cursor-not-allowed disabled:opacity-50"
      >
        {toggling ? 'Procesando…' : classItem.isActive ? 'Desactivar' : 'Reactivar'}
      </button>
    </div>
  )
}

function ClassDetail({
  classId,
  classInfo,
  onBack,
}: {
  classId: string
  classInfo: TeacherClassDetail | null
  onBack: () => void
}) {
  const { token } = useAuth()
  const { showToast } = useToast()
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
      .catch((err: unknown) => console.error('No se pudieron cargar las materias:', err))
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

  async function handleCopyInviteCode() {
    if (!classInfo?.inviteCode) return
    try {
      await navigator.clipboard.writeText(classInfo.inviteCode)
      showToast('Código de invitación copiado.')
    } catch {
      showToast('No se pudo copiar el código.', 'error')
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
            {classInfo?.inviteCode && (
              <button
                type="button"
                onClick={handleCopyInviteCode}
                title="Copiar código de invitación"
                className="mt-2 flex items-center gap-1.5 rounded-lg border border-border bg-bg px-2.5 py-1.5 text-[12.5px] font-medium text-text-h hover:border-accent"
              >
                <Copy className="h-3.5 w-3.5" strokeWidth={2} />
                Código: {classInfo.inviteCode}
              </button>
            )}
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

      <div className="rounded-2xl border border-border p-5">
        <div className="mb-3 flex items-center gap-2">
          <Users className="h-[18px] w-[18px] text-text" strokeWidth={2} />
          <h3 className="text-[15px] font-semibold text-text-h">Estudiantes matriculados</h3>
        </div>
        {!classInfo || classInfo.students.length === 0 ? (
          <p className="text-[14px] text-text">Todavía no hay estudiantes matriculados en esta clase.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13.5px]">
              <thead>
                <tr className="border-b border-border text-text/70">
                  <th className="px-3 py-2 font-medium">Nombre</th>
                  <th className="px-3 py-2 font-medium">Correo</th>
                  <th className="px-3 py-2 font-medium">Matriculado</th>
                </tr>
              </thead>
              <tbody>
                {classInfo.students.map((student) => (
                  <tr key={student.userId} className="border-b border-border last:border-0">
                    <td className="px-3 py-2.5 text-text-h">{student.displayName ?? '—'}</td>
                    <td className="px-3 py-2.5 text-text">{student.email ?? '—'}</td>
                    <td className="px-3 py-2.5 text-text">
                      {new Date(student.enrolledAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <h3 className="text-[15px] font-semibold text-text-h">Juegos asignados</h3>

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
