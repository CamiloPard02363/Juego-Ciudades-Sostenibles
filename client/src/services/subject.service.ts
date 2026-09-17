import { request } from '../utils/http'

export type Subject = {
  id: string
  name: string
  slug: string
  parentSubjectId: string | null
  creatorUserId: string | null
  status: 'PRIVATE' | 'PUBLIC'
  createdAt: string
}

export type SubjectWithGameCount = Subject & {
  gameCount: number
}

/** GET /subjects — materias públicas + las privadas propias, con conteo de juegos publicados. */
export function listSubjects(token: string): Promise<SubjectWithGameCount[]> {
  return request<SubjectWithGameCount[]>('/subjects', { token })
}

/** POST /subjects — crea una sub-materia bajo `parentSubjectId`; nace privada. */
export function createSubject(
  token: string,
  name: string,
  parentSubjectId: string,
): Promise<Subject> {
  return request<Subject>('/subjects', {
    method: 'POST',
    token,
    body: { name, parentSubjectId },
  })
}

export type PublishSubjectResult = Subject & {
  /** Juegos que estaban en borrador y pasaron a publicados por la cascada. */
  gamesPublished: number
}

/**
 * POST /subjects/:id/publish — irreversible: solo el creador o un admin.
 * Publica en cascada todos los juegos en borrador de esta materia.
 */
export function publishSubject(token: string, subjectId: string): Promise<PublishSubjectResult> {
  return request<PublishSubjectResult>(`/subjects/${subjectId}/publish`, { method: 'POST', token })
}

/** DELETE /subjects/:id — soft-delete, solo si sigue privada. */
export function deleteSubject(token: string, subjectId: string): Promise<void> {
  return request<void>(`/subjects/${subjectId}`, { method: 'DELETE', token })
}
