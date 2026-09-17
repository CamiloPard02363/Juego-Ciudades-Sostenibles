import type { CategoryWithGameCount } from '../../../services/category.service'
import { KidsPlanetIcon } from '../../kids/KidsPlanetIcon'

type KidsWorldGridProps = {
  categories: CategoryWithGameCount[]
  onSelect: (category: CategoryWithGameCount) => void
}

/**
 * Pantalla de inicio del Modo Kids: cada materia es un "mundo" — un planeta
 * gigante con su nombre escrito adentro (ver `KidsPlanetIcon`), como los
 * planetas del fondo del Modo Kids — en vez de la barra de filtros de texto
 * del Home de adulto. Solo se listan materias con juegos publicados: un
 * mundo vacío sería un callejón sin salida para un niño que no puede
 * interpretar un estado vacío.
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
      {worlds.map((category) => (
        <button
          key={category.id}
          type="button"
          onClick={() => onSelect(category)}
          className="flex aspect-square flex-col items-center justify-center rounded-[32px] transition-transform hover:-translate-y-1 hover:scale-[1.02] active:translate-y-0"
        >
          <KidsPlanetIcon label={category.name} size={260} className="h-full w-full max-h-[280px] max-w-[280px]" />
        </button>
      ))}
    </div>
  )
}
