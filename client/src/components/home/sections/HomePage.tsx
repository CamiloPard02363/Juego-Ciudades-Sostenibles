import { useEffect } from 'react'
import { useAuth } from '../../../hooks/useAuth'
import { GamesSection } from '../GamesSection'
import { useHomeSearch } from '../homeSearchContext'

export function HomePage() {
  const { user } = useAuth()
  const { searchQuery, searchNonce, onSectionViewed } = useHomeSearch()

  useEffect(() => {
    onSectionViewed('all')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Un STUDENT ya ve su propio catálogo ilustrado en KidsHomeShell; esta
  // sección se monta igual (vía el mismo <Outlet/>) solo para que, si la URL
  // trae un slug, el detalle del juego siga abriendo por el mismo camino de
  // siempre (ver `browsingHidden` en GamesSection.tsx).
  const isKids = user?.role === 'STUDENT'

  return (
    <GamesSection mode="all" searchQuery={searchQuery} searchNonce={searchNonce} browsingHidden={isKids} />
  )
}
