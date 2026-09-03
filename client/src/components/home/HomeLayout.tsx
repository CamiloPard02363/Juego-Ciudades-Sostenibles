import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { Sidebar } from './Sidebar'
import type { HomeSection } from './Sidebar'
import { SearchBar } from './SearchBar'
import { ProfileMenu } from './ProfileMenu'
import { GamesSection } from './GamesSection'
import { ProfileSettings } from './ProfileSettings'
import { AdminUsersSection } from './AdminUsersSection'

export function HomeLayout() {
  const { user, signOut } = useAuth()
  const [section, setSection] = useState<HomeSection>('games')
  const [searchQuery, setSearchQuery] = useState('')

  if (!user) return null

  const canManageUsers = user.role === 'ADMIN'

  return (
    <div className="fixed inset-0 flex text-left">
      <Sidebar
        activeSection={section}
        onSelectSection={setSection}
        canManageUsers={canManageUsers}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-border px-6 py-4">
          <SearchBar value={searchQuery} onChange={setSearchQuery} />
          <ProfileMenu
            user={user}
            onOpenSettings={() => setSection('settings')}
            onSignOut={signOut}
          />
        </header>

        <main className="flex-1 overflow-y-auto p-6 sm:p-8">
          {section === 'games' && <GamesSection searchQuery={searchQuery} />}
          {section === 'settings' && <ProfileSettings />}
          {section === 'admin-users' && canManageUsers && <AdminUsersSection />}
        </main>
      </div>
    </div>
  )
}
