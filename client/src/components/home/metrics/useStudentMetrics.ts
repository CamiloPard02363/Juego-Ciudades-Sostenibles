import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../../hooks/useAuth'
import { getMyMetrics, getStudentMetrics, type StudentMetrics } from '../../../services/metrics.service'

/**
 * Única responsabilidad: resolver el fetching de métricas de un estudiante.
 * Dos variantes, mismo shape de resultado (issue #226):
 * - `useMyMetrics()`: el estudiante autenticado ve las suyas.
 * - `useStudentMetrics(classId, studentUserId)`: un profesor/admin revisa el
 *   detalle de un estudiante puntual de una clase.
 * Separados en dos hooks (no uno con parámetros opcionales) porque difieren
 * en quién es el sujeto de la llamada — mezclarlos obligaría a condicionales
 * de "si me pasaron classId entonces..." dentro del mismo hook.
 */
export function useMyMetrics() {
  const { token } = useAuth()
  const [metrics, setMetrics] = useState<StudentMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(() => {
    if (!token) return
    setLoading(true)
    setError(null)
    getMyMetrics(token)
      .then(setMetrics)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [token])

  useEffect(() => {
    reload()
  }, [reload])

  return { metrics, loading, error, reload }
}

export function useStudentMetrics(classId: string, studentUserId: string) {
  const { token } = useAuth()
  const [metrics, setMetrics] = useState<StudentMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    setLoading(true)
    setError(null)
    getStudentMetrics(token, classId, studentUserId)
      .then(setMetrics)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [token, classId, studentUserId])

  return { metrics, loading, error }
}
