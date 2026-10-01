import type { Organization } from '../../services/organization.service'

/**
 * Card de organización para el listado del ADMIN global (issue #226):
 * nombre, admin de la institución y su correo, más el estado
 * activo/inactivo y el botón de (des)activar que ya existía en la tabla
 * previa. `adminDisplayName`/`adminEmail` son `null` cuando la organización
 * todavía no tiene ningún miembro con `orgRole = ADMIN` (caso borde: org
 * recién creada por el ADMIN global a nombre de otra persona que aún no se
 * matricula).
 */
export function OrganizationCard({
  organization,
  adminDisplayName,
  adminEmail,
  onToggleActive,
  toggling,
  onOpen,
}: {
  organization: Organization
  adminDisplayName: string | null
  adminEmail: string | null
  onToggleActive: () => void
  toggling: boolean
  onOpen: () => void
}) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border p-5">
      <div className="flex items-start justify-between gap-2">
        <button type="button" onClick={onOpen} className="text-left hover:underline">
          <h4 className="text-[15px] font-semibold text-text-h">{organization.name}</h4>
          <p className="text-[12.5px] text-text">{organization.domain ?? 'Sin dominio institucional'}</p>
        </button>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-[11.5px] font-medium ${
            organization.isActive ? 'bg-accent/10 text-accent' : 'bg-danger/10 text-danger'
          }`}
        >
          {organization.isActive ? 'Activa' : 'Inactiva'}
        </span>
      </div>

      <div className="text-[13px] text-text">
        <p className="font-medium text-text-h">{adminDisplayName ?? 'Sin admin asignado'}</p>
        <p>{adminEmail ?? '—'}</p>
      </div>

      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onOpen}
          className="rounded-lg border border-border px-3 py-1.5 text-[12.5px] font-medium text-text-h hover:border-accent"
        >
          Entrar
        </button>
        <button
          type="button"
          className="rounded-lg border border-border px-3 py-1.5 text-[12px] font-medium text-text-h disabled:cursor-not-allowed disabled:opacity-50"
          disabled={toggling}
          onClick={onToggleActive}
        >
          {organization.isActive ? 'Desactivar' : 'Reactivar'}
        </button>
      </div>
    </div>
  )
}
