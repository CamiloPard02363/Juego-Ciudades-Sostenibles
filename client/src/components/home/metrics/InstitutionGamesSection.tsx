import { useNavigate } from 'react-router-dom'
import { Gift, PlusCircle } from 'lucide-react'
import { useInstitutionGames } from './useInstitutionGames'
import { useDonatableGames } from './useDonatableGames'

/**
 * "Juegos de la institución" (issue #226): catálogo publicado de la
 * organización, más las dos acciones que antes vivían sueltas debajo de las
 * pestañas en `OrganizationDashboard` — "Crear juego institucional" y
 * "Donar un juego propio" (feedback de Manuel: debían estar DENTRO de la
 * pestaña Juegos, no fuera de las 5 pestañas).
 */
export function InstitutionGamesSection({
  organizationId,
  organizationName,
}: {
  organizationId: string
  organizationName: string
}) {
  const navigate = useNavigate()
  const { games, loading, error } = useInstitutionGames(organizationId)
  const {
    myGames,
    selectedGameId,
    setSelectedGameId,
    donating,
    donateError,
    donateSuccess,
    donate,
  } = useDonatableGames(organizationId)

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-border p-5">
          <h3 className="mb-3 flex items-center gap-2 text-[15px] font-semibold text-text-h">
            <PlusCircle className="h-[18px] w-[18px] text-accent" strokeWidth={2} />
            Crear juego institucional
          </h3>
          <p className="mb-4 text-[13px] text-text">
            Abre el flujo de creación de juegos y elige "{organizationName}" en el selector de
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
          <h3 className="mb-3 flex items-center gap-2 text-[15px] font-semibold text-text-h">
            <Gift className="h-[18px] w-[18px] text-accent-2" strokeWidth={2} />
            Donar un juego propio
          </h3>
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
                onClick={donate}
                disabled={donating || !selectedGameId}
              >
                {donating ? 'Donando…' : `Donar a ${organizationName}`}
              </button>
            </>
          )}
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-[15px] font-semibold text-text-h">Juegos de la institución</h3>
        {loading ? (
          <p className="text-[14px] text-text">Cargando juegos…</p>
        ) : error ? (
          <p className="text-[14px] text-red-600">{error}</p>
        ) : games.length === 0 ? (
          <p className="text-[14px] text-text/70">Esta institución todavía no tiene juegos propios.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {games.map((game) => (
              <div key={game.id} className="rounded-2xl border border-border p-4">
                <h4 className="text-[15px] font-semibold text-text-h">{game.title}</h4>
                <p className="mt-1 line-clamp-2 text-[13px] text-text">{game.description}</p>
                <span className="mt-2 inline-block rounded-full bg-code-bg px-2.5 py-1 text-[11.5px] font-medium text-text-h">
                  {game.gameType}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
