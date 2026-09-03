import { Zap } from 'lucide-react'
import { LoginForm } from './LoginForm'
import { ThemeToggle } from './ThemeToggle'

type LoginPageProps = {
  onSwitchToRegister: () => void
}

export function LoginPage({ onSwitchToRegister }: LoginPageProps) {
  return (
    <main className="relative flex flex-1 items-center justify-center overflow-x-hidden overflow-y-auto p-5 sm:p-8">
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
        className="relative w-full max-w-[420px] rounded-2xl border border-border bg-surface p-7 text-left shadow-[var(--shadow)] sm:p-10"
        style={{ boxShadow: 'var(--shadow), var(--glow)' }}
      >
        <header className="mb-7 text-center">
          <span
            className="inline-flex h-13 w-13 items-center justify-center rounded-2xl text-white"
            style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))' }}
            aria-hidden="true"
          >
            <Zap className="h-6 w-6" fill="currentColor" strokeWidth={0} />
          </span>
          <h1 className="mt-4.5 mb-2 text-[28px] tracking-tight text-text-h">
            NexusPlay
          </h1>
          <p className="text-[15px]">Inicia sesión para continuar tu partida.</p>
        </header>

        <LoginForm />

        <footer className="mt-6 border-t border-border pt-4.5 text-center">
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
    </main>
  )
}
