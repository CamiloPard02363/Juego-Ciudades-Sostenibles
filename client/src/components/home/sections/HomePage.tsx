import { useEffect } from 'react'
import { GamesSection } from '../GamesSection'
import { useHomeSearch } from '../homeSearchContext'

export function HomePage() {
  const { searchQuery, searchNonce, onSectionViewed } = useHomeSearch()

  useEffect(() => {
    onSectionViewed('all')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <GamesSection mode="all" searchQuery={searchQuery} searchNonce={searchNonce} />
}
