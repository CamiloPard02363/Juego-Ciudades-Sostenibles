import type { OrganizationWithMyRole } from '../../../../services/organization.service'

type OrganizationSelectFieldProps = {
  organizations: OrganizationWithMyRole[]
  value: string
  disabled?: boolean
  onChange: (organizationId: string) => void
}

/**
 * Selector opcional de organización para los formularios de creación de
 * juego. Solo tiene sentido montarlo si `organizations` no está vacío — el
 * caller decide si renderizarlo (ver los 4 forms de `games/*Form.tsx`).
 */
export function OrganizationSelectField({
  organizations,
  value,
  disabled,
  onChange,
}: OrganizationSelectFieldProps) {
  if (organizations.length === 0) return null

  return (
    <div>
      <label className="mb-1.5 block text-[13px] font-medium text-text-h" htmlFor="game-organization">
        Organización (opcional)
      </label>
      <select
        id="game-organization"
        className="w-full rounded-lg border border-border bg-bg px-[13px] py-[11px] text-[15px] text-text-h outline-none focus:border-accent"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">Juego personal</option>
        {organizations.map((org) => (
          <option key={org.id} value={org.id}>
            {org.name}
          </option>
        ))}
      </select>
      <p className="mt-1.5 text-[12px] text-text">
        Si eliges una organización, el juego nace institucional: cualquier miembro puede usarlo.
      </p>
    </div>
  )
}
