import { request } from '../utils/http'

export type AiProviderAttempt = {
  id: string
  provider: string
  operation: string
  succeeded: boolean
  usedFallback: boolean
  errorMessage: string | null
  latencyMs: number
  createdAt: string
}

export type PaginatedAiProviderAttempts = {
  items: AiProviderAttempt[]
  total: number
  page: number
  pageSize: number
}

/**
 * GET /admin/ai-provider-attempts — historial de fallback entre
 * proveedores de IA (issue #204), solo accesible para ADMIN.
 */
export function listAiProviderAttempts(
  token: string,
  params: { page?: number; pageSize?: number } = {},
): Promise<PaginatedAiProviderAttempts> {
  const query = new URLSearchParams()
  if (params.page) query.set('page', String(params.page))
  if (params.pageSize) query.set('pageSize', String(params.pageSize))

  const queryString = query.toString()
  return request<PaginatedAiProviderAttempts>(
    `/admin/ai-provider-attempts${queryString ? `?${queryString}` : ''}`,
    { token },
  )
}
