import { useEffect, useState } from 'react'
import { useAuth } from '../../../hooks/useAuth'
import { getClassRanking, type ClassRanking } from '../../../services/metrics.service'

/**
 * Única responsabilidad: resolver el fetching + estado de carga/error del
 * ranking de una clase (issue #226, Home de clase). No sabe nada de cómo se
 * pinta la tabla ni el gráfico de pie — eso vive en los componentes que
 * consumen este hook.
 */
export function useClassRanking(classId: string) {
  const { token } = useAuth()
  const [ranking, setRanking] = useState<ClassRanking | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    setLoading(true)
    setError(null)
    getClassRanking(token, classId)
      .then(setRanking)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [token, classId])

  return { ranking, loading, error }
}
