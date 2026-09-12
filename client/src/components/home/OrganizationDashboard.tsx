import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Globe2, PlusCircle, UserPlus, Users2 } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import {
  addOrganizationMember,
  createOrganization,
  listAllOrganizations,
  listMyOrganizations,
  listOrganizationMembers,
  ORGANIZATION_ROLES,
  type Organization,
  type OrganizationMember,
  type OrganizationRoleValue,
  type OrganizationWithMyRole,
} from '../../services/organization.service'
import { donateGame, listGames, type GameSummary } from '../../services/game.service'
import { ApiError } from '../../utils/http'
import { Modal } from './games/Modal'

const ORG_ROLE_OPTIONS = ORGANIZATION_ROLES

const MEMBER_ROLE_STYLES: Record<string, string> = {
  ADMIN: 'bg-accent/10 text-accent',
  TEACHER: 'bg-accent-2/10 text-accent-2',
  STUDENT: 'bg-code-bg text-text-h',
}

/**
 * Dashboard de organización: lista de miembros, donación de un juego propio,
 * y atajo para crear un juego institucional. El universo de organizaciones
 * seleccionables depende del rol de quien mira: un ADMIN global ve TODAS las
 * organizaciones de la plataforma (dueño de la app, `GET /organizations/all`);
 * un ADMIN de organización ve solo aquellas donde tiene `orgRole = ADMIN`
 * (dueño de su institución). Los dos ejes nunca se mezclan en el mismo
 * selector — ver `selectableOrganizations`.
 *
 * El acceso a esta página ya se filtra en `OrganizationDashboardPage` (solo
 * ADMIN de alguna organización o ADMIN global).
 */
export function OrganizationDashboard() {
  const { token, user } = useAuth()
  const navigate = useNavigate()
  const isGlobalAdmin = user?.role === 'ADMIN'

  const [organizations, setOrganizations] = useState<OrganizationWithMyRole[]>([])
  const [loadingOrganizations, setLoadingOrganizations] = useState(true)

  // Solo para ADMIN global: listado completo de organizaciones de la
  // plataforma, sin restricción de membresía (ver `GET /organizations/all`).
  // Es un eje distinto al de `organizations` (las propias) — un ADMIN global
  // administra esto por su rol de dueño de la app, no por pertenecer a ellas.
  const [allOrganizations, setAllOrganizations] = useState<Organization[]>([])
  const [loadingAllOrganizations, setLoadingAllOrganizations] = useState(false)

  const [activeOrgId, setActiveOrgId] = useState<string | null>(null)

  const [members, setMembers] = useState<OrganizationMember[]>([])
  const [loadingMembers, setLoadingMembers] = useState(false)
  const [membersError, setMembersError] = useState<string | null>(null)

  const [myGames, setMyGames] = useState<GameSummary[]>([])
  const [selectedGameId, setSelectedGameId] = useState('')
  const [donating, setDonating] = useState(false)
  const [donateError, setDonateError] = useState<string | null>(null)
  const [donateSuccess, setDonateSuccess] = useState<string | null>(null)

  const [showCreateOrgModal, setShowCreateOrgModal] = useState(false)
  const [newOrgName, setNewOrgName] = useState('')
  const [newOrgDomain, setNewOrgDomain] = useState('')
  const [creatingOrg, setCreatingOrg] = useState(false)
  const [createOrgError, setCreateOrgError] = useState<string | null>(null)

  const [showAddMemberModal, setShowAddMemberModal] = useState(false)
  const [newMemberEmail, setNewMemberEmail] = useState('')
  const [newMemberRole, setNewMemberRole] =
    useState<OrganizationRoleValue>('STUDENT')
  const [addingMember, setAddingMember] = useState(false)
  const [addMemberError, setAddMemberError] = useState<string | null>(null)
  const [addMemberSuccess, setAddMemberSuccess] = useState<string | null>(null)

  const adminOrganizations = organizations.filter((org) => org.myOrgRole === 'ADMIN')

  // Universo de organizaciones seleccionables en este dashboard: para un
  // ADMIN global es la plataforma completa; para un ADMIN de organización,
  // solo aquellas donde administra. Nunca se mezclan en el mismo selector.
  const selectableOrganizations: Array<{ id: string; name: string }> = isGlobalAdmin
    ? allOrganizations
    : adminOrganizations

  useEffect(() => {
    if (!token) return
    setLoadingOrganizations(true)
    listMyOrganizations(token)
      .then((items) => setOrganizations(items))
      .catch((err: unknown) => {
        console.error('No se pudieron cargar las organizaciones del usuario:', err)
      })
      .finally(() => setLoadingOrganizations(false))
  }, [token])

  useEffect(() => {
    if (!token || !isGlobalAdmin) return
    setLoadingAllOrganizations(true)
    listAllOrganizations(token)
      .then((items) => setAllOrganizations(items))
      .catch((err: unknown) => {
        console.error('No se pudieron cargar todas las organizaciones de la plataforma:', err)
      })
      .finally(() => setLoadingAllOrganizations(false))
  }, [token, isGlobalAdmin])

  useEffect(() => {
    if (selectableOrganizations.length === 0) return
    setActiveOrgId((current) =>
      current && selectableOrganizations.some((org) => org.id === current)
        ? current
        : selectableOrganizations[0].id,
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizations, allOrganizations, isGlobalAdmin])

  useEffect(() => {
    if (!token || !activeOrgId) return
    setLoadingMembers(true)
    setMembersError(null)
    // El mensaje de éxito de "miembro agregado" es específico de la
    // organización donde se agregó; si el ADMIN cambia de organización activa
    // (ej. con el modal abierto), no debe seguir visible refiriéndose a la
    // anterior.
    setAddMemberSuccess(null)
    setAddMemberError(null)
    listOrganizationMembers(token, activeOrgId)
      .then((items) => setMembers(items))
      .catch((err: unknown) => {
        setMembersError(err instanceof ApiError ? err.message : 'No se pudieron cargar los miembros.')
      })
      .finally(() => setLoadingMembers(false))
  }, [token, activeOrgId])

  // Juegos propios sin donar todavía (organizationId null), candidatos a
  // donar a la organización activa. Sin filtro de `status`: un juego
  // PUBLISHED personal también es donable según `Game.donateTo()`, así que
  // el único filtro real de negocio es "sin organización".
  //
  // LIMITACIÓN CONOCIDA (ver PR #35, criterio de aceptación #8 del issue
  // #34): esta llamada usa `onlyMine: true`, por lo que un ADMIN de
  // organización solo ve SUS PROPIOS juegos como candidatos a donar, nunca
  // los de otros miembros. El backend (`DonateGameToOrganizationUseCase`) sí
  // permite que un ADMIN done un juego ajeno, pero `GET /games` no expone
  // ningún filtro para listar "juegos personales de terceros sin
  // organización" sin ampliar el acceso de forma insegura (los únicos
  // filtros de autoría disponibles son `onlyMine` y `excludeMine`, y este
  // último expondría también los DRAFT privados de cualquier usuario de la
  // plataforma). Implementar el criterio #8 correctamente requiere un
  // endpoint/filtro nuevo de backend con las reglas de autorización propias
  // de la donación por ADMIN, así que queda fuera del alcance de este PR.
  useEffect(() => {
    if (!token) return
    listGames(token, { onlyMine: true, pageSize: 100 })
      .then((result) => setMyGames(result.items.filter((game) => !game.organizationId)))
      .catch((err: unknown) => {
        console.error('No se pudieron cargar los juegos propios donables:', err)
      })
  }, [token])

  async function handleDonate() {
    if (!token || !activeOrgId || !selectedGameId) return
    setDonating(true)
    setDonateError(null)
    setDonateSuccess(null)
    try {
      await donateGame(token, selectedGameId, activeOrgId)
      setMyGames((current) => current.filter((game) => game.id !== selectedGameId))
      setSelectedGameId('')
      setDonateSuccess('Juego donado a la organización.')
    } catch (err) {
      setDonateError(err instanceof ApiError ? err.message : 'No se pudo donar el juego.')
    } finally {
      setDonating(false)
    }
  }

  async function handleCreateOrganization(event: FormEvent) {
    event.preventDefault()
    if (!token) return
    setCreatingOrg(true)
    setCreateOrgError(null)
    try {
      const created = await createOrganization(token, {
        name: newOrgName.trim(),
        domain: newOrgDomain.trim() || null,
      })
      // Refresca ambos ejes: para el ADMIN global entra a `allOrganizations`;
      // para quien la acaba de fundar, además queda como ADMIN de ella en
      // `organizations` — pero ese eje solo lo repuebla `listMyOrganizations`,
      // así que lo consultamos de nuevo en vez de reconstruir el shape a mano.
      if (isGlobalAdmin) {
        setAllOrganizations((current) => [created, ...current])
      }
      listMyOrganizations(token)
        .then((items) => setOrganizations(items))
        .catch((err: unknown) => {
          console.error('No se pudieron recargar las organizaciones del usuario:', err)
        })
      setActiveOrgId(created.id)
      setNewOrgName('')
      setNewOrgDomain('')
      setShowCreateOrgModal(false)
    } catch (err) {
      setCreateOrgError(err instanceof ApiError ? err.message : 'No se pudo crear la organización.')
    } finally {
      setCreatingOrg(false)
    }
  }

  async function handleAddMember(event: FormEvent) {
    event.preventDefault()
    if (!token || !activeOrgId) return
    setAddingMember(true)
    setAddMemberError(null)
    setAddMemberSuccess(null)
    try {
      const member = await addOrganizationMember(token, activeOrgId, {
        email: newMemberEmail.trim(),
        orgRole: newMemberRole,
      })
      // Re-fetch desde el servidor (igual que `handleCreateOrganization`) en
      // vez de anexar el objeto devuelto por el POST: mantiene el listado
      // consistente con el estado real si hubo cambios concurrentes.
      listOrganizationMembers(token, activeOrgId)
        .then((items) => setMembers(items))
        .catch((err: unknown) => {
          console.error('No se pudo recargar el listado de miembros:', err)
        })
      setAddMemberSuccess(`${member.displayName ?? member.email ?? 'Usuario'} agregado como ${member.orgRole}.`)
      setNewMemberEmail('')
      setNewMemberRole('STUDENT')
    } catch (err) {
      setAddMemberError(err instanceof ApiError ? err.message : 'No se pudo agregar al miembro.')
    } finally {
      setAddingMember(false)
    }
  }

  if (loadingOrganizations || (isGlobalAdmin && loadingAllOrganizations)) {
    return <p className="text-[14px] text-text">Cargando organización…</p>
  }

  if (selectableOrganizations.length === 0) {
    // Caso ADMIN global sin ninguna organización aún creada en la plataforma
    // (no solo sin membresía propia): ahí sí no hay nada que listar.
    // Caso ADMIN de organización sin membresía ADMIN en ninguna: no
    // administra nada, se le sugiere fundar la suya.
    return (
      <>
        <div className="rounded-2xl border border-dashed border-border py-16 text-center">
          <p className="text-[15px] font-medium text-text-h">
            {isGlobalAdmin
              ? 'Todavía no hay organizaciones registradas en la plataforma.'
              : 'No administras ninguna organización.'}
          </p>
          {isGlobalAdmin ? (
            <button
              type="button"
              className="mx-auto mt-4 flex items-center gap-1.5 rounded-lg border border-border px-3.5 py-2.5 text-[13.5px] font-medium text-text-h hover:border-accent"
              onClick={() => setShowCreateOrgModal(true)}
            >
              <PlusCircle className="h-4 w-4" strokeWidth={2} />
              Crear organización
            </button>
          ) : (
            <p className="mt-1 text-[13px] text-text">
              Funda una desde tu perfil si tu institución todavía no está registrada.
            </p>
          )}
        </div>
        {showCreateOrgModal && (
          <CreateOrganizationModal
            name={newOrgName}
            domain={newOrgDomain}
            saving={creatingOrg}
            error={createOrgError}
            onNameChange={setNewOrgName}
            onDomainChange={setNewOrgDomain}
            onSubmit={handleCreateOrganization}
            onClose={() => setShowCreateOrgModal(false)}
          />
        )}
      </>
    )
  }

  const activeOrg =
    selectableOrganizations.find((org) => org.id === activeOrgId) ?? selectableOrganizations[0]

  return (
    <section className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <h2 className="text-[22px] tracking-tight text-text-h">Organización</h2>
            {isGlobalAdmin && (
              <span className="flex items-center gap-1 rounded-full bg-accent/10 px-2.5 py-1 text-[11.5px] font-semibold text-accent">
                <Globe2 className="h-3 w-3" strokeWidth={2.5} />
                Todas las organizaciones
              </span>
            )}
          </div>
          <p className="text-[14px] text-text">
            {isGlobalAdmin
              ? `Viendo "${activeOrg.name}" como ADMIN global de la plataforma.`
              : `Administra los miembros y los juegos institucionales de ${activeOrg.name}.`}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {selectableOrganizations.length > 1 && (
            <select
              className="rounded-lg border border-border bg-bg px-3.5 py-2.5 text-[13.5px] text-text-h outline-none focus:border-accent"
              value={activeOrg.id}
              onChange={(event) => setActiveOrgId(event.target.value)}
            >
              {selectableOrganizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          )}
          {/*
            Gateado igual que el botón del estado vacío: un ADMIN de
            organización no funda instituciones desde este dashboard (lo hace
            desde su perfil), solo el ADMIN global administra la plataforma
            desde aquí. El backend permite crear organización a cualquier
            autenticado, así que esto es coherencia de UX/flujo, no un
            control de seguridad.
          */}
          {isGlobalAdmin && (
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-lg border border-border px-3.5 py-2.5 text-[13.5px] font-medium text-text-h hover:border-accent"
              onClick={() => setShowCreateOrgModal(true)}
            >
              <PlusCircle className="h-4 w-4" strokeWidth={2} />
              Nueva organización
            </button>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-border p-5">
        <div className="mb-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Users2 className="h-[18px] w-[18px] text-text" strokeWidth={2} />
            <h3 className="text-[15px] font-semibold text-text-h">Miembros</h3>
          </div>
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
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr key={member.userId} className="border-b border-border last:border-0">
                    <td className="px-3 py-2.5 text-text-h">{member.displayName ?? '—'}</td>
                    <td className="px-3 py-2.5 text-text">{member.email ?? '—'}</td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`rounded-full px-2.5 py-1 text-[12px] font-medium ${
                          MEMBER_ROLE_STYLES[member.orgRole] ?? 'bg-code-bg text-text-h'
                        }`}
                      >
                        {member.orgRole}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-border p-5">
          <h3 className="mb-3 text-[15px] font-semibold text-text-h">Crear juego institucional</h3>
          <p className="mb-4 text-[13px] text-text">
            Abre el flujo de creación de juegos y elige "{activeOrg.name}" en el selector de
            organización para que el juego nazca institucional.
          </p>
          <button
            type="button"
            className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13.5px] font-semibold text-white shadow-[0_10px_28px_-10px_var(--accent)] transition-transform hover:-translate-y-0.5"
            style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))' }}
            onClick={() => navigate('/juegos/crear')}
          >
            <PlusCircle className="h-[18px] w-[18px]" strokeWidth={2} />
            Crear juego
          </button>
        </div>

        <div className="rounded-2xl border border-border p-5">
          <h3 className="mb-3 text-[15px] font-semibold text-text-h">Donar un juego propio</h3>
          {myGames.length === 0 ? (
            <p className="text-[13px] text-text">
              No tienes juegos personales disponibles para donar en este momento.
            </p>
          ) : (
            <>
              <select
                className="mb-3 w-full rounded-lg border border-border bg-bg px-[13px] py-2.5 text-[14px] text-text-h outline-none focus:border-accent"
                value={selectedGameId}
                disabled={donating}
                onChange={(event) => setSelectedGameId(event.target.value)}
              >
                <option value="">Elige un juego…</option>
                {myGames.map((game) => (
                  <option key={game.id} value={game.id}>
                    {game.title}
                  </option>
                ))}
              </select>
              {donateError && (
                <p className="mb-2 text-[12.5px] text-danger" role="alert">
                  {donateError}
                </p>
              )}
              {donateSuccess && (
                <p className="mb-2 text-[12.5px] text-accent" role="status">
                  {donateSuccess}
                </p>
              )}
              <button
                type="button"
                className="rounded-lg border border-border px-3.5 py-2 text-[13px] font-medium text-text-h disabled:cursor-not-allowed disabled:opacity-60"
                onClick={handleDonate}
                disabled={donating || !selectedGameId}
              >
                {donating ? 'Donando…' : `Donar a ${activeOrg.name}`}
              </button>
            </>
          )}
        </div>
      </div>

      {showCreateOrgModal && (
        <CreateOrganizationModal
          name={newOrgName}
          domain={newOrgDomain}
          saving={creatingOrg}
          error={createOrgError}
          onNameChange={setNewOrgName}
          onDomainChange={setNewOrgDomain}
          onSubmit={handleCreateOrganization}
          onClose={() => setShowCreateOrgModal(false)}
        />
      )}

      {showAddMemberModal && (
        <AddMemberModal
          email={newMemberEmail}
          orgRole={newMemberRole}
          saving={addingMember}
          error={addMemberError}
          success={addMemberSuccess}
          organizationName={activeOrg.name}
          onEmailChange={setNewMemberEmail}
          onRoleChange={setNewMemberRole}
          onSubmit={handleAddMember}
          onClose={() => setShowAddMemberModal(false)}
        />
      )}
    </section>
  )
}

type CreateOrganizationModalProps = {
  name: string
  domain: string
  saving: boolean
  error: string | null
  onNameChange: (value: string) => void
  onDomainChange: (value: string) => void
  onSubmit: (event: FormEvent) => void
  onClose: () => void
}

function CreateOrganizationModal({
  name,
  domain,
  saving,
  error,
  onNameChange,
  onDomainChange,
  onSubmit,
  onClose,
}: CreateOrganizationModalProps) {
  return (
    <Modal onClose={onClose}>
      <h3 className="mb-4 text-[17px] font-semibold text-text-h">Crear organización</h3>
      <form className="flex flex-col gap-4" onSubmit={onSubmit}>
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium text-text-h">Nombre</span>
          <input
            type="text"
            required
            minLength={3}
            className="rounded-lg border border-border bg-bg px-3.5 py-2.5 text-[14px] text-text-h outline-none focus:border-accent"
            placeholder="Colegio San José"
            value={name}
            onChange={(event) => onNameChange(event.target.value)}
            disabled={saving}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium text-text-h">Dominio institucional (opcional)</span>
          <input
            type="text"
            className="rounded-lg border border-border bg-bg px-3.5 py-2.5 text-[14px] text-text-h outline-none focus:border-accent"
            placeholder="colegiosanjose.edu.co"
            value={domain}
            onChange={(event) => onDomainChange(event.target.value)}
            disabled={saving}
          />
          <span className="text-[12px] text-text">
            Habilita el auto-join: cualquiera con correo de este dominio entrará automáticamente
            como miembro. Déjalo vacío si prefieres agregar miembros manualmente.
          </span>
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
            {saving ? 'Creando…' : 'Crear organización'}
          </button>
        </div>
      </form>
    </Modal>
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
