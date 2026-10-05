import { useEffect, useRef, useState, type ReactNode } from 'react'
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
 * Filtro clásico de catálogo (issue #216): un botón "Filtro" — nada
 * desplegable dentro del mismo recuadro — que al hacer click abre un
 * recuadro flotante propio (popover) con las casillas agrupadas por
 * sección (Modo de juego / Tipo de juego), superpuesto sobre el contenido
 * en vez de empujarlo. Se cierra al hacer click fuera o con el botón "X" de
 * su encabezado. Varias casillas se combinan a la vez (OR dentro de cada
 * sección, AND entre secciones) y el filtrado es 100% en cliente sobre los
 * juegos ya cargados por GamesSection — no dispara peticiones nuevas.
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
  const containerRef = useRef<HTMLDivElement>(null)
  const hasActiveFilters = activeModes.size > 0 || activeTypes.size > 0
  const activeCount = activeModes.size + activeTypes.size

  useEffect(() => {
    if (!open) return
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded-xl border border-border bg-surface px-4 py-2.5 text-[13px] font-semibold text-text-h transition-colors hover:border-accent"
      >
        <SlidersHorizontal className="h-4 w-4" strokeWidth={2.5} />
        Filtro
        {hasActiveFilters && (
          <span className="rounded-full bg-accent px-1.5 py-0.5 text-[10.5px] font-bold text-white">
            {activeCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-[calc(100%+8px)] z-20 flex w-[260px] flex-col gap-5 rounded-2xl border border-border bg-surface p-4 shadow-[var(--shadow)]">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[13px] font-semibold text-text-h">Filtro</span>
            <button
              type="button"
              aria-label="Cerrar filtro"
              onClick={() => setOpen(false)}
              className="rounded-full p-1 text-text hover:bg-code-bg hover:text-text-h"
            >
              <X className="h-4 w-4" strokeWidth={2.5} />
            </button>
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={onClear}
              className="self-start text-[12px] font-medium text-accent hover:underline"
            >
              Limpiar filtros
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
              <div className="scroll-fade flex max-h-[260px] flex-col gap-2 overflow-y-auto pr-1">
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
    </div>
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
