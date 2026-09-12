import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PlusCircle, Users2 } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import {
  listMyOrganizations,
  listOrganizationMembers,
  type OrganizationMember,
  type OrganizationWithMyRole,
} from '../../services/organization.service'
import { donateGame, listGames, type GameSummary } from '../../services/game.service'
import { ApiError } from '../../utils/http'

const MEMBER_ROLE_STYLES: Record<string, string> = {
  ADMIN: 'bg-accent/10 text-accent',
  TEACHER: 'bg-accent-2/10 text-accent-2',
  STUDENT: 'bg-code-bg text-text-h',
}

/**
 * Dashboard de organización: lista de miembros, donación de un juego propio,
 * y atajo para crear un juego institucional. Si el usuario administra 2+
 * organizaciones, un selector simple cambia el contexto (ver `activeOrgId`).
 *
 * El acceso ya se filtra en `OrganizationDashboardPage` (solo ADMIN de
 * alguna organización o ADMIN global); acá se asume que quien llega tiene
 * al menos una organización administrable, salvo el caso ADMIN global sin
 * membresías propias, cubierto por el estado vacío de abajo.
 */
export function OrganizationDashboard() {
  const { token, user } = useAuth()
  const navigate = useNavigate()

  const [organizations, setOrganizations] = useState<OrganizationWithMyRole[]>([])
  const [loadingOrganizations, setLoadingOrganizations] = useState(true)
  const [activeOrgId, setActiveOrgId] = useState<string | null>(null)

  const [members, setMembers] = useState<OrganizationMember[]>([])
  const [loadingMembers, setLoadingMembers] = useState(false)
  const [membersError, setMembersError] = useState<string | null>(null)

  const [myGames, setMyGames] = useState<GameSummary[]>([])
  const [selectedGameId, setSelectedGameId] = useState('')
  const [donating, setDonating] = useState(false)
  const [donateError, setDonateError] = useState<string | null>(null)
  const [donateSuccess, setDonateSuccess] = useState<string | null>(null)

  const adminOrganizations = organizations.filter((org) => org.myOrgRole === 'ADMIN')

  useEffect(() => {
    if (!token) return
    setLoadingOrganizations(true)
    listMyOrganizations(token)
      .then((items) => setOrganizations(items))
      .catch(() => {})
      .finally(() => setLoadingOrganizations(false))
  }, [token])

  useEffect(() => {
    if (adminOrganizations.length === 0) return
    setActiveOrgId((current) =>
      current && adminOrganizations.some((org) => org.id === current)
        ? current
        : adminOrganizations[0].id,
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizations])

  useEffect(() => {
    if (!token || !activeOrgId) return
    setLoadingMembers(true)
    setMembersError(null)
    listOrganizationMembers(token, activeOrgId)
      .then((items) => setMembers(items))
      .catch((err: unknown) => {
        setMembersError(err instanceof ApiError ? err.message : 'No se pudieron cargar los miembros.')
      })
      .finally(() => setLoadingMembers(false))
  }, [token, activeOrgId])

  // Juegos propios sin donar todavía (organizationId null), candidatos a
  // donar a la organización activa. onlyMine+status=DRAFT es el mismo filtro
  // que usa "Mis juegos privados" — ver GamesSection.
  useEffect(() => {
    if (!token) return
    listGames(token, { onlyMine: true, status: 'DRAFT', pageSize: 100 })
      .then((result) => setMyGames(result.items.filter((game) => !game.organizationId)))
      .catch(() => {})
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

  if (loadingOrganizations) {
    return <p className="text-[14px] text-text">Cargando organización…</p>
  }

  if (adminOrganizations.length === 0) {
    // Caso ADMIN global sin membresía propia: puede ver la sección, pero no
    // administra ninguna organización desde acá (fuera de alcance del issue
    // #34 la gestión global de organizaciones ajenas desde este dashboard).
    return (
      <div className="rounded-2xl border border-dashed border-border py-16 text-center">
        <p className="text-[15px] font-medium text-text-h">No administras ninguna organización.</p>
        <p className="mt-1 text-[13px] text-text">
          Funda una desde tu perfil si tu institución todavía no está registrada.
        </p>
      </div>
    )
  }

  const activeOrg = adminOrganizations.find((org) => org.id === activeOrgId) ?? adminOrganizations[0]

  return (
    <section className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="mb-1 text-[22px] tracking-tight text-text-h">Organización</h2>
          <p className="text-[14px] text-text">
            Administra los miembros y los juegos institucionales de {activeOrg.name}.
          </p>
        </div>

        {adminOrganizations.length > 1 && (
          <select
            className="rounded-lg border border-border bg-bg px-3.5 py-2.5 text-[13.5px] text-text-h outline-none focus:border-accent"
            value={activeOrg.id}
            onChange={(event) => setActiveOrgId(event.target.value)}
          >
            {adminOrganizations.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="rounded-2xl border border-border p-5">
        <div className="mb-4 flex items-center gap-2">
          <Users2 className="h-[18px] w-[18px] text-text" strokeWidth={2} />
          <h3 className="text-[15px] font-semibold text-text-h">Miembros</h3>
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

      {user?.role === 'ADMIN' && (
        <p className="text-[12px] text-text/70">
          Eres ADMIN global de la plataforma; este panel solo muestra las organizaciones donde
          tienes membresía como ADMIN.
        </p>
      )}
    </section>
  )
}
