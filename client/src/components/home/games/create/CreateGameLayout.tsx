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
      <main className="relative flex-1 overflow-y-auto">
        {/* Fondo decorativo difuminado, fijo detrás del formulario: sin
            contenido real, solo para que la mirada se quede en la tarjeta de
            configuración del centro en vez de perderse en el resto de la
            pantalla — igual de vacía que estar en un juego a medio configurar. */}
        <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
          <div
            className="absolute -top-24 -left-24 h-72 w-72 rounded-full opacity-25 blur-3xl"
            style={{ background: 'var(--accent)' }}
          />
          <div
            className="absolute top-1/2 -right-24 h-80 w-80 -translate-y-1/2 rounded-full opacity-20 blur-3xl"
            style={{ background: 'var(--accent-2)' }}
          />
        </div>
        <Outlet />
      </main>
    </div>
  )
}
