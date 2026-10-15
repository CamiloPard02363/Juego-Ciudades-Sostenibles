import type { CreatedGameKind } from '../createdGameSummary'

const KINDS: readonly CreatedGameKind[] = [
  'PAIRS', 'OPPOSITES', 'GUESS_WHO', 'DOMINO', 'MAZE_COLLECTOR', 'SNAKES_LADDERS', 'DUAL_QUEST',
]

/**
 * A dónde redirigir tras elegir visibilidad en SaveVisibilityModal, marcando
 * el juego recién creado con `?justCreated=<id>` para que GamesSection lo
 * resalte en el listado (issue #218). `kind` (issue #2) viaja como
 * `&kind=<tipo>` para que la nube del listado explique qué se creó con el
 * mismo resumen de `createdGameSummary` (el `gameType` solo no distingue
 * Pares de Conceptos opuestos).
 */
export function buildJustCreatedRedirect(
  gameId: string,
  visibility: 'private' | 'community',
  kind?: CreatedGameKind,
): string {
  const basePath = visibility === 'community' ? '/comunidad' : '/mis-juegos'
  const kindParam = kind ? `&kind=${kind}` : ''
  return `${basePath}?justCreated=${encodeURIComponent(gameId)}${kindParam}`
}

/** Lee `kind` de la URL; `null` si falta o no es uno de los 7 formularios. */
export function parseCreatedKind(value: string | null): CreatedGameKind | null {
  return KINDS.find((k) => k === value) ?? null
}
