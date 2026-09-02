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

  // Dashboard mínimo para comprobar que el login/autenticación funcionan de
  // punta a punta. No es la home definitiva (sidebar, juegos, búsqueda, etc.).
  return (
    <main className="flex flex-1 items-center justify-center p-5">
      <div className="w-full max-w-[480px] rounded-2xl border border-border bg-bg p-7 text-left shadow-[var(--shadow)] sm:p-10">
        <header className="mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-[13px] uppercase tracking-wide text-accent">
              Sesión activa
            </p>
            <h1 className="mt-1 text-[26px] tracking-tight text-text-h">
              Hola, {user.displayName}
            </h1>
          </div>
          <button
            className="shrink-0 rounded-lg border border-border px-3.5 py-2 text-[13px] font-medium text-text-h transition-opacity hover:opacity-75"
            type="button"
            onClick={signOut}
          >
            Cerrar sesión
          </button>
        </header>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 border-t border-border pt-5 text-[14px]">
          <DetailRow label="Correo" value={user.email} />
          <DetailRow label="Rol" value={user.role} />
          <DetailRow
            label="Nombre completo"
            value={[user.firstName, user.middleName, user.lastName]
              .filter(Boolean)
              .join(' ')}
          />
          <DetailRow
            label="Cuenta"
            value={user.isActive ? 'Activa' : 'Inactiva'}
          />
          <DetailRow
            label="Correo verificado"
            value={user.isEmailVerified ? 'Sí' : 'No'}
          />
          <DetailRow
            label="Último ingreso"
            value={
              user.lastLoginAt
                ? new Date(user.lastLoginAt).toLocaleString('es-CO')
                : 'Este es tu primer ingreso'
            }
          />
        </dl>

        <footer className="mt-6 border-t border-border pt-4 text-[13px]">
          <p>
            ID de usuario: <code>{user.id}</code>
          </p>
        </footer>
      </div>
    </main>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[12px] text-text">{label}</dt>
      <dd className="mt-0.5 font-medium text-text-h">{value}</dd>
    </div>
  )
}

export default App
