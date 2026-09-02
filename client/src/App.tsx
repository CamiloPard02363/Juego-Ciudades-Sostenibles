import { LoginPage } from './components/LoginPage'
import { useAuth } from './hooks/useAuth'

function App() {
  const { user, status, signOut } = useAuth()

  if (status === 'checking') {
    return (
      <main className="flex flex-1 items-center justify-center">
        <p>Cargando…</p>
      </main>
    )
  }

  if (status !== 'authenticated' || !user) {
    return <LoginPage />
  }

  // Marcador de posición: aquí entra el juego una vez autenticado.
  return (
    <main className="flex flex-1 items-center justify-center p-5">
      <div className="w-full max-w-[420px] rounded-2xl border border-border bg-bg p-10 text-center shadow-[var(--shadow)]">
        <header className="mb-7">
          <h1 className="mb-2 text-[28px] tracking-tight text-text-h">
            Hola, {user.displayName}
          </h1>
          <p className="text-[15px]">Sesión iniciada como {user.email}.</p>
        </header>
        <button
          className="rounded-lg bg-accent px-4 py-3 text-[15px] font-medium text-white dark:text-bg"
          type="button"
          onClick={signOut}
        >
          Cerrar sesión
        </button>
      </div>
    </main>
  )
}

export default App
