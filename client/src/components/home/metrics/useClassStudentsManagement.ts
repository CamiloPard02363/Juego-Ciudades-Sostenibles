import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../../hooks/useAuth'
import {
  getClassStudents,
  removeStudentFromClass,
  type EnrolledStudent,
} from '../../../services/class.service'

const PAGE_SIZE = 10

/**
 * Única responsabilidad: estudiantes matriculados de UNA clase (issue #226,
 * "Estudiantes de la clase") — búsqueda, paginado local y expulsión. Usa
 * `GET /classes/:id/students` (no `listMyClassesDetail`, que solo lista las
 * clases propias del profesor autenticado y rechaza a un admin de
 * institución viendo la clase de otro profesor — bug reportado tras el
 * primer corte de #226).
 */
export function useClassStudentsManagement(classId: string) {
  const { token } = useAuth()
  const [allStudents, setAllStudents] = useState<EnrolledStudent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const reload = useCallback(() => {
    if (!token) return
    setLoading(true)
    setError(null)
    getClassStudents(token, classId)
      .then((students) => setAllStudents(students))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [token, classId])

  useEffect(() => {
    reload()
  }, [reload])

  const filtered = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()
    if (!normalizedSearch) return allStudents
    return allStudents.filter(
      (student) =>
        student.displayName?.toLowerCase().includes(normalizedSearch) ||
        student.email?.toLowerCase().includes(normalizedSearch),
    )
  }, [allStudents, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const setSearchAndResetPage = useCallback((value: string) => {
    setSearch(value)
    setPage(1)
  }, [])

  const removeStudent = useCallback(
    async (studentUserId: string) => {
      if (!token) return
      await removeStudentFromClass(token, classId, studentUserId)
      setAllStudents((prev) => prev.filter((student) => student.userId !== studentUserId))
    },
    [token, classId],
  )

  return {
    students: paginated,
    total: filtered.length,
    page,
    totalPages,
    setPage,
    search,
    setSearch: setSearchAndResetPage,
    loading,
    error,
    removeStudent,
  }
}
