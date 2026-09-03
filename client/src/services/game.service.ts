import { request } from '../utils/http'

export type GameTheme = {
  primaryColor: string
  coverImageUrl: string | null
}

export type GameSummary = {
  id: string
  slug: string
  title: string
  description: string
  gameType: string
  theme: GameTheme
  status: 'DRAFT' | 'PUBLISHED' | 'FLAGGED' | 'REMOVED'
  creatorUserId: string
  createdAt: string
  updatedAt: string
}

export type GameDetail = GameSummary & {
  config: Record<string, unknown>
  content: unknown[]
}

export type PaginatedGames = {
  items: GameSummary[]
  total: number
  page: number
  pageSize: number
}

export type ListGamesParams = {
  page?: number
  pageSize?: number
  search?: string
  status?: GameSummary['status']
  onlyMine?: boolean
}

/** GET /games — catálogo paginado; sin filtro solo trae juegos publicados. */
export function listGames(token: string, params: ListGamesParams = {}): Promise<PaginatedGames> {
  const query = new URLSearchParams()
  if (params.page) query.set('page', String(params.page))
  if (params.pageSize) query.set('pageSize', String(params.pageSize))
  if (params.search) query.set('search', params.search)
  if (params.status) query.set('status', params.status)
  if (params.onlyMine) query.set('onlyMine', 'true')

  const queryString = query.toString()
  return request<PaginatedGames>(`/games${queryString ? `?${queryString}` : ''}`, { token })
}

/** GET /games/slug/:slug — detalle por URL amigable, para la pantalla de descripción. */
export function getGameBySlug(token: string, slug: string): Promise<GameDetail> {
  return request<GameDetail>(`/games/slug/${encodeURIComponent(slug)}`, { token })
}

export type MemoryMatchPairInput = {
  posTitle: string
  posDescription: string
  posImageUrl: string | null
  negTitle: string
  negDescription: string
  negImageUrl: string | null
}

export type CreateGameInput = {
  title: string
  description: string
  gameType: 'MEMORY_MATCH'
  theme?: { primaryColor?: string; coverImageUrl?: string | null }
  config?: Record<string, unknown>
  content: MemoryMatchPairInput[]
}

/** POST /games — crea un juego en estado DRAFT. Cualquier usuario autenticado puede llamarlo. */
export function createGame(token: string, input: CreateGameInput): Promise<GameDetail> {
  return request<GameDetail>('/games', {
    method: 'POST',
    token,
    body: input,
  })
}

/** PATCH /games/:id/publish — solo el creador o un admin. */
export function publishGame(token: string, gameId: string): Promise<GameDetail> {
  return request<GameDetail>(`/games/${gameId}/publish`, { method: 'PATCH', token })
}
