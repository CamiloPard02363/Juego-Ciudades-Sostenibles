import { createContext, useContext } from 'react'

type HomeSearchContextValue = {
  searchQuery: string
  searchNonce: number
  onSectionViewed: (section: string) => void
}

export const HomeSearchContext = createContext<HomeSearchContextValue | null>(null)

/** Búsqueda compartida entre `HomeLayout` (barra de búsqueda) y las páginas de sección montadas vía `<Outlet/>`. */
export function useHomeSearch(): HomeSearchContextValue {
  const context = useContext(HomeSearchContext)
  if (!context) throw new Error('useHomeSearch debe usarse dentro de HomeLayout')
  return context
}
