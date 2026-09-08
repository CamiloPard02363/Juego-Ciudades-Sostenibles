import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { Sidebar } from './Sidebar'
import type { HomeSection } from './Sidebar'
import { SearchBar } from './SearchBar'
import { ProfileMenu } from './ProfileMenu'
import { GamesSection } from './GamesSection'
import { ProfileSettings } from './ProfileSettings'
import { AdminUsersSection } from './AdminUsersSection'
import { trackEvent } from '../../services/analytics.service'

export function HomeLayout() {
  const { user, token, signOut } = useAuth()
  const [section, setSection] = useState<HomeSection>('all')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const [submittedQuery, setSubmittedQuery] = useState('')
  // Se incrementa en cada Enter, incluso si el texto no cambió, para que la
  // búsqueda y el scroll a resultados se disparen siempre y no dependan de
  // que el valor sea distinto al anterior.
  const [searchNonce, setSearchNonce] = useState(0)

  function handleSearch(value: string) {
    setSubmittedQuery(value)
    setSearchNonce((n) => n + 1)
  }

  function handleSelectSection(next: HomeSection) {
    setSection(next)
    if (token) trackEvent(token, 'section_viewed', { metadata: { section: next } })
  }

  if (!user) return null

  const canManageUsers = user.role === 'ADMIN'

  return (
    <div className="fixed inset-0 flex text-left">
      <Sidebar
        activeSection={section}
        onSelectSection={handleSelectSection}
        canManageUsers={canManageUsers}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-border px-6 py-4">
          <SearchBar value={searchInput} onChange={setSearchInput} onSearch={handleSearch} />
          <ProfileMenu
            user={user}
            onOpenSettings={() => setSettingsOpen(true)}
            onSignOut={signOut}
          />
        </header>

        <main className="flex-1 overflow-y-auto p-6 sm:p-8">
          {(section === 'all' || section === 'categories' || section === 'community' || section === 'my-games') && (
            <GamesSection
              mode={section}
              searchQuery={submittedQuery}
              searchNonce={searchNonce}
            />
          )}
          {section === 'admin-users' && canManageUsers && <AdminUsersSection />}
        </main>
      </div>

      {settingsOpen && <ProfileSettings onClose={() => setSettingsOpen(false)} />}
    </div>
  )
}
