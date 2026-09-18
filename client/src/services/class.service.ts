import { request } from '../utils/http'
import type { GameSummary } from './game.service'

export type TeacherClass = {
  id: string
  name: string
  description: string
  teacherUserId: string
  createdAt: string
}

export type CreateClassInput = {
  name: string
  description?: string
}

export function listMyClasses(token: string): Promise<TeacherClass[]> {
  return request<TeacherClass[]>('/classes/mine', { token })
}

export function createClass(token: string, input: CreateClassInput): Promise<TeacherClass> {
  return request<TeacherClass>('/classes', {
    method: 'POST',
    token,
    body: input,
  })
}

/** GET /classes/:id/games — juegos ya asignados a esta clase; solo el profesor dueño. */
export function listClassGames(token: string, classId: string): Promise<GameSummary[]> {
  return request<GameSummary[]>(`/classes/${classId}/games`, { token })
}

/** POST /classes/:id/games — agrega un juego existente (de cualquier materia) a la clase. */
export function addGameToClass(token: string, classId: string, gameId: string): Promise<void> {
  return request<void>(`/classes/${classId}/games`, {
    method: 'POST',
    token,
    body: { gameId },
  })
}

/** DELETE /classes/:id/games/:gameId — quita el juego de la clase (no lo elimina del catálogo). */
export function removeGameFromClass(token: string, classId: string, gameId: string): Promise<void> {
  return request<void>(`/classes/${classId}/games/${gameId}`, { method: 'DELETE', token })
}
