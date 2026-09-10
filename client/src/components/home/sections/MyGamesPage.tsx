import { useEffect } from 'react'
import { GamesSection } from '../GamesSection'
import { useHomeSearch } from '../homeSearchContext'

export function MyGamesPage() {
  const { searchQuery, searchNonce, onSectionViewed } = useHomeSearch()

  useEffect(() => {
    onSectionViewed('my-games')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <GamesSection mode="my-games" searchQuery={searchQuery} searchNonce={searchNonce} />
}
