import { useEffect } from 'react'
import { GamesSection } from '../GamesSection'
import { useHomeSearch } from '../homeSearchContext'

export function CommunityPage() {
  const { searchQuery, searchNonce, onSectionViewed } = useHomeSearch()

  useEffect(() => {
    onSectionViewed('community')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <GamesSection mode="community" searchQuery={searchQuery} searchNonce={searchNonce} />
}
