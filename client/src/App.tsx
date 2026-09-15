import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { LoginPage } from './components/LoginPage'
import { RegisterPage } from './components/RegisterPage'
import { HomeLayout } from './components/home/HomeLayout'
import { HomePage } from './components/home/sections/HomePage'
import { CategoriesPage } from './components/home/sections/CategoriesPage'
import { CommunityPage } from './components/home/sections/CommunityPage'
import { MyGamesPage } from './components/home/sections/MyGamesPage'
import { ThemesPage } from './components/home/sections/ThemesPage'
import { AdminUsersPage } from './components/home/sections/AdminUsersPage'
import { OrganizationDashboardPage } from './components/home/sections/OrganizationDashboardPage'
import { CreateGameLayout } from './components/home/games/create/CreateGameLayout'
import { GameTypePickerPage } from './components/home/games/create/GameTypePickerPage'
import { GameModePickerPage } from './components/home/games/create/GameModePickerPage'
import { SimplePairsGameFormPage } from './components/home/games/create/SimplePairsGameFormPage'
import { OppositesGameFormPage } from './components/home/games/create/OppositesGameFormPage'
import { GuessWhoGameFormPage } from './components/home/games/create/GuessWhoGameFormPage'
import { DominoGameFormPage } from './components/home/games/create/DominoGameFormPage'
import { MazeCollectorGameFormPage } from './components/home/games/create/MazeCollectorGameFormPage'
import { SnakesLaddersGameFormPage } from './components/home/games/create/SnakesLaddersGameFormPage'
import { DualQuestGameFormPage } from './components/home/games/create/DualQuestGameFormPage'
import { DominoRoomPage } from './components/home/games/DominoRoomPage'
import { SnakesLaddersRoomPage } from './components/home/games/SnakesLaddersRoomPage'
import { DualQuestRoomPage } from './components/home/games/DualQuestRoomPage'
import { useAuth } from './hooks/useAuth'

// PixiJS + Matter.js solo se descargan si alguien entra a esta ruta —
// van cargados de fábrica (~700 KB) y nadie más en el sitio los necesita.
const DualQuestPixiDemoPage = lazy(() =>
  import('./components/home/games/DualQuestPixiDemoPage').then((m) => ({ default: m.DualQuestPixiDemoPage })),
)

function App() {
  const { user, status } = useAuth()
  const navigate = useNavigate()

  if (status === 'checking') {
    return (
      <main className="flex flex-1 items-center justify-center">
        <p>Cargando…</p>
      </main>
    )
  }

  if (status !== 'authenticated' || !user) {
    return (
      <Routes>
        <Route
          path="/login"
          element={<LoginPage onSwitchToRegister={() => navigate('/register')} />}
        />
        <Route
          path="/register"
          element={<RegisterPage onSwitchToLogin={() => navigate('/login')} />}
        />
        <Route
          path="*"
          element={<Navigate to="/login" replace />}
        />
      </Routes>
    )
  }

  return (
    <Routes>
      <Route path="/juegos/crear" element={<CreateGameLayout />}>
        <Route index element={<GameTypePickerPage />} />
        <Route path="cartas" element={<GameModePickerPage />} />
        <Route path="cartas/parejas" element={<SimplePairsGameFormPage />} />
        <Route path="cartas/opuestos" element={<OppositesGameFormPage />} />
        <Route path="quien-es" element={<GuessWhoGameFormPage />} />
        <Route path="domino" element={<DominoGameFormPage />} />
        <Route path="laberinto" element={<MazeCollectorGameFormPage />} />
        <Route path="escaleras-serpientes" element={<SnakesLaddersGameFormPage />} />
        <Route path="dual-quest" element={<DualQuestGameFormPage />} />
      </Route>
      <Route path="/domino/sala/:code?" element={<DominoRoomPage />} />
      <Route path="/escaleras-serpientes/sala/:code?" element={<SnakesLaddersRoomPage />} />
      <Route path="/dual-quest/sala/:code?" element={<DualQuestRoomPage />} />
      <Route
        path="/dual-quest/pixi-demo"
        element={
          <Suspense fallback={<main className="flex flex-1 items-center justify-center">Cargando motor del juego…</main>}>
            <DualQuestPixiDemoPage />
          </Suspense>
        }
      />
      <Route path="/" element={<HomeLayout />}>
        <Route index element={<HomePage />} />
        <Route path=":slug" element={<HomePage />} />
        <Route path="materias" element={<CategoriesPage />} />
        <Route path="materias/:slug" element={<CategoriesPage />} />
        <Route path="comunidad" element={<CommunityPage />} />
        <Route path="comunidad/:slug" element={<CommunityPage />} />
        <Route path="mis-juegos" element={<MyGamesPage />} />
        <Route path="mis-juegos/:slug" element={<MyGamesPage />} />
        <Route path="temas" element={<ThemesPage />} />
        <Route path="usuarios" element={<AdminUsersPage />} />
        <Route path="organizacion" element={<OrganizationDashboardPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
