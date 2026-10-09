import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Building2, Copy, GraduationCap, LayoutGrid, Mail, UserMinus, UserPlus, Users2 } from 'lucide-react'
import { useAuth } from '../../../hooks/useAuth'
import { useToast } from '../../../hooks/useToast'
import {
  addOrganizationMember,
  changeOrganizationMemberRole,
  listAllOrganizations,
  listMyOrganizations,
  listOrganizationMembers,
  removeOrganizationMember,
  ORGANIZATION_ROLES,
  type OrganizationMember,
  type OrganizationRoleValue,
  type OrganizationWithMyRole,
} from '../../../services/organization.service'
import { inviteStudentToOrganization, type EnrollOrInviteResult } from '../../../services/invitation.service'
import { ApiError } from '../../../utils/http'
import { Modal } from '../games/Modal'
import { InstitutionTopNav, type InstitutionSection } from './InstitutionTopNav'
import { InstitutionStudentsSection } from './InstitutionStudentsSection'
import { InstitutionTeachersSection } from './InstitutionTeachersSection'
import { InstitutionClassesSection } from './InstitutionClassesSection'
import { InstitutionGamesSection } from './InstitutionGamesSection'
import { ClassDrilldownTabs } from './ClassDrilldownTabs'
import { useInstitutionClasses } from './useInstitutionClasses'

const ORG_ROLE_OPTIONS = ORGANIZATION_ROLES

const MEMBER_ROLE_STYLES: Record<string, string> = {
  ADMIN: 'bg-accent/10 text-accent',
  TEACHER: 'bg-accent-2/10 text-accent-2',
  STUDENT: 'bg-code-bg text-text-h',
}

/**
 * Vista dedicada de institución (issue #226, fix de navegación): ruta propia
 * `/organizaciones/:id` en vez del estado inline que antes vivía mezclado con
 * el listado de organizaciones en `OrganizationDashboard`. Permite
 * atrás/adelante del navegador y compartir el link directo.
 *
 * Resuelve el nombre/rol de la organización buscando por id en los mismos
 * dos ejes de datos que ya usaba `OrganizationDashboard` (propias vía
 * `listMyOrganizations`, o todas vía `listAllOrganizations` si es ADMIN
 * global) — no existe todavía un `GET /organizations/:id` dedicado de
 * backend, así que evita ampliar esa superficie para este fix.
 */
export function InstitutionView() {
  const { id: organizationId } = useParams<{ id: string }>()
  const { token, user } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const isGlobalAdmin = user?.role === 'ADMIN'

  const [organization, setOrganization] = useState<OrganizationWithMyRole | { id: string; name: string } | null>(
    null,
  )
  const [loadingOrganization, setLoadingOrganization] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const [institutionSection, setInstitutionSection] = useState<InstitutionSection>('members')
  const [selectedClass, setSelectedClass] = useState<{ id: string; name: string } | null>(null)

  const [members, setMembers] = useState<OrganizationMember[]>([])
  const [loadingMembers, setLoadingMembers] = useState(false)
  const [membersError, setMembersError] = useState<string | null>(null)

  const [showAddMemberModal, setShowAddMemberModal] = useState(false)
  const [newMemberEmail, setNewMemberEmail] = useState('')
  const [newMemberRole, setNewMemberRole] = useState<OrganizationRoleValue>('STUDENT')
  const [addingMember, setAddingMember] = useState(false)
  const [addMemberError, setAddMemberError] = useState<string | null>(null)
  const [addMemberSuccess, setAddMemberSuccess] = useState<string | null>(null)

  const [memberPendingRemoval, setMemberPendingRemoval] = useState<OrganizationMember | null>(null)
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null)
  const [changingRoleUserId, setChangingRoleUserId] = useState<string | null>(null)

  // Alta manual de estudiante con invitación por link (issue #232): modal
  // separado de `AddMemberModal` porque este siempre matricula como STUDENT
  // (sin elegir rol) y pide nombre + apellido para poder generar la
  // invitación si el email todavía no tiene cuenta.
  const [showInviteStudentModal, setShowInviteStudentModal] = useState(false)
  const [inviteFirstName, setInviteFirstName] = useState('')
  const [inviteLastName, setInviteLastName] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [invitingStudent, setInvitingStudent] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteResult, setInviteResult] = useState<EnrollOrInviteResult | null>(null)

  // Solo para el badge de resumen del header — ya se carga de todas formas
  // para la pestaña "Clases", así que reusarlo acá no agrega una llamada
  // nueva (issue #226, fix de performance: evitar waterfalls innecesarios).
  const { classes } = useInstitutionClasses(organizationId ?? '')

  // Resuelve nombre + rol de la organización buscando en los dos ejes de
  // datos disponibles, en paralelo (issue #226, fix de performance: antes de
  // este fix no había waterfall acá porque no existía esta vista, pero
  // conviene dejarlo en paralelo desde el inicio).
  useEffect(() => {
    if (!token || !organizationId) return
    let cancelled = false
    setLoadingOrganization(true)
    setNotFound(false)

    Promise.all([
      listMyOrganizations(token).catch(() => [] as OrganizationWithMyRole[]),
      isGlobalAdmin
        ? listAllOrganizations(token, { pageSize: 1000 }).catch(() => ({ items: [], total: 0, page: 1, pageSize: 0 }))
        : Promise.resolve({ items: [], total: 0, page: 1, pageSize: 0 }),
    ]).then(([mine, all]) => {
      if (cancelled) return
      const found = mine.find((org) => org.id === organizationId) ?? all.items.find((org) => org.id === organizationId)
      if (!found) {
        setNotFound(true)
      } else {
        setOrganization(found)
      }
      setLoadingOrganization(false)
    })

    return () => {
      cancelled = true
    }
  }, [token, organizationId, isGlobalAdmin])

  useEffect(() => {
    if (!token || !organizationId) return
    setLoadingMembers(true)
    setMembersError(null)
    setAddMemberSuccess(null)
    setAddMemberError(null)
    listOrganizationMembers(token, organizationId)
      .then((items) => setMembers(items))
      .catch((err: unknown) => {
        setMembersError(err instanceof ApiError ? err.message : 'No se pudieron cargar los miembros.')
      })
      .finally(() => setLoadingMembers(false))
  }, [token, organizationId])

  const reloadMembers = useCallback(() => {
    if (!token || !organizationId) return
    listOrganizationMembers(token, organizationId)
      .then((items) => setMembers(items))
      .catch((err: unknown) => {
        console.error('No se pudo recargar el listado de miembros:', err)
      })
  }, [token, organizationId])

  async function handleAddMember(event: FormEvent) {
    event.preventDefault()
    if (!token || !organizationId) return
    setAddingMember(true)
    setAddMemberError(null)
    setAddMemberSuccess(null)
    try {
      const member = await addOrganizationMember(token, organizationId, {
        email: newMemberEmail.trim(),
        orgRole: newMemberRole,
      })
      reloadMembers()
      setAddMemberSuccess(`${member.displayName ?? member.email ?? 'Usuario'} agregado como ${member.orgRole}.`)
      setNewMemberEmail('')
      setNewMemberRole('STUDENT')
    } catch (err) {
      setAddMemberError(err instanceof ApiError ? err.message : 'No se pudo agregar al miembro.')
    } finally {
      setAddingMember(false)
    }
  }

  async function handleInviteStudent(event: FormEvent) {
    event.preventDefault()
    if (!token || !organizationId) return
    setInvitingStudent(true)
    setInviteError(null)
    setInviteResult(null)
    try {
      const result = await inviteStudentToOrganization(token, organizationId, {
        email: inviteEmail.trim(),
        firstName: inviteFirstName.trim(),
        lastName: inviteLastName.trim(),
      })
      setInviteResult(result)
      if (result.status === 'LINKED') {
        reloadMembers()
        showToast('El estudiante ya tenía cuenta: se vinculó directo a la organización.')
      }
    } catch (err) {
      setInviteError(err instanceof ApiError ? err.message : 'No se pudo invitar al estudiante.')
    } finally {
      setInvitingStudent(false)
    }
  }

  function closeInviteStudentModal() {
    setShowInviteStudentModal(false)
    setInviteFirstName('')
    setInviteLastName('')
    setInviteEmail('')
    setInviteError(null)
    setInviteResult(null)
  }

  async function handleConfirmRemoveMember() {
    if (!token || !organizationId || !memberPendingRemoval) return
    setRemovingMemberId(memberPendingRemoval.userId)
    try {
      await removeOrganizationMember(token, organizationId, memberPendingRemoval.userId)
      setMembers((current) => current.filter((member) => member.userId !== memberPendingRemoval.userId))
      showToast('Miembro removido de la organización.')
      setMemberPendingRemoval(null)
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'No se pudo remover al miembro.', 'error')
    } finally {
      setRemovingMemberId(null)
    }
  }

  async function handleChangeMemberRole(member: OrganizationMember, nextRole: OrganizationRoleValue) {
    if (!token || !organizationId || nextRole === member.orgRole) return
    setChangingRoleUserId(member.userId)
    try {
      await changeOrganizationMemberRole(token, organizationId, member.userId, nextRole)
      setMembers((current) =>
        current.map((m) => (m.userId === member.userId ? { ...m, orgRole: nextRole } : m)),
      )
      showToast(`Rol de ${member.displayName ?? member.email ?? 'miembro'} actualizado a ${nextRole}.`)
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'No se pudo cambiar el rol del miembro.', 'error')
    } finally {
      setChangingRoleUserId(null)
    }
  }

  async function handleCopyInviteCode(code: string) {
    try {
      await navigator.clipboard.writeText(code)
      showToast('Código de invitación copiado.')
    } catch {
      showToast('No se pudo copiar el código.', 'error')
    }
  }

  if (!organizationId) return null

  if (loadingOrganization) {
    return <p className="text-[14px] text-text">Cargando organización…</p>
  }

  if (notFound || !organization) {
    return (
      <div className="rounded-2xl border border-dashed border-border py-16 text-center">
        <p className="text-[15px] font-medium text-text-h">No se encontró esa organización.</p>
        <button
          type="button"
          className="mx-auto mt-4 rounded-lg border border-border px-3.5 py-2.5 text-[13.5px] font-medium text-text-h hover:border-accent"
          onClick={() => navigate('/organizacion')}
        >
          ← Volver al listado de organizaciones
        </button>
      </div>
    )
  }

  const inviteCode = 'inviteCode' in organization ? organization.inviteCode : undefined
  const studentsCount = members.filter((m) => m.orgRole === 'STUDENT').length
  const teachersCount = members.filter((m) => m.orgRole === 'TEACHER').length

  return (
    <section className="flex flex-col gap-6">
      <button
        type="button"
        onClick={() => navigate('/organizacion')}
        className="w-fit text-[12.5px] font-medium text-text hover:text-text-h"
      >
        ← Volver al listado de organizaciones
      </button>

      {/* Header robusto (issue #226, feedback de Manuel: "demasiado simple"):
          nombre de la institución con más jerarquía + badges de resumen,
          mismo tratamiento visual de blur de color que `GameFormShell`. */}
      <div className="relative overflow-hidden rounded-[28px] border border-border p-6 sm:p-8">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 -right-10 h-64 w-64 rounded-full bg-accent/15 blur-[100px]" />
          <div className="absolute bottom-[-20%] left-[-5%] h-56 w-56 rounded-full bg-accent-2/15 blur-[90px]" />
        </div>

        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white"
              style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))' }}
            >
              <Building2 className="h-6 w-6" strokeWidth={2} />
            </div>
            <div>
              <h2 className="text-[24px] font-semibold tracking-tight text-text-h">{organization.name}</h2>
              <p className="mt-0.5 text-[13.5px] text-text">
                {isGlobalAdmin
                  ? 'Viendo como ADMIN global de la plataforma.'
                  : 'Administra los miembros y los juegos institucionales.'}
              </p>
              {inviteCode && (
                <button
                  type="button"
                  onClick={() => handleCopyInviteCode(inviteCode)}
                  title="Copiar código de invitación"
                  className="mt-2.5 flex items-center gap-1.5 rounded-lg border border-border bg-bg px-2.5 py-1.5 text-[12.5px] font-medium text-text-h hover:border-accent"
                >
                  <Copy className="h-3.5 w-3.5" strokeWidth={2} />
                  Código: {inviteCode}
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <SummaryBadge icon={GraduationCap} label="Estudiantes" value={studentsCount} />
            <SummaryBadge icon={Users2} label="Profesores" value={teachersCount} />
            <SummaryBadge icon={LayoutGrid} label="Clases" value={classes.length} />
          </div>
        </div>
      </div>

      <InstitutionTopNav
        activeSection={institutionSection}
        onSectionChange={(section) => {
          setInstitutionSection(section)
          setSelectedClass(null)
        }}
      />

      {institutionSection === 'students' && (
        <div className="rounded-2xl border border-border p-5">
          <InstitutionStudentsSection organizationId={organizationId} />
        </div>
      )}

      {institutionSection === 'teachers' && (
        <div className="rounded-2xl border border-border p-5">
          <InstitutionTeachersSection organizationId={organizationId} />
        </div>
      )}

      {institutionSection === 'classes' && (
        <div className="rounded-2xl border border-border p-5">
          {selectedClass ? (
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => setSelectedClass(null)}
                className="w-fit text-[12.5px] font-medium text-text hover:text-text-h"
              >
                ← Volver a clases
              </button>
              <ClassDrilldownTabs classId={selectedClass.id} className={selectedClass.name} />
            </div>
          ) : (
            <InstitutionClassesSection
              organizationId={organizationId}
              onSelectClass={(classId, className) => setSelectedClass({ id: classId, name: className })}
            />
          )}
        </div>
      )}

      {institutionSection === 'games' && (
        <div className="rounded-2xl border border-border p-5">
          <InstitutionGamesSection organizationId={organizationId} organizationName={organization.name} />
        </div>
      )}

      {institutionSection === 'members' && (
        <div className="rounded-2xl border border-border p-5">
          <div className="mb-4 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Users2 className="h-[18px] w-[18px] text-text" strokeWidth={2} />
              <h3 className="text-[15px] font-semibold text-text-h">Miembros</h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-[12.5px] font-medium text-text-h hover:border-accent"
                onClick={() => setShowInviteStudentModal(true)}
              >
                <Mail className="h-[15px] w-[15px]" strokeWidth={2} />
                Invitar estudiante
              </button>
              <button
                type="button"
                className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-[12.5px] font-medium text-text-h hover:border-accent"
                onClick={() => {
                  setAddMemberError(null)
                  setAddMemberSuccess(null)
                  setShowAddMemberModal(true)
                }}
              >
                <UserPlus className="h-[15px] w-[15px]" strokeWidth={2} />
                Agregar miembro
              </button>
            </div>
          </div>

          {membersError && (
            <p
              className="mb-3 rounded-lg border border-danger/35 bg-danger/10 px-[13px] py-[11px] text-sm leading-snug text-danger"
              role="alert"
            >
              {membersError}
            </p>
          )}

          {loadingMembers ? (
            <p className="text-[14px] text-text">Cargando miembros…</p>
          ) : members.length === 0 ? (
            <p className="text-[14px] text-text">Todavía no hay miembros en esta organización.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13.5px]">
                <thead>
                  <tr className="border-b border-border text-text/70">
                    <th className="px-3 py-2 font-medium">Nombre</th>
                    <th className="px-3 py-2 font-medium">Correo</th>
                    <th className="px-3 py-2 font-medium">Rol</th>
                    <th className="px-3 py-2 font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((member) => {
                    const isSelf = member.userId === user?.id
                    return (
                      <tr key={member.userId} className="border-b border-border last:border-0">
                        <td className="px-3 py-2.5 text-text-h">{member.displayName ?? '—'}</td>
                        <td className="px-3 py-2.5 text-text">{member.email ?? '—'}</td>
                        <td className="px-3 py-2.5">
                          {isSelf ? (
                            <span
                              className={`rounded-full px-2.5 py-1 text-[12px] font-medium ${
                                MEMBER_ROLE_STYLES[member.orgRole] ?? 'bg-code-bg text-text-h'
                              }`}
                            >
                              {member.orgRole}
                            </span>
                          ) : (
                            <select
                              aria-label={`Rol de ${member.displayName ?? member.email ?? 'miembro'}`}
                              value={member.orgRole}
                              disabled={changingRoleUserId === member.userId}
                              onChange={(event) =>
                                handleChangeMemberRole(member, event.target.value as OrganizationRoleValue)
                              }
                              className="rounded-lg border border-border bg-bg px-2.5 py-1.5 text-[12px] text-text-h outline-none focus:border-accent disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {ORG_ROLE_OPTIONS.map((role) => (
                                <option key={role} value={role}>
                                  {role}
                                </option>
                              ))}
                            </select>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          <button
                            type="button"
                            className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-[12px] font-medium text-text-h hover:border-danger hover:bg-danger/10 hover:text-danger disabled:cursor-not-allowed disabled:opacity-50"
                            disabled={isSelf || removingMemberId === member.userId}
                            title={isSelf ? 'No puedes removerte a ti mismo.' : undefined}
                            onClick={() => setMemberPendingRemoval(member)}
                          >
                            <UserMinus className="h-3.5 w-3.5" strokeWidth={2} />
                            Remover
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {showInviteStudentModal && (
        <InviteStudentModal
          firstName={inviteFirstName}
          lastName={inviteLastName}
          email={inviteEmail}
          saving={invitingStudent}
          error={inviteError}
          result={inviteResult}
          destinationName={organization.name}
          onFirstNameChange={setInviteFirstName}
          onLastNameChange={setInviteLastName}
          onEmailChange={setInviteEmail}
          onSubmit={handleInviteStudent}
          onClose={closeInviteStudentModal}
        />
      )}

      {showAddMemberModal && (
        <AddMemberModal
          email={newMemberEmail}
          orgRole={newMemberRole}
          saving={addingMember}
          error={addMemberError}
          success={addMemberSuccess}
          organizationName={organization.name}
          onEmailChange={setNewMemberEmail}
          onRoleChange={setNewMemberRole}
          onSubmit={handleAddMember}
          onClose={() => setShowAddMemberModal(false)}
        />
      )}

      {memberPendingRemoval && (
        <Modal onClose={() => setMemberPendingRemoval(null)}>
          <h3 className="mb-2 text-[17px] font-semibold text-text-h">Remover miembro</h3>
          <p className="mb-5 text-[13.5px] text-text">
            ¿Seguro que quieres remover a{' '}
            <strong className="text-text-h">
              {memberPendingRemoval.displayName ?? memberPendingRemoval.email ?? 'este usuario'}
            </strong>{' '}
            de {organization.name}? Esta acción no elimina sus clases ni sus juegos.
          </p>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              className="rounded-lg border border-border px-3.5 py-2 text-[13px] font-medium text-text-h"
              onClick={() => setMemberPendingRemoval(null)}
              disabled={removingMemberId === memberPendingRemoval.userId}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="rounded-lg bg-danger px-4 py-2 text-[13px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              onClick={handleConfirmRemoveMember}
              disabled={removingMemberId === memberPendingRemoval.userId}
            >
              {removingMemberId === memberPendingRemoval.userId ? 'Removiendo…' : 'Remover'}
            </button>
          </div>
        </Modal>
      )}
    </section>
  )
}

function SummaryBadge({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users2
  label: string
  value: number
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-border bg-bg px-3.5 py-2">
      <Icon className="h-4 w-4 text-accent" strokeWidth={2} />
      <div className="leading-tight">
        <p className="text-[14px] font-semibold text-text-h">{value}</p>
        <p className="text-[11px] text-text/70">{label}</p>
      </div>
    </div>
  )
}

type AddMemberModalProps = {
  email: string
  orgRole: OrganizationRoleValue
  saving: boolean
  error: string | null
  success: string | null
  organizationName: string
  onEmailChange: (value: string) => void
  onRoleChange: (value: OrganizationRoleValue) => void
  onSubmit: (event: FormEvent) => void
  onClose: () => void
}

function AddMemberModal({
  email,
  orgRole,
  saving,
  error,
  success,
  organizationName,
  onEmailChange,
  onRoleChange,
  onSubmit,
  onClose,
}: AddMemberModalProps) {
  return (
    <Modal onClose={onClose}>
      <h3 className="mb-1 text-[17px] font-semibold text-text-h">Agregar miembro</h3>
      <p className="mb-4 text-[13px] text-text">
        Busca un usuario ya registrado por su correo y agrégalo a {organizationName}, sin importar
        el dominio de su cuenta.
      </p>
      <form className="flex flex-col gap-4" onSubmit={onSubmit}>
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium text-text-h">Correo del usuario</span>
          <input
            type="email"
            required
            className="rounded-lg border border-border bg-bg px-3.5 py-2.5 text-[14px] text-text-h outline-none focus:border-accent"
            placeholder="usuario@correo.com"
            value={email}
            onChange={(event) => onEmailChange(event.target.value)}
            disabled={saving}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium text-text-h">Rol en la organización</span>
          <select
            className="rounded-lg border border-border bg-bg px-3.5 py-2.5 text-[14px] text-text-h outline-none focus:border-accent"
            value={orgRole}
            onChange={(event) => onRoleChange(event.target.value as OrganizationRoleValue)}
            disabled={saving}
          >
            {ORG_ROLE_OPTIONS.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </label>
        {error && (
          <p className="rounded-lg border border-danger/35 bg-danger/10 px-[13px] py-[11px] text-sm leading-snug text-danger" role="alert">
            {error}
          </p>
        )}
        {success && (
          <p className="rounded-lg border border-accent/35 bg-accent/10 px-[13px] py-[11px] text-sm leading-snug text-accent" role="status">
            {success}
          </p>
        )}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            className="rounded-lg border border-border px-3.5 py-2 text-[13px] font-medium text-text-h"
            onClick={onClose}
            disabled={saving}
          >
            Cerrar
          </button>
          <button
            type="submit"
            className="rounded-lg px-4 py-2 text-[13px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))' }}
            disabled={saving}
          >
            {saving ? 'Agregando…' : 'Agregar'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

type InviteStudentModalProps = {
  firstName: string
  lastName: string
  email: string
  saving: boolean
  error: string | null
  result: EnrollOrInviteResult | null
  destinationName: string
  onFirstNameChange: (value: string) => void
  onLastNameChange: (value: string) => void
  onEmailChange: (value: string) => void
  onSubmit: (event: FormEvent) => void
  onClose: () => void
}

/**
 * Alta manual de estudiante con invitación por link (issue #232). Si el
 * email ya tiene cuenta, el backend vincula directo (`status: 'LINKED'`); si
 * no, genera un link de un solo uso (`status: 'PENDING'`) que se muestra acá
 * para copiar y distribuir manualmente — MVP sin envío de email real.
 */
function InviteStudentModal({
  firstName,
  lastName,
  email,
  saving,
  error,
  result,
  destinationName,
  onFirstNameChange,
  onLastNameChange,
  onEmailChange,
  onSubmit,
  onClose,
}: InviteStudentModalProps) {
  const [copied, setCopied] = useState(false)

  async function handleCopyLink() {
    if (!result?.invitationUrl) return
    try {
      await navigator.clipboard.writeText(result.invitationUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Silencioso: el link sigue visible en pantalla para copiar a mano.
    }
  }

  return (
    <Modal onClose={onClose}>
      <h3 className="mb-1 text-[17px] font-semibold text-text-h">Invitar estudiante</h3>
      <p className="mb-4 text-[13px] text-text">
        Da de alta a un estudiante en {destinationName}. Si ya tiene cuenta, se vincula directo; si
        no, se genera un link de invitación para que complete su registro.
      </p>

      {result ? (
        <div className="flex flex-col gap-4">
          {result.status === 'LINKED' ? (
            <p
              className="rounded-lg border border-accent/35 bg-accent/10 px-[13px] py-[11px] text-sm leading-snug text-accent"
              role="status"
            >
              El estudiante ya tenía cuenta y quedó vinculado a {destinationName} de inmediato.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              <p className="text-[13px] text-text">
                Copia este link y envíaselo al estudiante (vence el{' '}
                {result.expiresAt ? new Date(result.expiresAt).toLocaleDateString() : 'pronto'}):
              </p>
              <div className="flex items-center gap-2 rounded-lg border border-border bg-bg px-3 py-2">
                <code className="min-w-0 flex-1 truncate text-[12.5px] text-text-h">
                  {result.invitationUrl}
                </code>
                <button
                  type="button"
                  className="shrink-0 rounded-md border border-border px-2.5 py-1 text-[12px] font-medium text-text-h hover:border-accent"
                  onClick={handleCopyLink}
                >
                  {copied ? 'Copiado' : 'Copiar'}
                </button>
              </div>
            </div>
          )}
          <div className="flex justify-end">
            <button
              type="button"
              className="rounded-lg border border-border px-3.5 py-2 text-[13px] font-medium text-text-h"
              onClick={onClose}
            >
              Cerrar
            </button>
          </div>
        </div>
      ) : (
        <form className="flex flex-col gap-4" onSubmit={onSubmit}>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] font-medium text-text-h">Nombre</span>
              <input
                type="text"
                required
                className="rounded-lg border border-border bg-bg px-3.5 py-2.5 text-[14px] text-text-h outline-none focus:border-accent"
                placeholder="Ana"
                value={firstName}
                onChange={(event) => onFirstNameChange(event.target.value)}
                disabled={saving}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] font-medium text-text-h">Apellido</span>
              <input
                type="text"
                required
                className="rounded-lg border border-border bg-bg px-3.5 py-2.5 text-[14px] text-text-h outline-none focus:border-accent"
                placeholder="García"
                value={lastName}
                onChange={(event) => onLastNameChange(event.target.value)}
                disabled={saving}
              />
            </label>
          </div>
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium text-text-h">Correo del estudiante</span>
            <input
              type="email"
              required
              className="rounded-lg border border-border bg-bg px-3.5 py-2.5 text-[14px] text-text-h outline-none focus:border-accent"
              placeholder="estudiante@correo.com"
              value={email}
              onChange={(event) => onEmailChange(event.target.value)}
              disabled={saving}
            />
          </label>
          {error && (
            <p className="rounded-lg border border-danger/35 bg-danger/10 px-[13px] py-[11px] text-sm leading-snug text-danger" role="alert">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              className="rounded-lg border border-border px-3.5 py-2 text-[13px] font-medium text-text-h"
              onClick={onClose}
              disabled={saving}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-lg px-4 py-2 text-[13px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))' }}
              disabled={saving}
            >
              {saving ? 'Invitando…' : 'Invitar'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  )
}
