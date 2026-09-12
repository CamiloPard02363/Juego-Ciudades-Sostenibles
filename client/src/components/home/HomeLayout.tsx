import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { Sidebar } from './Sidebar'
import { SearchBar } from './SearchBar'
import { ProfileMenu } from './ProfileMenu'
import { ProfileSettings } from './ProfileSettings'
import { trackEvent } from '../../services/analytics.service'
import { HomeSearchContext } from './homeSearchContext'
import { KidsMascot } from '../kids/KidsMascot'
import { listMyOrganizations } from '../../services/organization.service'

export function HomeLayout() {
  const { user, token, signOut } = useAuth()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const [submittedQuery, setSubmittedQuery] = useState('')
  // Visible en el sidebar solo si el usuario es ADMIN de al menos una
  // organización (o ADMIN global, cubierto aparte). Se resuelve en background
  // sin bloquear el render del resto del layout.
  const [canAccessOrganization, setCanAccessOrganization] = useState(false)

  useEffect(() => {
    if (!token) return
    listMyOrganizations(token)
      .then((items) => setCanAccessOrganization(items.some((org) => org.myOrgRole === 'ADMIN')))
      .catch(() => setCanAccessOrganization(false))
  }, [token])
  // Se incrementa en cada Enter, incluso si el texto no cambió, para que la
  // búsqueda y el scroll a resultados se disparen siempre y no dependan de
  // que el valor sea distinto al anterior.
  const [searchNonce, setSearchNonce] = useState(0)

  function handleSearch(value: string) {
    setSubmittedQuery(value)
    setSearchNonce((n) => n + 1)
  }

  if (!user) return null

  const canManageUsers = user.role === 'ADMIN'

  return (
    <div className="fixed inset-0 flex text-left">
      <Sidebar
        canManageUsers={canManageUsers}
        canAccessOrganization={canAccessOrganization || canManageUsers}
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
          <HomeSearchContext.Provider
            value={{ searchQuery: submittedQuery, searchNonce, onSectionViewed: trackSection }}
          >
            <Outlet />
          </HomeSearchContext.Provider>
        </main>
      </div>

      {settingsOpen && <ProfileSettings onClose={() => setSettingsOpen(false)} />}
      <KidsMascot />
    </div>
  )

  function trackSection(section: string) {
    if (token) trackEvent(token, 'section_viewed', { metadata: { section } })
  }
}
