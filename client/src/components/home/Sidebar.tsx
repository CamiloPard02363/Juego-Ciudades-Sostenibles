export type HomeSection = 'games' | 'settings' | 'admin-users'

type SidebarProps = {
  activeSection: HomeSection
  onSelectSection: (section: HomeSection) => void
  canManageUsers: boolean
}

const BASE_ITEM_CLASS =
  'flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-[14px] font-medium transition-colors'

export function Sidebar({ activeSection, onSelectSection, canManageUsers }: SidebarProps) {
  return (
    <aside className="flex w-[240px] shrink-0 flex-col gap-1 border-r border-border bg-bg p-4">
      <div className="mb-4 flex items-center gap-2.5 px-1.5">
        <span
          className="flex h-9 w-9 items-center justify-center rounded-full border border-accent/50 bg-accent/10 text-lg text-accent"
          aria-hidden="true"
        >

        </span>
        <span className="text-[17px] font-semibold tracking-tight text-text-h">
          NexusPlay
        </span>
      </div>

      <nav className="flex flex-1 flex-col gap-1" aria-label="Navegación principal">
        <SidebarItem
          label="Juegos"
          active={activeSection === 'games'}
          onClick={() => onSelectSection('games')}
        />
        <SidebarItem
          label="Configuración"
          active={activeSection === 'settings'}
          onClick={() => onSelectSection('settings')}
        />
        {canManageUsers && (
          <>
            <p className="mt-4 mb-1 px-3.5 text-[11px] font-semibold tracking-wide text-text/60 uppercase">
              Administración
            </p>
            <SidebarItem
              label="Usuarios"
              active={activeSection === 'admin-users'}
              onClick={() => onSelectSection('admin-users')}
            />
          </>
        )}
      </nav>
    </aside>
  )
}

function SidebarItem({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className={`${BASE_ITEM_CLASS} ${
        active
          ? 'bg-accent/10 text-accent'
          : 'text-text-h hover:bg-code-bg'
      }`}
      aria-current={active ? 'page' : undefined}
      onClick={onClick}
    >
      {label}
    </button>
  )
}
