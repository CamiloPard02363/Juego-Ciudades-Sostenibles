import { Link } from 'react-router-dom'
import { Zap } from 'lucide-react'
import { ThemeToggle } from '../ThemeToggle'

export function PublicHomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-bg text-text">
      <header className="flex items-center justify-between px-5 py-5 sm:px-8">
        <span className="flex items-center gap-2.5">
          <span
            className="flex h-9 w-9 items-center justify-center rounded-xl text-white"
            style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))' }}
            aria-hidden="true"
          >
            <Zap className="h-5 w-5" fill="currentColor" strokeWidth={0} />
          </span>
          <span className="font-heading text-lg font-semibold text-text-h">NexusPlay</span>
        </span>
        <ThemeToggle />
      </header>

      <main className="relative flex flex-1 items-center justify-center overflow-hidden px-5 py-10 text-center sm:px-8">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 15% 20%, color-mix(in srgb, var(--accent) 22%, transparent), transparent 55%), radial-gradient(circle at 85% 80%, color-mix(in srgb, var(--accent-2) 18%, transparent), transparent 50%)',
          }}
        />

        <div className="relative flex max-w-xl flex-col items-center gap-5">
          <span
            className="flex h-16 w-16 items-center justify-center rounded-2xl text-white"
            style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))' }}
            aria-hidden="true"
          >
            <Zap className="h-8 w-8" fill="currentColor" strokeWidth={0} />
          </span>
          <h1 className="font-heading text-[32px] font-semibold tracking-tight text-text-h sm:text-[40px]">
            NexusPlay
          </h1>
          <p className="text-[16px] leading-relaxed">
            Juegos educativos para aprender sobre ciudades sostenibles, pensados para clases,
            profesores y estudiantes.
          </p>
          <Link
            to="/login"
            className="mt-2 rounded-lg px-6 py-3 text-[15px] font-semibold text-white shadow-[0_8px_20px_-8px_var(--accent)] transition-[transform,opacity] hover:-translate-y-0.5"
            style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))' }}
          >
            Iniciar sesión
          </Link>
        </div>
      </main>

      <footer className="border-t border-border px-5 py-6 text-center text-[13px] sm:px-8">
        <p className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
          <Link to="/privacidad" className="hover:text-text-h hover:underline">
            Política de Privacidad
          </Link>
          <span aria-hidden="true">·</span>
          <Link to="/terminos" className="hover:text-text-h hover:underline">
            Términos de Servicio
          </Link>
        </p>
      </footer>
    </div>
  )
}
