import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { deactivateUser, listUsers, reactivateUser, updateUserRole } from '../../services/auth.service'
import type { AuthUser } from '../../services/auth.service'
import { ApiError } from '../../utils/http'
import { CreateUserForm } from './CreateUserForm'

const PAGE_SIZE = 10
const ROLES = ['STUDENT', 'TEACHER', 'ADMIN'] as const

export function AdminUsersSection() {
  const { token, user: currentUser } = useAuth()
  const [items, setItems] = useState<AuthUser[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [actionErrors, setActionErrors] = useState<Record<string, string>>({})
  const [pendingUserId, setPendingUserId] = useState<string | null>(null)

  const reload = useCallback(() => {
    if (!token) return
    setLoading(true)
    setError(null)
    listUsers(token, { page, pageSize: PAGE_SIZE })
      .then((result) => {
        setItems(result.items)
        setTotal(result.total)
      })
      .catch((err: unknown) => {
        setError(
          err instanceof ApiError ? err.message : 'No se pudo cargar la lista de usuarios.',
        )
      })
      .finally(() => setLoading(false))
  }, [token, page])

  useEffect(() => {
    reload()
  }, [reload])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  function clearActionError(userId: string) {
    setActionErrors((current) => {
      if (!(userId in current)) return current
      const next = { ...current }
      delete next[userId]
      return next
    })
  }

  async function handleToggleActive(targetUser: AuthUser) {
    if (!token) return
    setPendingUserId(targetUser.id)
    clearActionError(targetUser.id)
    try {
      const updated = targetUser.isActive
        ? await deactivateUser(token, targetUser.id)
        : await reactivateUser(token, targetUser.id)
      setItems((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      )
    } catch (err) {
      setActionErrors((current) => ({
        ...current,
        [targetUser.id]:
          err instanceof ApiError ? err.message : 'No se pudo actualizar el estado del usuario.',
      }))
    } finally {
      setPendingUserId(null)
    }
  }

  async function handleRoleChange(targetUser: AuthUser, role: string) {
    if (!token || role === targetUser.role) return
    setPendingUserId(targetUser.id)
    clearActionError(targetUser.id)
    try {
      const updated = await updateUserRole(token, targetUser.id, role)
      setItems((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      )
    } catch (err) {
      setActionErrors((current) => ({
        ...current,
        [targetUser.id]:
          err instanceof ApiError ? err.message : 'No se pudo cambiar el rol del usuario.',
      }))
    } finally {
      setPendingUserId(null)
    }
  }

  return (
    <section>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 className="mb-1 text-[22px] tracking-tight text-text-h">Usuarios</h2>
          <p className="text-[14px] text-text">
            {total} {total === 1 ? 'usuario registrado' : 'usuarios registrados'} en la
            plataforma.
          </p>
        </div>
        {!showCreateForm && (
          <button
            type="button"
            className="shrink-0 rounded-lg px-3.5 py-2 text-[13px] font-semibold text-white shadow-[0_8px_20px_-8px_var(--accent)] transition-transform hover:-translate-y-0.5"
            style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))' }}
            onClick={() => setShowCreateForm(true)}
          >
            + Crear usuario
          </button>
        )}
      </div>

      {showCreateForm && (
        <CreateUserForm
          onCreated={() => {
            setShowCreateForm(false)
            // Si ya se estaba en la página 1, este setState no dispara el
            // efecto de recarga por sí solo, así que se fuerza explícito.
            setPage(1)
            reload()
          }}
          onCancel={() => setShowCreateForm(false)}
        />
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
              <th className="px-4 py-3 font-medium">Nombre</th>
              <th className="px-4 py-3 font-medium">Correo</th>
              <th className="px-4 py-3 font-medium">Rol</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-4 py-6 text-center text-text" colSpan={5}>
                  Cargando…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-center text-text" colSpan={5}>
                  No hay usuarios para mostrar.
                </td>
              </tr>
            ) : (
              items.map((item) => {
                const isSelf = item.id === currentUser?.id
                const isPending = pendingUserId === item.id
                const actionError = actionErrors[item.id]
                return (
                  <tr key={item.id} className="border-t border-border align-top">
                    <td className="px-4 py-3 text-text-h">{item.displayName}</td>
                    <td className="px-4 py-3 text-text">{item.email}</td>
                    <td className="px-4 py-3 text-text">
                      <select
                        aria-label={`Rol de ${item.displayName}`}
                        value={item.role}
                        disabled={isSelf || isPending}
                        onChange={(event) => handleRoleChange(item, event.target.value)}
                        className="rounded-lg border border-border bg-bg px-2.5 py-1.5 text-[12.5px] text-text-h outline-none focus:border-accent disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {ROLES.map((roleOption) => (
                          <option key={roleOption} value={roleOption}>
                            {roleOption}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-[12px] font-medium ${
                          item.isActive
                            ? 'bg-accent/10 text-accent'
                            : 'bg-danger/10 text-danger'
                        }`}
                      >
                        {item.isActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        className="rounded-lg border border-border px-3 py-1.5 text-[12.5px] font-medium text-text-h disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={isSelf || isPending}
                        title={isSelf ? 'No puedes desactivar tu propia cuenta.' : undefined}
                        onClick={() => handleToggleActive(item)}
                      >
                        {isPending ? 'Procesando…' : item.isActive ? 'Desactivar' : 'Reactivar'}
                      </button>
                      {actionError && (
                        <p className="mt-1 max-w-[220px] text-[12px] text-danger" role="alert">
                          {actionError}
                        </p>
                      )}
                    </td>
                  </tr>
                )
              })
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
