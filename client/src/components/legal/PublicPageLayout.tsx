import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Zap } from 'lucide-react'
import { ThemeToggle } from '../ThemeToggle'

type PublicPageLayoutProps = {
  title: string
  children: ReactNode
}

export function PublicPageLayout({ title, children }: PublicPageLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-bg text-text">
      <header className="flex items-center justify-between border-b border-border px-5 py-4 sm:px-8">
        <Link to="/inicio" className="flex items-center gap-2.5">
          <span
            className="flex h-9 w-9 items-center justify-center rounded-xl text-white"
            style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))' }}
            aria-hidden="true"
          >
            <Zap className="h-5 w-5" fill="currentColor" strokeWidth={0} />
          </span>
          <span className="font-heading text-lg font-semibold text-text-h">NexusPlay</span>
        </Link>
        <ThemeToggle />
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-10 sm:px-8 sm:py-14">
        <h1 className="mb-6 font-heading text-[28px] font-semibold tracking-tight text-text-h sm:text-[34px]">
          {title}
        </h1>
        <div className="flex flex-col gap-4 text-[15px] leading-relaxed">{children}</div>
      </main>

      <footer className="border-t border-border px-5 py-6 text-center text-[13px] sm:px-8">
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
    </div>
  )
}
