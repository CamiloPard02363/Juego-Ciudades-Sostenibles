import { Search } from 'lucide-react'

/**
 * Filtro por dominio/búsqueda del listado de organizaciones del ADMIN
 * global (issue #226). Única responsabilidad: input de búsqueda + select de
 * estado — el debounce y la paginación los maneja el padre, igual que antes.
 */
export function OrganizationFilterBar({
  search,
  onSearchChange,
  activeFilter,
  onActiveFilterChange,
}: {
  search: string
  onSearchChange: (value: string) => void
  activeFilter: 'all' | 'active' | 'inactive'
  onActiveFilterChange: (value: 'all' | 'active' | 'inactive') => void
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-3">
      <div className="relative max-w-[280px] flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text/50" strokeWidth={2} />
        <input
          type="text"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Buscar por nombre o dominio…"
          className="w-full rounded-lg border border-border bg-bg py-2.5 pl-9 pr-3 text-[13px] text-text-h outline-none focus:border-accent"
        />
      </div>
      <select
        className="rounded-lg border border-border bg-bg px-3.5 py-2.5 text-[13px] text-text-h outline-none focus:border-accent"
        value={activeFilter}
        onChange={(event) => onActiveFilterChange(event.target.value as 'all' | 'active' | 'inactive')}
      >
        <option value="all">Todas</option>
        <option value="active">Activas</option>
        <option value="inactive">Inactivas</option>
      </select>
    </div>
  )
}
