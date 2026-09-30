import { useState, type ReactNode } from 'react'
import { ChevronDown, SlidersHorizontal, User, Users, X } from 'lucide-react'
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
 * Filtro clásico de catálogo (issue #216): arranca colapsado, mostrando solo
 * "Filtro" con una flecha — al hacer click se despliega el panel con las
 * casillas agrupadas por sección (como Mercado Libre/Amazon). Varias
 * casillas se combinan a la vez (OR dentro de cada sección, AND entre
 * secciones) y el filtrado es 100% en cliente sobre los juegos ya cargados
 * por GamesSection — no dispara peticiones nuevas al marcar/desmarcar una
 * casilla ni al abrir/cerrar el panel.
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
  const [open, setOpen] = useState(false)
  const hasActiveFilters = activeModes.size > 0 || activeTypes.size > 0

  return (
    <aside
      className={`inline-flex shrink-0 flex-col self-start rounded-2xl border border-border bg-surface ${
        open ? 'w-full sm:w-[220px]' : ''
      }`}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={`flex items-center gap-2.5 px-4 py-2.5 text-left ${open ? 'w-full justify-between' : ''}`}
      >
        <span className="flex items-center gap-1.5 whitespace-nowrap text-[13px] font-semibold text-text-h">
          <SlidersHorizontal className="h-4 w-4" strokeWidth={2.5} />
          Filtro
          {hasActiveFilters && (
            <span className="rounded-full bg-accent px-1.5 py-0.5 text-[10.5px] font-bold text-white">
              {activeModes.size + activeTypes.size}
            </span>
          )}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-text transition-transform ${open ? 'rotate-180' : ''}`}
          strokeWidth={2.5}
        />
      </button>

      {open && (
        <div className="flex flex-col gap-5 border-t border-border p-4">
          {hasActiveFilters && (
            <button
              type="button"
              onClick={onClear}
              className="flex items-center gap-1 self-start text-[12px] font-medium text-accent hover:underline"
            >
              <X className="h-3 w-3" strokeWidth={2.5} />
              Limpiar
            </button>
          )}

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
