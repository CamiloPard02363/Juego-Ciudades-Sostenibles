import { Zap } from 'lucide-react'
import { Link } from 'react-router-dom'
import { LoginForm } from './LoginForm'
import { ThemeToggle } from './ThemeToggle'
import { useAuth } from '../hooks/useAuth'

type LoginPageProps = {
  onSwitchToRegister: () => void
}

export function LoginPage({ onSwitchToRegister }: LoginPageProps) {
  const { authMessage } = useAuth()

  return (
    <main className="relative flex h-svh flex-col items-center justify-center gap-3 p-5 sm:p-8">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 15% 20%, color-mix(in srgb, var(--accent) 22%, transparent), transparent 55%), radial-gradient(circle at 85% 80%, color-mix(in srgb, var(--accent-2) 18%, transparent), transparent 50%)',
        }}
      />

      <div className="absolute top-5 right-5 sm:top-8 sm:right-8">
        <ThemeToggle />
      </div>

      <div
        className="relative w-full max-w-[420px] rounded-2xl border border-border bg-surface p-6 text-left shadow-[var(--shadow)] sm:p-8"
        style={{ boxShadow: 'var(--shadow), var(--glow)' }}
      >
        <header className="mb-5 text-center">
          <span
            className="inline-flex h-13 w-13 items-center justify-center rounded-2xl text-white"
            style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))' }}
            aria-hidden="true"
          >
            <Zap className="h-6 w-6" fill="currentColor" strokeWidth={0} />
          </span>
          <h1 className="mt-3 mb-1.5 text-[26px] tracking-tight text-text-h">NexusPlay</h1>
          <p className="text-[15px]">Inicia sesión para continuar tu partida.</p>
        </header>

        {authMessage && (
          <p
            className="mb-4 rounded-lg border border-danger/35 bg-danger/10 px-[13px] py-[11px] text-sm leading-snug text-danger"
            role="alert"
          >
            {authMessage}
          </p>
        )}

        <LoginForm />

        <footer className="mt-5 border-t border-border pt-3.5 text-center">
          <p className="text-[13px] leading-snug">
            ¿No tienes cuenta?{' '}
            <button
              type="button"
              className="font-medium text-accent hover:underline"
              onClick={onSwitchToRegister}
            >
              Regístrate
            </button>
          </p>
        </footer>
      </div>

      <footer className="relative shrink-0 text-center text-[13px]">
        <p className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
          <Link to="/inicio" className="hover:text-text-h hover:underline">
            Inicio
          </Link>
          <span aria-hidden="true">·</span>
          <Link to="/privacidad" className="hover:text-text-h hover:underline">
            Política de Privacidad
          </Link>
          <span aria-hidden="true">·</span>
          <Link to="/terminos" className="hover:text-text-h hover:underline">
            Términos de Servicio
          </Link>
        </p>
      </footer>
    </main>
  )
}
