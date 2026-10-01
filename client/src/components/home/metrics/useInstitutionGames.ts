import { useEffect, useState } from 'react'
import { useAuth } from '../../../hooks/useAuth'
import { listGames, type GameSummary } from '../../../services/game.service'
import { ApiError } from '../../../utils/http'

/** "Juegos de la institución" (issue #226): GET /games?organizationId=... */
export function useInstitutionGames(organizationId: string) {
  const { token } = useAuth()
  const [games, setGames] = useState<GameSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token || !organizationId) return
    setLoading(true)
    setError(null)
    listGames(token, { organizationId, pageSize: 100 })
      .then((result) => setGames(result.items))
      .catch((err: unknown) => {
        setError(err instanceof ApiError ? err.message : 'No se pudieron cargar los juegos.')
      })
      .finally(() => setLoading(false))
  }, [token, organizationId])

  return { games, loading, error }
}
