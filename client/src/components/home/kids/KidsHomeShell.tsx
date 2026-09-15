import { useEffect, useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import type { AuthUser } from '../../../services/auth.service'
import { useAuth } from '../../../hooks/useAuth'
import { listCategories, type CategoryWithGameCount } from '../../../services/category.service'
import type { GameSummary } from '../../../services/game.service'
import { HomeSearchContext } from '../homeSearchContext'
import { ProfileMenu } from '../ProfileMenu'
import { ProfileSettings } from '../ProfileSettings'
import { KidsMascot } from '../../kids/KidsMascot'
import { KidsWorldGrid } from './KidsWorldGrid'
import { KidsGameGrid } from './KidsGameGrid'

type KidsHomeShellProps = {
  user: AuthUser
  onSignOut: () => void
}

/**
 * Reemplazo completo del "chrome" de adulto (Sidebar + búsqueda + grid de
 * texto) para todo usuario STUDENT — ver la bifurcación por rol en
 * HomeLayout.tsx. En vez de una barra lateral con secciones de texto, hay
 * una sola pantalla: elegir un "mundo" (materia) y, dentro, elegir un juego
 * por su portada. Nada de crear/editar/borrar — un niño acá es solo
 * jugador (ver Contexto del plan).
 *
 * El detalle/lanzamiento de un juego NO se reimplementa acá: al tocar un
 * juego se navega a `/${slug}`, la misma ruta que ya usa el Home de adulto
 * para abrir `GameDetailModal` y, desde ahí, el `handlePlayClick` de
 * siempre (ver GamesSection.tsx) — así cada tipo de juego se sigue
 * lanzando exactamente igual sin duplicar esa lógica acá.
 */
export function KidsHomeShell({ user, onSignOut }: KidsHomeShellProps) {
  const { token } = useAuth()
  const navigate = useNavigate()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [categories, setCategories] = useState<CategoryWithGameCount[]>([])
  const [selectedCategory, setSelectedCategory] = useState<CategoryWithGameCount | null>(null)

  useEffect(() => {
    if (!token) return
    listCategories(token)
      .then(setCategories)
      .catch(() => setCategories([]))
  }, [token])

  function handlePlay(game: GameSummary) {
    navigate(`/${game.slug}`)
  }

  return (
    <div className="fixed inset-0 flex flex-col overflow-y-auto" style={{ background: 'var(--bg)' }}>
      <header className="flex shrink-0 items-center justify-between gap-4 px-5 py-4 sm:px-8">
        <p className="text-[20px] font-extrabold text-text-h sm:text-[24px]">
          ¡Hola, {user.displayName.split(' ')[0]}! 👋
        </p>
        <ProfileMenu user={user} onOpenSettings={() => setSettingsOpen(true)} onSignOut={onSignOut} />
      </header>

      <main className="flex flex-1 flex-col px-5 pb-10 sm:px-8">
        {selectedCategory ? (
          token && (
            <KidsGameGrid
              token={token}
              category={selectedCategory}
              onBack={() => setSelectedCategory(null)}
              onPlay={handlePlay}
            />
          )
        ) : (
          <KidsWorldGrid categories={categories} onSelect={setSelectedCategory} />
        )}

        {/* El detalle de un juego (GameDetailModal) vive fuera de esta
            navegación: se abre por `/:slug` a través del mismo `<Outlet/>`
            que usa el Home de adulto (ver HomePage.tsx + `browsingHidden`
            en GamesSection.tsx). El stub de búsqueda es inofensivo: el
            Modo Kids no tiene barra de búsqueda propia. */}
        <HomeSearchContext.Provider value={{ searchQuery: '', searchNonce: 0, onSectionViewed: () => {} }}>
          <Outlet />
        </HomeSearchContext.Provider>
      </main>

      {settingsOpen && <ProfileSettings onClose={() => setSettingsOpen(false)} />}
      <KidsMascot />
    </div>
  )
}
