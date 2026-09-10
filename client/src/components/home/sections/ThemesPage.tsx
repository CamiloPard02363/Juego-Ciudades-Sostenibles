import { useEffect } from 'react'
import { ThemesSection } from '../ThemesSection'
import { useHomeSearch } from '../homeSearchContext'

export function ThemesPage() {
  const { onSectionViewed } = useHomeSearch()

  useEffect(() => {
    onSectionViewed('themes')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <ThemesSection />
}
