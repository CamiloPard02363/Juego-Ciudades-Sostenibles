import { request } from '../utils/http'

export type Category = {
  id: string
  name: string
  slug: string
  createdAt: string
}

export type CategoryWithGameCount = Category & {
  gameCount: number
}

/** GET /categories — todas las materias existentes, con conteo de juegos publicados. */
export function listCategories(token: string): Promise<CategoryWithGameCount[]> {
  return request<CategoryWithGameCount[]>('/categories', { token })
}

/** POST /categories — crea una materia nueva; cualquier usuario autenticado puede llamarlo. */
export function createCategory(token: string, name: string): Promise<Category> {
  return request<Category>('/categories', {
    method: 'POST',
    token,
    body: { name },
  })
}
