import type { ReactNode } from 'react'
import { SlidersHorizontal, User, Users, X } from 'lucide-react'
import { MULTI_MODE_COLOR, SOLO_MODE_COLOR, type GameModeFilter } from './gameModeVisuals'

export type GameTypeFilterOption = {
  gameType: string
  label: string
  count: number
}

type GameFiltersPanelProps = {
  /** Cantidad de juegos ya cargados por cada modo, para mostrar el conteo junto a la casilla (como en Mercado Libre/Amazon). */
  soloCount: number
  multiCount: number
  activeModes: Set<GameModeFilter>
  onToggleMode: (mode: GameModeFilter) => void
  typeOptions: GameTypeFilterOption[]
  activeTypes: Set<string>
  onToggleType: (gameType: string) => void
  onClear: () => void
}

/**
 * Filtro clásico de catálogo (issue #216): panel con casillas agrupadas por
 * sección, como en Mercado Libre/Amazon — a diferencia del selector único
 * que ya existía para "Tipos de juego" (statusFilter en
 * GameTypesCatalogPage), acá varias casillas se combinan a la vez (OR dentro
 * de cada sección, AND entre secciones) y el filtrado es 100% en cliente
 * sobre los juegos ya cargados por GamesSection — no dispara peticiones
 * nuevas al marcar/desmarcar una casilla.
 */
export function GameFiltersPanel({
  soloCount,
  multiCount,
  activeModes,
  onToggleMode,
  typeOptions,
  activeTypes,
  onToggleType,
  onClear,
}: GameFiltersPanelProps) {
  const hasActiveFilters = activeModes.size > 0 || activeTypes.size > 0

  return (
    <aside className="flex w-full shrink-0 flex-col gap-5 rounded-2xl border border-border bg-surface p-4 sm:w-[220px]">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[13px] font-semibold text-text-h">
          <SlidersHorizontal className="h-4 w-4" strokeWidth={2.5} />
          Filtros
        </span>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onClear}
            className="flex items-center gap-1 text-[12px] font-medium text-accent hover:underline"
          >
            <X className="h-3 w-3" strokeWidth={2.5} />
            Limpiar
          </button>
        )}
      </div>

      <div>
        <h3 className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-text/70">Modo de juego</h3>
        <div className="flex flex-col gap-2">
          <FilterCheckbox
            label="1 jugador"
            count={soloCount}
            checked={activeModes.has('SOLO')}
            onChange={() => onToggleMode('SOLO')}
            icon={<User className="h-3.5 w-3.5" strokeWidth={2.5} style={{ color: SOLO_MODE_COLOR }} />}
          />
          <FilterCheckbox
            label="Multijugador"
            count={multiCount}
            checked={activeModes.has('MULTI')}
            onChange={() => onToggleMode('MULTI')}
            icon={<Users className="h-3.5 w-3.5" strokeWidth={2.5} style={{ color: MULTI_MODE_COLOR }} />}
          />
        </div>
      </div>

      {typeOptions.length > 0 && (
        <div>
          <h3 className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-text/70">Tipo de juego</h3>
          <div className="flex max-h-[260px] flex-col gap-2 overflow-y-auto pr-1">
            {typeOptions.map((option) => (
              <FilterCheckbox
                key={option.gameType}
                label={option.label}
                count={option.count}
                checked={activeTypes.has(option.gameType)}
                onChange={() => onToggleType(option.gameType)}
              />
            ))}
          </div>
        </div>
      )}
    </aside>
  )
}

function FilterCheckbox({
  label,
  count,
  checked,
  onChange,
  icon,
}: {
  label: string
  count: number
  checked: boolean
  onChange: () => void
  icon?: ReactNode
}) {
  return (
    <label className="flex items-center gap-2 text-[13px] text-text-h">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="h-[15px] w-[15px] shrink-0 rounded border-border text-accent focus:ring-accent"
      />
      {icon}
      <span className="flex-1 truncate">{label}</span>
      <span className="text-[12px] text-text/60">{count}</span>
    </label>
  )
}
