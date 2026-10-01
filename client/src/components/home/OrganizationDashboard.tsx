import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Globe2, PlusCircle } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import {
  createOrganization,
  deactivateOrganization,
  listAllOrganizations,
  listMyOrganizations,
  reactivateOrganization,
  type Organization,
  type OrganizationWithMyRole,
} from '../../services/organization.service'
import { ApiError } from '../../utils/http'
import { Modal } from './games/Modal'
import { OrganizationCard } from './OrganizationCard'
import { OrganizationFilterBar } from './OrganizationFilterBar'
import { useOrganizationAdmins } from './useOrganizationAdmins'

const ALL_ORGS_PAGE_SIZE = 10

/**
 * Listado de organizaciones (issue #226, fix de navegación): antes este
 * componente también renderizaba el drill-down de una institución concreta
 * como estado inline, mezclado visualmente con el selector "Organización de
 * X" y el botón "+ Nueva organización" de ESTE listado (confusión reportada
 * por Manuel). Ahora, al entrar a una organización, se navega a la ruta
 * dedicada `/organizaciones/:id` (`InstitutionView`) — este componente queda
 * limitado a listar/crear/activar/desactivar organizaciones.
 *
 * El universo de organizaciones seleccionables depende del rol de quien
 * mira: un ADMIN global ve TODAS las organizaciones de la plataforma (dueño
 * de la app, `GET /organizations/all`); un ADMIN de organización ve solo
 * aquellas donde tiene `orgRole = ADMIN` (dueño de su institución). Los dos
 * ejes nunca se mezclan en el mismo selector — ver `selectableOrganizations`.
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
  const [allOrganizationsTotal, setAllOrganizationsTotal] = useState(0)
  const [allOrganizationsPage, setAllOrganizationsPage] = useState(1)
  const [allOrganizationsSearch, setAllOrganizationsSearch] = useState('')
  const [debouncedAllOrgsSearch, setDebouncedAllOrgsSearch] = useState('')
  const [allOrganizationsActiveFilter, setAllOrganizationsActiveFilter] =
    useState<'all' | 'active' | 'inactive'>('all')
  const [loadingAllOrganizations, setLoadingAllOrganizations] = useState(false)

  // Modal de confirmación para desactivar/reactivar una organización (solo
  // ADMIN global, issue #106/#108 CA3.5 — a diferencia del toggle sin
  // confirmación que usa `AdminUsersSection` para usuarios).
  const [orgPendingToggle, setOrgPendingToggle] = useState<Organization | null>(null)
  const [togglingOrgId, setTogglingOrgId] = useState<string | null>(null)

  const adminsByOrgId = useOrganizationAdmins(token, allOrganizations)

  const [showCreateOrgModal, setShowCreateOrgModal] = useState(false)
  const [newOrgName, setNewOrgName] = useState('')
  const [newOrgDomain, setNewOrgDomain] = useState('')
  const [creatingOrg, setCreatingOrg] = useState(false)
  const [createOrgError, setCreateOrgError] = useState<string | null>(null)

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

  // Debounce de 250ms (mismo patrón que `AddGameModal`): resetea a página 1
  // en cada búsqueda nueva (issue #106/#108, CA2.5).
  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedAllOrgsSearch(allOrganizationsSearch)
      setAllOrganizationsPage(1)
    }, 250)
    return () => clearTimeout(timeout)
  }, [allOrganizationsSearch])

  useEffect(() => {
    setAllOrganizationsPage(1)
  }, [allOrganizationsActiveFilter])

  // Único punto que arma los parámetros de `listAllOrganizations` — se
  // reutiliza en la carga inicial/paginación y tras crear o (des)activar una
  // organización, para no desalinear `total`/`page` con el filtro activo.
  const reloadAllOrganizations = useCallback(() => {
    if (!token || !isGlobalAdmin) return
    setLoadingAllOrganizations(true)
    return listAllOrganizations(token, {
      page: allOrganizationsPage,
      pageSize: ALL_ORGS_PAGE_SIZE,
      search: debouncedAllOrgsSearch || undefined,
      isActive:
        allOrganizationsActiveFilter === 'all' ? undefined : allOrganizationsActiveFilter === 'active',
    })
      .then((result) => {
        setAllOrganizations(result.items)
        setAllOrganizationsTotal(result.total)
      })
      .catch((err: unknown) => {
        console.error('No se pudieron cargar todas las organizaciones de la plataforma:', err)
      })
      .finally(() => setLoadingAllOrganizations(false))
  }, [token, isGlobalAdmin, allOrganizationsPage, debouncedAllOrgsSearch, allOrganizationsActiveFilter])

  useEffect(() => {
    reloadAllOrganizations()
  }, [reloadAllOrganizations])

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
      // Refresca ambos ejes: para el ADMIN global, `allOrganizations` (ahora
      // paginado/filtrado). Para quien la acaba de fundar, además queda como
      // ADMIN de ella en `organizations` — ese eje solo lo repuebla
      // `listMyOrganizations`.
      if (isGlobalAdmin) {
        reloadAllOrganizations()
      }
      listMyOrganizations(token)
        .then((items) => setOrganizations(items))
        .catch((err: unknown) => {
          console.error('No se pudieron recargar las organizaciones del usuario:', err)
        })
      setNewOrgName('')
      setNewOrgDomain('')
      setShowCreateOrgModal(false)
      navigate(`/organizaciones/${created.id}`)
    } catch (err) {
      setCreateOrgError(err instanceof ApiError ? err.message : 'No se pudo crear la organización.')
    } finally {
      setCreatingOrg(false)
    }
  }

  async function handleConfirmToggleOrganization() {
    if (!token || !orgPendingToggle) return
    setTogglingOrgId(orgPendingToggle.id)
    try {
      if (orgPendingToggle.isActive) {
        await deactivateOrganization(token, orgPendingToggle.id)
      } else {
        await reactivateOrganization(token, orgPendingToggle.id)
      }
      // Recarga desde el servidor en vez de mutar `isActive` localmente: si
      // hay un filtro activo/inactivo aplicado, la organización puede dejar
      // de pertenecer a la página actual, y `total` debe reflejarlo.
      await reloadAllOrganizations()
      setOrgPendingToggle(null)
    } catch (err) {
      console.error('No se pudo actualizar el estado de la organización:', err)
    } finally {
      setTogglingOrgId(null)
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
              ? 'Administra las organizaciones registradas en la plataforma.'
              : 'Entra a una organización para administrar sus miembros y juegos institucionales.'}
          </p>
        </div>

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

      {isGlobalAdmin ? (
        <div className="rounded-2xl border border-border p-5">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <Globe2 className="h-[18px] w-[18px] text-text" strokeWidth={2} />
            <h3 className="text-[15px] font-semibold text-text-h">Todas las organizaciones</h3>
          </div>

          <OrganizationFilterBar
            search={allOrganizationsSearch}
            onSearchChange={setAllOrganizationsSearch}
            activeFilter={allOrganizationsActiveFilter}
            onActiveFilterChange={setAllOrganizationsActiveFilter}
          />

          {loadingAllOrganizations ? (
            <p className="text-[14px] text-text">Cargando organizaciones…</p>
          ) : allOrganizations.length === 0 ? (
            <p className="text-[14px] text-text">No hay organizaciones que coincidan con el filtro.</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {allOrganizations.map((org) => (
                <OrganizationCard
                  key={org.id}
                  organization={org}
                  adminDisplayName={adminsByOrgId[org.id]?.displayName ?? null}
                  adminEmail={adminsByOrgId[org.id]?.email ?? null}
                  toggling={togglingOrgId === org.id}
                  onToggleActive={() => setOrgPendingToggle(org)}
                  onOpen={() => navigate(`/organizaciones/${org.id}`)}
                />
              ))}
            </div>
          )}

          {allOrganizationsTotal > ALL_ORGS_PAGE_SIZE && (
            <div className="mt-4 flex items-center justify-between text-[13px] text-text">
              <span>
                Página {allOrganizationsPage} de{' '}
                {Math.max(1, Math.ceil(allOrganizationsTotal / ALL_ORGS_PAGE_SIZE))}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="rounded-lg border border-border px-3 py-1.5 font-medium text-text-h disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={allOrganizationsPage <= 1 || loadingAllOrganizations}
                  onClick={() => setAllOrganizationsPage((current) => current - 1)}
                >
                  Anterior
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-border px-3 py-1.5 font-medium text-text-h disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={
                    allOrganizationsPage >= Math.max(1, Math.ceil(allOrganizationsTotal / ALL_ORGS_PAGE_SIZE)) ||
                    loadingAllOrganizations
                  }
                  onClick={() => setAllOrganizationsPage((current) => current + 1)}
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {adminOrganizations.map((org) => (
            <button
              key={org.id}
              type="button"
              onClick={() => navigate(`/organizaciones/${org.id}`)}
              className="flex flex-col gap-2 rounded-2xl border border-border p-5 text-left transition-transform hover:-translate-y-0.5 hover:border-accent"
            >
              <h4 className="text-[15px] font-semibold text-text-h">{org.name}</h4>
              <p className="text-[12.5px] text-text">{org.domain ?? 'Sin dominio institucional'}</p>
            </button>
          ))}
        </div>
      )}

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

      {orgPendingToggle && (
        <Modal onClose={() => setOrgPendingToggle(null)}>
          <h3 className="mb-2 text-[17px] font-semibold text-text-h">
            {orgPendingToggle.isActive ? 'Desactivar organización' : 'Reactivar organización'}
          </h3>
          <p className="mb-5 text-[13.5px] text-text">
            {orgPendingToggle.isActive
              ? `¿Seguro que quieres desactivar "${orgPendingToggle.name}"? Afecta a todos sus miembros.`
              : `¿Seguro que quieres reactivar "${orgPendingToggle.name}"?`}
          </p>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              className="rounded-lg border border-border px-3.5 py-2 text-[13px] font-medium text-text-h"
              onClick={() => setOrgPendingToggle(null)}
              disabled={togglingOrgId === orgPendingToggle.id}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="rounded-lg bg-danger px-4 py-2 text-[13px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              onClick={handleConfirmToggleOrganization}
              disabled={togglingOrgId === orgPendingToggle.id}
            >
              {togglingOrgId === orgPendingToggle.id
                ? 'Procesando…'
                : orgPendingToggle.isActive
                  ? 'Desactivar'
                  : 'Reactivar'}
            </button>
          </div>
        </Modal>
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
