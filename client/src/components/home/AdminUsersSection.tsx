import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { listUsers } from '../../services/auth.service'
import type { AuthUser } from '../../services/auth.service'
import { ApiError } from '../../utils/http'
import { CreateUserForm } from './CreateUserForm'

const PAGE_SIZE = 10

export function AdminUsersSection() {
  const { token } = useAuth()
  const [items, setItems] = useState<AuthUser[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)

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
            className="shrink-0 rounded-lg bg-accent px-3.5 py-2 text-[13px] font-medium text-white dark:text-bg"
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
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-4 py-6 text-center text-text" colSpan={4}>
                  Cargando…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-center text-text" colSpan={4}>
                  No hay usuarios para mostrar.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="border-t border-border">
                  <td className="px-4 py-3 text-text-h">{item.displayName}</td>
                  <td className="px-4 py-3 text-text">{item.email}</td>
                  <td className="px-4 py-3 text-text">{item.role}</td>
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
