import { request } from '../utils/http'

export type GameSummary = {
  id: string
  slug: string
  title: string
  description: string
  gameType: string
  theme: { primaryColor: string; coverImageUrl: string | null }
  status: string
  creatorUserId: string
  createdAt: string
  updatedAt: string
}

export type PaginatedGames = {
  items: GameSummary[]
  total: number
  page: number
  pageSize: number
}

/** GET /games — catálogo público (PUBLISHED); `search` filtra título/descripción. */
export function listGames(
  token: string,
  search: string,
  signal?: AbortSignal,
): Promise<PaginatedGames> {
  const query = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : ''
  return request<PaginatedGames>(`/games${query}`, { token, signal })
}
