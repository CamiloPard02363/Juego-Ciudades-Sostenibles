import { request } from '../utils/http'

export type ClassRankingEntry = {
  studentUserId: string
  displayName: string | null
  totalScore: number
  gamesPlayed: number
  rank: number
}

export type ClassRanking = {
  classId: string
  entries: ClassRankingEntry[]
  topForPieChart: ClassRankingEntry[]
}

/** GET /classes/:id/metrics/ranking — Home de clase (issue #226): ranking + datos del gráfico de pie. */
export function getClassRanking(token: string, classId: string): Promise<ClassRanking> {
  return request<ClassRanking>(`/classes/${classId}/metrics/ranking`, { token })
}

export type GameMetric = {
  gameId: string
  gameTitle: string
  totalScore: number
  correctCount: number
  incorrectCount: number
  accuracy: number
  timePlayedMs: number
  attempts: number
  lastPlayedAt: string
}

export type SubjectMetric = {
  subjectId: string
  subjectName: string
  totalScore: number
  correctCount: number
  incorrectCount: number
  accuracy: number
  timePlayedMs: number
  attempts: number
}

export type ScoreOverTimePoint = {
  date: string
  totalScore: number
  attempts: number
}

export type StudentMetrics = {
  studentUserId: string
  byGame: GameMetric[]
  bySubject: SubjectMetric[]
  scoreOverTime: ScoreOverTimePoint[]
}

/** GET /me/metrics — vista propia de métricas del estudiante autenticado (issue #226). */
export function getMyMetrics(token: string): Promise<StudentMetrics> {
  return request<StudentMetrics>('/me/metrics', { token })
}

/** GET /classes/:id/students/:studentId/metrics — detalle de un estudiante, visto por su profesor/admin. */
export function getStudentMetrics(
  token: string,
  classId: string,
  studentUserId: string,
): Promise<StudentMetrics> {
  return request<StudentMetrics>(`/classes/${classId}/students/${studentUserId}/metrics`, {
    token,
  })
}

export type RecordGamePlayResultInput = {
  gameId: string
  gameTitle: string
  classId?: string
  subjectId?: string
  subjectName?: string
  score: number
  correctCount: number
  incorrectCount: number
  timePlayedMs: number
}

/** POST /me/game-results — registra el resultado de una partida recién jugada (issue #226). */
export function recordGamePlayResult(
  token: string,
  input: RecordGamePlayResultInput,
): Promise<void> {
  return request<void>('/me/game-results', { method: 'POST', token, body: input })
}
