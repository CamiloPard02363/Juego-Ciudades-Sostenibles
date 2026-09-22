import { useEffect, useState } from 'react'
import { Building2, GraduationCap, UserPlus } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../hooks/useToast'
import {
  listMyOrganizations,
  listOrganizationStudents,
  type OrganizationMember,
  type OrganizationWithMyRole,
} from '../../services/organization.service'
import { listMyClassesDetail, enrollStudent, type TeacherClassDetail } from '../../services/class.service'
import { ApiError } from '../../utils/http'
import { Modal } from './games/Modal'

const MEMBER_ROLE_STYLES: Record<string, string> = {
  ADMIN: 'bg-accent/10 text-accent',
  TEACHER: 'bg-accent-2/10 text-accent-2',
  STUDENT: 'bg-code-bg text-text-h',
}

/**
 * Vista de organización para un usuario que la integra pero no es ADMIN en
 * ninguna (issue #133/#136, Frente B). Lista sus organizaciones con su rol
 * en cada una. Si tiene rol TEACHER en alguna, ofrece matricular estudiantes
 * de esa organización a sus clases sin código (Frente C). Si solo es
 * STUDENT, es de solo lectura.
 */
export function MyOrganizationView() {
  const { token } = useAuth()
  const [organizations, setOrganizations] = useState<OrganizationWithMyRole[]>([])
  const [loading, setLoading] = useState(true)
  const [enrollingOrg, setEnrollingOrg] = useState<OrganizationWithMyRole | null>(null)

  useEffect(() => {
    if (!token) return
    setLoading(true)
    listMyOrganizations(token)
      .then(setOrganizations)
      .catch((err: unknown) => {
        console.error('No se pudieron cargar las organizaciones del usuario:', err)
      })
      .finally(() => setLoading(false))
  }, [token])

  if (loading) {
    return <p className="text-[14px] text-text">Cargando organización…</p>
  }

  return (
    <section className="flex flex-col gap-6">
      <div>
        <h2 className="mb-1 text-[22px] tracking-tight text-text-h">Mi organización</h2>
        <p className="text-[14px] text-text">
          Institución(es) a las que perteneces y tu rol en cada una.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {organizations.map((org) => (
          <div key={org.id} className="rounded-2xl border border-border p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
                  <Building2 className="h-5 w-5" strokeWidth={2} />
                </span>
                <div>
                  <p className="text-[15px] font-semibold text-text-h">{org.name}</p>
                  <p className="text-[12.5px] text-text">
                    Miembro desde {new Date(org.joinedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-2.5 py-1 text-[12px] font-medium ${
                    MEMBER_ROLE_STYLES[org.myOrgRole] ?? 'bg-code-bg text-text-h'
                  }`}
                >
                  {org.myOrgRole}
                </span>
                {org.myOrgRole === 'TEACHER' && (
                  <button
                    type="button"
                    className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-[12.5px] font-medium text-text-h hover:border-accent"
                    onClick={() => setEnrollingOrg(org)}
                  >
                    <UserPlus className="h-[15px] w-[15px]" strokeWidth={2} />
                    Matricular estudiantes
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {enrollingOrg && (
        <EnrollStudentsModal organization={enrollingOrg} onClose={() => setEnrollingOrg(null)} />
      )}
    </section>
  )
}

/**
 * Matrícula directa de estudiantes de la organización a una clase propia,
 * sin código de invitación (issue #133/#136, Frente C). Reutiliza el patrón
 * de selección múltiple con checkboxes de `AddGameModal`
 * (`MyClassesPage.tsx`): primero se elige la clase (propia, de esa
 * organización), luego los estudiantes a matricular.
 */
function EnrollStudentsModal({
  organization,
  onClose,
}: {
  organization: OrganizationWithMyRole
  onClose: () => void
}) {
  const { token } = useAuth()
  const { showToast } = useToast()
  const [classes, setClasses] = useState<TeacherClassDetail[]>([])
  const [students, setStudents] = useState<OrganizationMember[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [classId, setClassId] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    setLoading(true)
    setLoadError(null)
    Promise.all([listMyClassesDetail(token), listOrganizationStudents(token, organization.id)])
      .then(([classesResult, studentsResult]) => {
        const ownClasses = classesResult.filter((c) => c.organizationId === organization.id)
        setClasses(ownClasses)
        setStudents(studentsResult)
        if (ownClasses.length > 0) setClassId(ownClasses[0].id)
      })
      .catch((err: unknown) => {
        setLoadError(
          err instanceof ApiError ? err.message : 'No se pudieron cargar clases o estudiantes.',
        )
      })
      .finally(() => setLoading(false))
  }, [token, organization.id])

  const alreadyEnrolledIds = classes.find((c) => c.id === classId)?.students.map((s) => s.userId) ?? []
  const selectableStudents = students.filter((student) => !alreadyEnrolledIds.includes(student.userId))

  function toggle(userId: string) {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (next.has(userId)) next.delete(userId)
      else next.add(userId)
      return next
    })
  }

  async function handleConfirm() {
    if (!token || !classId || selectedIds.size === 0) return
    setSaving(true)
    setError(null)
    try {
      for (const userId of selectedIds) {
        await enrollStudent(token, classId, userId)
      }
      showToast(
        selectedIds.size === 1 ? 'Estudiante matriculado.' : `${selectedIds.size} estudiantes matriculados.`,
      )
      onClose()
    } catch (err) {
      // No debería ocurrir desde esta UI (solo se listan STUDENT ya-miembros
      // de la organización), pero el backend valida igual — se propaga el
      // mensaje real si pasa.
      setError(err instanceof ApiError ? err.message : 'No se pudieron matricular los estudiantes seleccionados.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal onClose={onClose} maxWidthClassName="max-w-[520px]">
      <h2 className="mb-1 text-[18px] tracking-tight text-text-h">
        Matricular estudiantes de {organization.name}
      </h2>
      <p className="mb-4 text-[13px] text-text">
        Elige una de tus clases de esta organización y selecciona a los estudiantes a matricular.
      </p>

      {loading ? (
        <p className="p-4 text-center text-[13px] text-text">Cargando…</p>
      ) : loadError ? (
        <p className="text-[13px] text-danger" role="alert">
          {loadError}
        </p>
      ) : classes.length === 0 ? (
        <p className="text-[13px] text-text">
          No tienes clases creadas en esta organización todavía.
        </p>
      ) : (
        <>
          <label className="mb-3 flex flex-col gap-1.5 text-[13px] font-medium text-text-h">
            Clase
            <select
              value={classId}
              onChange={(event) => {
                setClassId(event.target.value)
                setSelectedIds(new Set())
              }}
              disabled={saving}
              className="rounded-lg border border-border bg-bg px-3.5 py-2.5 text-[14px] text-text-h outline-none focus:border-accent"
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          <div className="max-h-[280px] overflow-y-auto rounded-lg border border-border">
            {selectableStudents.length === 0 ? (
              <p className="flex items-center gap-2 p-4 text-center text-[13px] text-text">
                <GraduationCap className="h-4 w-4 shrink-0" strokeWidth={2} />
                No hay estudiantes disponibles para matricular en esta clase.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {selectableStudents.map((student) => (
                  <li key={student.userId}>
                    <label className="flex cursor-pointer items-center gap-3 px-3.5 py-3 hover:bg-bg">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(student.userId)}
                        onChange={() => toggle(student.userId)}
                        className="h-4 w-4 shrink-0 accent-accent"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13.5px] font-medium text-text-h">
                          {student.displayName ?? student.email ?? 'Estudiante'}
                        </span>
                        {student.email && <span className="text-[12px] text-text">{student.email}</span>}
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
            {selectedIds.size} {selectedIds.size === 1 ? 'estudiante seleccionado' : 'estudiantes seleccionados'}
          </p>

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              className="flex-1 rounded-lg px-4 py-2.5 text-[14px] font-semibold text-white shadow-[0_8px_20px_-8px_var(--accent)] transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))' }}
              disabled={saving || selectedIds.size === 0}
              onClick={handleConfirm}
            >
              {saving ? 'Matriculando…' : `Matricular ${selectedIds.size || ''}`.trim()}
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
        </>
      )}
    </Modal>
  )
}
