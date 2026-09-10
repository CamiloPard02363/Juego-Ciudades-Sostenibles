import { ArrowLeft } from 'lucide-react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { stepFromPath } from './steps'

/** Contenedor inmersivo del flujo de creación de juegos: página completa, sin Sidebar. */
export function CreateGameLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { label, step, total } = stepFromPath(location.pathname)

  return (
    <div className="fixed inset-0 flex flex-col bg-bg">
      <header className="flex shrink-0 items-center gap-4 border-b border-border px-5 py-4 sm:px-8">
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[13.5px] font-medium text-text-h transition-colors hover:bg-code-bg"
          onClick={() => navigate('/')}
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={2} />
          Volver
        </button>
        <div className="flex-1">
          <p className="text-[15px] font-semibold tracking-tight text-text-h">Crear juego</p>
          <p className="text-[12px] text-text">
            Paso {step} de {total} · {label}
          </p>
        </div>
      </header>
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}
