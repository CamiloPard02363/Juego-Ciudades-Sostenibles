import { useEffect } from 'react'
import { GamesSection } from '../GamesSection'
import { useHomeSearch } from '../homeSearchContext'

export function CategoriesPage() {
  const { searchQuery, searchNonce, onSectionViewed } = useHomeSearch()

  useEffect(() => {
    onSectionViewed('categories')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <GamesSection mode="categories" searchQuery={searchQuery} searchNonce={searchNonce} />
}
