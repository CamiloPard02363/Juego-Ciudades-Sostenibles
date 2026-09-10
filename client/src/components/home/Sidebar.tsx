import { useState } from 'react'
import type { ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { BookOpen, ChevronLeft, Gamepad2, Lock, Palette, Users, Users2, Zap } from 'lucide-react'
import { ThemeToggle } from '../ThemeToggle'

type SidebarProps = {
  canManageUsers: boolean
}

const BASE_ITEM_CLASS =
  'flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-[14px] font-medium transition-colors'

const STORAGE_KEY = 'nexusplay-sidebar-collapsed'

function readStoredCollapsed(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

export function Sidebar({ canManageUsers }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(readStoredCollapsed)
  const navigate = useNavigate()
  const location = useLocation()

  function toggleCollapsed() {
    setCollapsed((current) => {
      const next = !current
      try {
        localStorage.setItem(STORAGE_KEY, String(next))
      } catch {
        // localStorage puede fallar en navegación privada; no es crítico persistirlo.
      }
      return next
    })
  }

  return (
    <aside
      className={`relative flex shrink-0 flex-col gap-1 border-r border-border bg-bg p-4 transition-[width] duration-200 ease-out ${
        collapsed ? 'w-[76px]' : 'w-[240px]'
      }`}
    >
      <button
        type="button"
        onClick={toggleCollapsed}
        aria-label={collapsed ? 'Expandir menú' : 'Contraer menú'}
        className="absolute top-6 -right-3 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-surface text-text shadow-[var(--shadow)] transition-transform hover:text-text-h"
      >
        <ChevronLeft
          className={`h-3.5 w-3.5 transition-transform ${collapsed ? 'rotate-180' : ''}`}
          strokeWidth={2.5}
        />
      </button>

      <div className="mb-4 flex items-center gap-2.5 px-1.5">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white"
          style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))' }}
          aria-hidden="true"
        >
          <Zap className="h-[18px] w-[18px]" fill="currentColor" strokeWidth={0} />
        </span>
        {!collapsed && (
          <span className="truncate text-[17px] font-semibold tracking-tight text-text-h">
            NexusPlay
          </span>
        )}
      </div>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto" aria-label="Navegación principal">
        <SidebarItem
          label="Inicio"
          collapsed={collapsed}
          active={location.pathname === '/'}
          onClick={() => navigate('/')}
          icon={<Gamepad2 className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />}
        />
        <SidebarItem
          label="Materias"
          collapsed={collapsed}
          active={location.pathname === '/materias'}
          onClick={() => navigate('/materias')}
          icon={<BookOpen className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />}
        />
        <SidebarItem
          label="Comunidad"
          collapsed={collapsed}
          active={location.pathname === '/comunidad'}
          onClick={() => navigate('/comunidad')}
          icon={<Users2 className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />}
        />
        <SidebarItem
          label="Mis juegos privados"
          collapsed={collapsed}
          active={location.pathname === '/mis-juegos'}
          onClick={() => navigate('/mis-juegos')}
          icon={<Lock className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />}
        />
        <SidebarItem
          label="Temas"
          collapsed={collapsed}
          active={location.pathname === '/temas'}
          onClick={() => navigate('/temas')}
          icon={<Palette className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />}
        />
        {canManageUsers && (
          <>
            {!collapsed && (
              <p className="mt-4 mb-1 px-3.5 text-[11px] font-semibold tracking-wide text-text/60 uppercase">
                Administración
              </p>
            )}
            <SidebarItem
              label="Usuarios"
              collapsed={collapsed}
              active={location.pathname === '/usuarios'}
              onClick={() => navigate('/usuarios')}
              icon={<Users className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />}
            />
          </>
        )}
      </nav>

      <div
        className={`mt-2 flex items-center border-t border-border px-1.5 pt-4 ${
          collapsed ? 'flex-col gap-2' : 'justify-between'
        }`}
      >
        {!collapsed && <span className="text-[12px] font-medium text-text">Tema</span>}
        <ThemeToggle />
      </div>
    </aside>
  )
}

function SidebarItem({
  label,
  active,
  collapsed,
  onClick,
  icon,
}: {
  label: string
  active: boolean
  collapsed: boolean
  onClick: () => void
  icon: ReactNode
}) {
  return (
    <button
      type="button"
      title={collapsed ? label : undefined}
      className={`${BASE_ITEM_CLASS} ${collapsed ? 'justify-center px-0' : ''} ${
        active ? 'bg-accent/10 text-accent' : 'text-text-h hover:bg-code-bg'
      }`}
      aria-current={active ? 'page' : undefined}
      onClick={onClick}
    >
      {icon}
      {!collapsed && <span className="truncate">{label}</span>}
    </button>
  )
}
