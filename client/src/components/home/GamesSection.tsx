type GamesSectionProps = {
  searchQuery: string
}

/**
 * El módulo de juegos (backend) todavía no existe, así que esta sección no
 * hace fetch a nada: muestra un estado vacío real en vez de datos inventados.
 * Cuando exista GET /games, aquí se reemplaza por el fetch y el grid real.
 */
export function GamesSection({ searchQuery }: GamesSectionProps) {
  return (
    <section>
      <h2 className="mb-1 text-[22px] tracking-tight text-text-h">Juegos</h2>
      <p className="mb-6 text-[14px] text-text">
        Elige un juego para empezar a aprender jugando.
      </p>

      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16 text-center">
        <span
          className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-2xl text-accent"
          aria-hidden="true"
        >

        </span>
        <p className="text-[15px] font-medium text-text-h">
          {searchQuery
            ? `Sin resultados para "${searchQuery}".`
            : 'Aún no hay juegos disponibles.'}
        </p>
        <p className="mt-1 max-w-[320px] text-[13px] text-text">
          Muy pronto vas a encontrar aquí los juegos de la plataforma.
        </p>
      </div>
    </section>
  )
}
