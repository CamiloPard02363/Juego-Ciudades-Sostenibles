import type { SubjectWithGameCount as CategoryWithGameCount } from '../../../services/subject.service'
import { colorForCategory, iconForCategory } from '../gamesCatalogVisuals'

type KidsWorldGridProps = {
  categories: CategoryWithGameCount[]
  onSelect: (category: CategoryWithGameCount) => void
}

/**
 * Pantalla de inicio del Modo Kids: cada materia es un "mundo" — un tile
 * grande, a todo color, con un solo ícono y una sola palabra — en vez de la
 * barra de filtros de texto del Home de adulto. Solo se listan materias con
 * juegos publicados: un mundo vacío sería un callejón sin salida para un
 * niño que no puede interpretar un estado vacío.
 */
export function KidsWorldGrid({ categories, onSelect }: KidsWorldGridProps) {
  const worlds = categories.filter((category) => category.gameCount > 0)

  if (worlds.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
        <span className="text-6xl" aria-hidden="true">
          🧩
        </span>
        <p className="text-[18px] font-bold text-text-h">Todavía no hay juegos para ti</p>
        <p className="max-w-[280px] text-[14px] text-text">Pídele a tu profesor que publique uno.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {worlds.map((category) => {
        const color = colorForCategory(category.name)
        const Icon = iconForCategory(category.name)
        return (
          <button
            key={category.id}
            type="button"
            onClick={() => onSelect(category)}
            className="flex aspect-square flex-col items-center justify-center gap-3 rounded-[32px] border-4 text-center shadow-[0_10px_0_-2px_rgba(0,0,0,0.08)] transition-transform hover:-translate-y-1 hover:scale-[1.02] active:translate-y-0 active:shadow-none"
            style={{ borderColor: color, background: `linear-gradient(160deg, ${color}33, var(--surface))` }}
          >
            <span
              className="flex h-16 w-16 items-center justify-center rounded-full text-white sm:h-20 sm:w-20"
              style={{ background: color, boxShadow: `0 0 0 6px ${color}33` }}
              aria-hidden="true"
            >
              <Icon className="h-8 w-8 sm:h-9 sm:w-9" strokeWidth={2.5} />
            </span>
            <p className="px-2 text-[16px] leading-tight font-extrabold text-text-h sm:text-[18px]">
              {category.name}
            </p>
          </button>
        )
      })}
    </div>
  )
}
