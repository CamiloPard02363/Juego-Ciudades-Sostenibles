import { useEffect, useState } from 'react'
import { useAuth } from '../../../hooks/useAuth'
import { donateGame, listGames, type GameSummary } from '../../../services/game.service'
import { ApiError } from '../../../utils/http'

/**
 * Juegos propios sin donar todavía (organizationId null), candidatos a donar
 * a la organización activa (issue #226, movido desde `OrganizationDashboard`
 * a la pestaña "Juegos" por pedido de Manuel). Sin filtro de `status`: un
 * juego PUBLISHED personal también es donable según `Game.donateTo()`.
 *
 * LIMITACIÓN CONOCIDA (ver PR #35, criterio de aceptación #8 del issue #34):
 * esta llamada usa `onlyMine: true`, por lo que un ADMIN de organización solo
 * ve SUS PROPIOS juegos como candidatos a donar, nunca los de otros
 * miembros. Implementar el criterio #8 correctamente requiere un
 * endpoint/filtro nuevo de backend, fuera de alcance de este fix.
 */
export function useDonatableGames(organizationId: string) {
  const { token } = useAuth()
  const [myGames, setMyGames] = useState<GameSummary[]>([])
  const [selectedGameId, setSelectedGameId] = useState('')
  const [donating, setDonating] = useState(false)
  const [donateError, setDonateError] = useState<string | null>(null)
  const [donateSuccess, setDonateSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    listGames(token, { onlyMine: true, pageSize: 100 })
      .then((result) => setMyGames(result.items.filter((game) => !game.organizationId)))
      .catch((err: unknown) => {
        console.error('No se pudieron cargar los juegos propios donables:', err)
      })
  }, [token])

  async function donate() {
    if (!token || !organizationId || !selectedGameId) return
    setDonating(true)
    setDonateError(null)
    setDonateSuccess(null)
    try {
      await donateGame(token, selectedGameId, organizationId)
      setMyGames((current) => current.filter((game) => game.id !== selectedGameId))
      setSelectedGameId('')
      setDonateSuccess('Juego donado a la organización.')
    } catch (err) {
      setDonateError(err instanceof ApiError ? err.message : 'No se pudo donar el juego.')
    } finally {
      setDonating(false)
    }
  }

  return {
    myGames,
    selectedGameId,
    setSelectedGameId,
    donating,
    donateError,
    donateSuccess,
    donate,
  }
}
