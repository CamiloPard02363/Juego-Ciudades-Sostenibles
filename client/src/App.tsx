import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { LoginPage } from './components/LoginPage'
import { RegisterPage } from './components/RegisterPage'
import { HomeLayout } from './components/home/HomeLayout'
import { CreateGameLayout } from './components/home/games/create/CreateGameLayout'
import { GameTypePickerPage } from './components/home/games/create/GameTypePickerPage'
import { GameModePickerPage } from './components/home/games/create/GameModePickerPage'
import { SimplePairsGameFormPage } from './components/home/games/create/SimplePairsGameFormPage'
import { OppositesGameFormPage } from './components/home/games/create/OppositesGameFormPage'
import { GuessWhoGameFormPage } from './components/home/games/create/GuessWhoGameFormPage'
import { DominoGameFormPage } from './components/home/games/create/DominoGameFormPage'
import { useAuth } from './hooks/useAuth'

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
      </Route>
      <Route path="/*" element={<HomeLayout />} />
    </Routes>
  )
}

export default App
