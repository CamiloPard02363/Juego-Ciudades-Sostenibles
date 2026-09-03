import { request } from '../utils/http'

export type Game = {
  id: string
  title: string
}

/** GET /games — lista juegos; con `search` filtra por título (LIKE en servidor). */
export function searchGames(search: string, signal?: AbortSignal): Promise<Game[]> {
  const query = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : ''
  return request<Game[]>(`/games${query}`, { signal })
}
