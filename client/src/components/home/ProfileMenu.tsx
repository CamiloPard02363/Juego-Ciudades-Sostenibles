import { useEffect, useRef, useState } from 'react'
import { ChevronDown, ChevronRight, LogOut, Settings } from 'lucide-react'
import type { AuthUser } from '../../services/auth.service'

type ProfileMenuProps = {
  user: AuthUser
  onOpenSettings: () => void
  onSignOut: () => void
}

const ROLE_LABELS: Record<string, string> = {
  TEACHER: 'Profesor',
  STUDENT: 'Estudiante',
  ADMIN: 'Administrador',
}

export function ProfileMenu({ user, onOpenSettings, onSignOut }: ProfileMenuProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    function handleClickOutside(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [open])

  const initial = user.displayName.trim().charAt(0).toUpperCase() || '?'
  const roleLabel = ROLE_LABELS[user.role?.toUpperCase() ?? '']

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        className="flex items-center gap-2 rounded-full border border-border bg-surface py-1 pr-3 pl-1 transition-colors hover:bg-code-bg"
        aria-haspopup="menu"
        data-tour="profile"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full text-[14px] font-semibold text-white"
          style={{ background: 'linear-gradient(135deg, var(--accent-2), var(--accent))' }}
        >
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            initial
          )}
        </span>
        <span className="flex min-w-0 max-w-[140px] flex-col items-start leading-tight">
          <span className="w-full truncate text-[13.5px] font-medium text-text-h">
            {user.displayName}
          </span>
          {roleLabel && <span className="mt-0.5 text-[11px] text-text">{roleLabel}</span>}
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 text-text transition-transform ${open ? 'rotate-180' : ''}`}
          strokeWidth={2.5}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-10 mt-2 w-60 overflow-hidden rounded-xl border border-border bg-surface shadow-[var(--shadow)]"
        >
          <div className="border-b border-border px-4 py-3">
            <p className="truncate text-[14px] font-medium text-text-h">
              {user.displayName}
            </p>
            <p className="truncate text-[12px] text-text">{user.email}</p>
          </div>
          <div className="p-1.5">
            <button
              type="button"
              role="menuitem"
              className="group flex w-full items-center gap-3 rounded-lg px-2.5 py-2.5 text-left transition-colors hover:bg-accent/10"
              onClick={() => {
                setOpen(false)
                onOpenSettings()
              }}
            >
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-accent"
                style={{ background: 'color-mix(in srgb, var(--accent) 15%, transparent)' }}
              >
                <Settings className="h-[18px] w-[18px]" strokeWidth={2} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-semibold text-text-h">Configuración</span>
                <span className="block truncate text-[12px] text-text">Cuenta, tema y preferencias</span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-text transition-transform group-hover:translate-x-0.5" strokeWidth={2} />
            </button>
          </div>
          <div className="border-t border-border p-1.5">
            <button
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[14px] text-danger hover:bg-danger/10"
              onClick={() => {
                setOpen(false)
                onSignOut()
              }}
            >
              <LogOut className="h-4 w-4" strokeWidth={2} />
              Cerrar sesión
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
