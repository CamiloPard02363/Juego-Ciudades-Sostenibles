import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../../hooks/useAuth'
import {
  archiveClassGame,
  listClassGamesDetail,
  removeGameFromClass,
  unarchiveClassGame,
  type ClassGameSummary,
} from '../../../services/class.service'

/**
 * Única responsabilidad: fetching + mutaciones de "Juegos de la clase"
 * (issue #226) — eliminar o archivar/desarchivar. No decide layout de cards
 * ni confirma diálogos; eso vive en el componente.
 */
export function useClassGamesManagement(classId: string) {
  const { token } = useAuth()
  const [games, setGames] = useState<ClassGameSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(() => {
    if (!token) return
    setLoading(true)
    setError(null)
    listClassGamesDetail(token, classId)
      .then(setGames)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [token, classId])

  useEffect(() => {
    reload()
  }, [reload])

  const remove = useCallback(
    async (gameId: string) => {
      if (!token) return
      await removeGameFromClass(token, classId, gameId)
      setGames((prev) => prev.filter((game) => game.id !== gameId))
    },
    [token, classId],
  )

  const toggleArchived = useCallback(
    async (gameId: string, isArchived: boolean) => {
      if (!token) return
      if (isArchived) {
        await archiveClassGame(token, classId, gameId)
      } else {
        await unarchiveClassGame(token, classId, gameId)
      }
      setGames((prev) =>
        prev.map((game) => (game.id === gameId ? { ...game, isArchived } : game)),
      )
    },
    [token, classId],
  )

  return { games, loading, error, reload, remove, toggleArchived }
}
