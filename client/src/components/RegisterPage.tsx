import { RegisterForm } from './RegisterForm'

type RegisterPageProps = {
  onSwitchToLogin: () => void
}

export function RegisterPage({ onSwitchToLogin }: RegisterPageProps) {
  return (
    <main className="flex flex-1 items-center justify-center p-5 sm:p-8">
      <div className="w-full max-w-[420px] rounded-2xl border border-border bg-bg p-7 text-left shadow-[var(--shadow)] sm:p-10">
        <header className="mb-7 text-center">
          <span
            className="inline-flex h-13 w-13 items-center justify-center rounded-full border border-accent/50 bg-accent/10 text-2xl text-accent"
            aria-hidden="true"
          >

          </span>
          <h1 className="mt-4.5 mb-2 text-[28px] tracking-tight text-text-h">
            Crea tu cuenta
          </h1>
          <p className="text-[15px]">Únete a NexusPlay y empieza a jugar.</p>
        </header>

        <RegisterForm />

        <footer className="mt-6 border-t border-border pt-4.5 text-center">
          <p className="text-[13px] leading-snug">
            ¿Ya tienes cuenta?{' '}
            <button
              type="button"
              className="font-medium text-accent hover:underline"
              onClick={onSwitchToLogin}
            >
              Inicia sesión
            </button>
          </p>
        </footer>
      </div>
    </main>
  )
}
