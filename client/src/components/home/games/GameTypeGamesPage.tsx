import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { GamesSection } from '../GamesSection'
import { useHomeSearch } from '../homeSearchContext'

/**
 * Componente delgado (issue #156): lee `:gameType` de la URL y monta
 * `GamesSection` en modo 'game-type'. El backend ya aplica la visibilidad
 * transversal (oculta juegos de tipos archivados a no-ADMIN); acá solo se
 * propaga el filtro.
 */
export function GameTypeGamesPage() {
  const { gameType } = useParams<{ gameType: string }>()
  const { searchQuery, searchNonce, onSectionViewed } = useHomeSearch()

  useEffect(() => {
    onSectionViewed('game-type')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <GamesSection
      mode="game-type"
      searchQuery={searchQuery}
      searchNonce={searchNonce}
      gameTypeFilter={gameType}
    />
  )
}
