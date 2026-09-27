import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { GamesSection } from '../GamesSection'
import { useHomeSearch } from '../homeSearchContext'
import { useAuth } from '../../../hooks/useAuth'
import { listGameTypeSettings } from '../../../services/game.service'

/**
 * Componente delgado (issue #156): lee `:gameType` de la URL y monta
 * `GamesSection` en modo 'game-type'. El backend ya aplica la visibilidad
 * transversal (oculta juegos de tipos archivados a no-ADMIN); acá solo se
 * propaga el filtro.
 *
 * También resuelve el `displayName` del tipo (ej. "Fuego y Agua") para que
 * `GamesSection` no caiga en su encabezado por defecto de "Mis juegos
 * privados" — se busca con una llamada propia (en vez de depender de
 * `location.state`) para que funcione igual entrando por navegación normal,
 * recarga directa de la URL o botón atrás/adelante del navegador.
 */
export function GameTypeGamesPage() {
  const { gameType } = useParams<{ gameType: string }>()
  const { token } = useAuth()
  const { searchQuery, searchNonce, onSectionViewed } = useHomeSearch()
  const [displayName, setDisplayName] = useState<string | undefined>(undefined)

  useEffect(() => {
    onSectionViewed('game-type')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!token || !gameType) return
    listGameTypeSettings(token)
      .then((settings) => {
        const match = settings.find((s) => s.gameType === gameType)
        setDisplayName(match?.displayName)
      })
      .catch(() => {})
  }, [token, gameType])

  return (
    <GamesSection
      mode="game-type"
      searchQuery={searchQuery}
      searchNonce={searchNonce}
      gameTypeFilter={gameType}
      gameTypeDisplayName={displayName}
    />
  )
}
