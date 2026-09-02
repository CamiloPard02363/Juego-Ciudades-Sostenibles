import { useEffect, useRef, useState } from 'react'
import type { AuthUser } from '../../services/auth.service'

type ProfileMenuProps = {
  user: AuthUser
  onOpenSettings: () => void
  onSignOut: () => void
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

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-border bg-accent/10 text-[15px] font-semibold text-accent transition-opacity hover:opacity-80"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        {user.avatarUrl ? (
          <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          initial
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-10 mt-2 w-60 overflow-hidden rounded-xl border border-border bg-bg shadow-[var(--shadow)]"
        >
          <div className="border-b border-border px-4 py-3">
            <p className="truncate text-[14px] font-medium text-text-h">
              {user.displayName}
            </p>
            <p className="truncate text-[12px] text-text">{user.email}</p>
          </div>
          <button
            type="button"
            role="menuitem"
            className="w-full px-4 py-2.5 text-left text-[14px] text-text-h hover:bg-code-bg"
            onClick={() => {
              setOpen(false)
              onOpenSettings()
            }}
          >
            Configuración
          </button>
          <button
            type="button"
            role="menuitem"
            className="w-full px-4 py-2.5 text-left text-[14px] text-danger hover:bg-danger/10"
            onClick={() => {
              setOpen(false)
              onSignOut()
            }}
          >
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  )
}
