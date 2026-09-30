/**
 * A dónde redirigir tras elegir visibilidad en SaveVisibilityModal, marcando
 * el juego recién creado con `?justCreated=<id>` para que GamesSection lo
 * resalte temporalmente en el listado (issue #218).
 */
export function buildJustCreatedRedirect(gameId: string, visibility: 'private' | 'community'): string {
  const basePath = visibility === 'community' ? '/comunidad' : '/mis-juegos'
  return `${basePath}?justCreated=${encodeURIComponent(gameId)}`
}
