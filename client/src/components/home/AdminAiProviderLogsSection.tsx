import { useCallback, useEffect, useState } from 'react'
import { CheckCircle2, RefreshCw, XCircle } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { listAiProviderAttempts } from '../../services/ai-provider-log.service'
import type { AiProviderAttempt } from '../../services/ai-provider-log.service'
import { ApiError } from '../../utils/http'

const PAGE_SIZE = 20

const OPERATION_LABEL: Record<string, string> = {
  describeImage: 'Describir imagen',
  generateGameDraft: 'Generar borrador de juego',
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

/**
 * Panel de administración de IA (issue #204): historial de qué proveedor
 * respondió cada llamada del asistente de IA (Gemini primero, Groq como
 * respaldo automático — ver `AiProviderOrchestrator` en el servidor) para
 * que un ADMIN pueda notar caídas de Gemini sin acceso a logs del servidor.
 * Mismo patrón de tabla + paginación que `AdminUsersSection`.
 */
export function AdminAiProviderLogsSection() {
  const { token } = useAuth()
  const [items, setItems] = useState<AiProviderAttempt[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(() => {
    if (!token) return
    setLoading(true)
    setError(null)
    listAiProviderAttempts(token, { page, pageSize: PAGE_SIZE })
      .then((result) => {
        setItems(result.items)
        setTotal(result.total)
      })
      .catch((err: unknown) => {
        setError(
          err instanceof ApiError ? err.message : 'No se pudo cargar el historial de proveedores de IA.',
        )
      })
      .finally(() => setLoading(false))
  }, [token, page])

  useEffect(() => {
    reload()
  }, [reload])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const fallbackCount = items.filter((item) => item.usedFallback).length

  return (
    <section>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 className="mb-1 text-[22px] tracking-tight text-text-h">Proveedores de IA</h2>
          <p className="text-[14px] text-text">
            Historial de llamadas del asistente de IA. Gemini es el proveedor principal; si falla o
            agota su cuota, se usa Groq automáticamente como respaldo, sin que el usuario note nada
            más que una respuesta un poco más lenta.
          </p>
        </div>
        <button
          type="button"
          className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border px-3.5 py-2 text-[13px] font-medium text-text-h disabled:cursor-not-allowed disabled:opacity-50"
          onClick={reload}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} strokeWidth={2} />
          Actualizar
        </button>
      </div>

      {items.length > 0 && (
        <p className="mb-4 text-[13px] text-text">
          En esta página: {fallbackCount} de {items.length} llamada(s) se resolvieron con el proveedor
          de respaldo.
        </p>
      )}

      {error && (
        <p
          className="mb-4 rounded-lg border border-danger/35 bg-danger/10 px-[13px] py-[11px] text-sm leading-snug text-danger"
          role="alert"
        >
          {error}
        </p>
      )}

      <div className="overflow-hidden rounded-xl border border-border">
        <table className="w-full text-left text-[14px]">
          <thead className="bg-code-bg text-[12px] text-text">
            <tr>
              <th className="px-4 py-3 font-medium">Fecha</th>
              <th className="px-4 py-3 font-medium">Operación</th>
              <th className="px-4 py-3 font-medium">Proveedor</th>
              <th className="px-4 py-3 font-medium">Resultado</th>
              <th className="px-4 py-3 font-medium">Latencia</th>
              <th className="px-4 py-3 font-medium">Detalle</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-4 py-6 text-center text-text" colSpan={6}>
                  Cargando…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-center text-text" colSpan={6}>
                  Todavía no se ha usado el asistente de IA.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="border-t border-border align-top">
                  <td className="px-4 py-3 text-text">{formatDate(item.createdAt)}</td>
                  <td className="px-4 py-3 text-text">{OPERATION_LABEL[item.operation] ?? item.operation}</td>
                  <td className="px-4 py-3 text-text-h">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-surface px-2.5 py-1 text-[12.5px] font-medium capitalize">
                      {item.provider}
                      {item.usedFallback && (
                        <span
                          className="rounded-full bg-border px-1.5 py-0.5 text-[10.5px] font-medium text-text"
                          title="Este intento se resolvió con el proveedor de respaldo, no con el principal."
                        >
                          respaldo
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {item.succeeded ? (
                      <span className="flex items-center gap-1.5 text-[13px] font-medium text-accent">
                        <CheckCircle2 className="h-4 w-4" strokeWidth={2} />
                        Éxito
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-[13px] font-medium text-danger">
                        <XCircle className="h-4 w-4" strokeWidth={2} />
                        Falló
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-text">{item.latencyMs} ms</td>
                  <td className="px-4 py-3 max-w-[280px] text-[12.5px] text-text [overflow-wrap:anywhere]">
                    {item.errorMessage ?? '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-[13px] text-text">
          <span>
            Página {page} de {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded-lg border border-border px-3 py-1.5 font-medium text-text-h disabled:cursor-not-allowed disabled:opacity-50"
              disabled={page <= 1 || loading}
              onClick={() => setPage((current) => current - 1)}
            >
              Anterior
            </button>
            <button
              type="button"
              className="rounded-lg border border-border px-3 py-1.5 font-medium text-text-h disabled:cursor-not-allowed disabled:opacity-50"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((current) => current + 1)}
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
