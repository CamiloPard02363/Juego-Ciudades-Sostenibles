import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, X } from 'lucide-react'
import { TextField } from '../TextField'
import { useAuth } from '../../hooks/useAuth'
import { ApiError } from '../../utils/http'
import { validateRequiredName } from '../../utils/validation'
import { getEmailDomain, isPublicEmailProviderDomain } from '../../utils/publicEmailProviders'
import {
  createOrganization,
  listMyOrganizations,
  type OrganizationWithMyRole,
} from '../../services/organization.service'
import { Modal } from './games/Modal'

type ProfileSettingsProps = {
  onClose: () => void
}

/** Colores del pill por rol de organización — mismo criterio que el pill de estado en AdminUsersSection. */
const ORG_ROLE_STYLES: Record<string, string> = {
  ADMIN: 'bg-accent/10 text-accent',
  TEACHER: 'bg-accent-2/10 text-accent-2',
  STUDENT: 'bg-code-bg text-text-h',
}

export function ProfileSettings({ onClose }: ProfileSettingsProps) {
  const { user, token, updateProfile } = useAuth()
  const navigate = useNavigate()

  const [firstName, setFirstName] = useState(user?.firstName ?? '')
  const [lastName, setLastName] = useState(user?.lastName ?? '')
  const [middleName, setMiddleName] = useState(user?.middleName ?? '')
  const [displayName, setDisplayName] = useState(user?.displayName ?? '')
  const [errors, setErrors] = useState<{ firstName?: string; lastName?: string }>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [organizations, setOrganizations] = useState<OrganizationWithMyRole[]>([])
  const [loadingOrganizations, setLoadingOrganizations] = useState(true)
  const [foundingOrganization, setFoundingOrganization] = useState(false)
  const [foundingError, setFoundingError] = useState<string | null>(null)
  const [founded, setFounded] = useState(false)

  useEffect(() => {
    if (!token) return
    setLoadingOrganizations(true)
    listMyOrganizations(token)
      .then((items) => setOrganizations(items))
      .catch(() => {})
      .finally(() => setLoadingOrganizations(false))
  }, [token])

  if (!user) return null

  const emailDomain = getEmailDomain(user.email)
  // Si el dominio ya pertenece a alguna de las organizaciones del usuario, no
  // tiene sentido ofrecerle "fundarla" — ya está adentro (ver punto 1 del
  // issue #34). El banner solo aparece para quien no pertenece a ninguna.
  const canFoundOrganization =
    !loadingOrganizations &&
    organizations.length === 0 &&
    Boolean(emailDomain) &&
    !isPublicEmailProviderDomain(emailDomain)

  async function handleFoundOrganization() {
    if (!token || !emailDomain) return
    setFoundingOrganization(true)
    setFoundingError(null)
    try {
      await createOrganization(token, { name: emailDomain, domain: emailDomain })
      setFounded(true)
      const items = await listMyOrganizations(token)
      setOrganizations(items)
    } catch (err) {
      setFoundingError(
        err instanceof ApiError ? err.message : 'No se pudo crear la organización.',
      )
    } finally {
      setFoundingOrganization(false)
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSuccessMessage(null)
    setSubmitError(null)

    const nextErrors = {
      firstName: validateRequiredName(firstName, 'El nombre') ?? undefined,
      lastName: validateRequiredName(lastName, 'El apellido') ?? undefined,
    }
    setErrors(nextErrors)
    if (nextErrors.firstName || nextErrors.lastName) return

    setSubmitting(true)
    try {
      await updateProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        middleName: middleName.trim() || null,
        displayName: displayName.trim() || undefined,
      })
      setSuccessMessage('Perfil actualizado correctamente.')
    } catch (error) {
      setSubmitError(
        error instanceof ApiError
          ? error.message
          : 'Ocurrió un error inesperado. Intenta de nuevo.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal onClose={onClose} maxWidthClassName="max-w-[520px]">
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h2 className="mb-1 text-[22px] tracking-tight text-text-h">Configuración</h2>
          <p className="text-[14px] text-text">Actualiza los datos de tu perfil en NexusPlay.</p>
        </div>
        <button
          type="button"
          aria-label="Cerrar"
          className="shrink-0 rounded-lg p-1.5 text-text transition-colors hover:bg-code-bg hover:text-text-h"
          onClick={onClose}
        >
          <X className="h-5 w-5" strokeWidth={2} />
        </button>
      </div>

      {/* Badge de rol global (STUDENT/TEACHER/ADMIN de plataforma), separado
          de los badges de rol de organización de abajo — no se mezclan
          porque son ejes ortogonales (ver organization-role.vo.ts). */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-code-bg px-2.5 py-1 text-[12px] font-medium text-text-h">
          {user.role}
        </span>
        {organizations.map((org) => (
          <span
            key={org.id}
            className={`rounded-full px-2.5 py-1 text-[12px] font-medium ${
              ORG_ROLE_STYLES[org.myOrgRole] ?? 'bg-code-bg text-text-h'
            }`}
          >
            {org.myOrgRole} de {org.name}
          </span>
        ))}
      </div>

      {canFoundOrganization && !founded && (
        <div className="mb-6 flex flex-col gap-3 rounded-xl border border-dashed border-accent/40 bg-accent/5 p-4">
          <div className="flex items-start gap-3">
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white"
              style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))' }}
              aria-hidden="true"
            >
              <Building2 className="h-[18px] w-[18px]" strokeWidth={2} />
            </span>
            <div>
              <p className="text-[13.5px] font-semibold text-text-h">
                Nadie ha registrado a tu institución aún.
              </p>
              <p className="mt-0.5 text-[12.5px] leading-snug text-text">
                ¿Quieres ser su administrador? Fundarás la organización de "{emailDomain}" y
                podrás gestionar a sus miembros desde el panel de organización.
              </p>
            </div>
          </div>
          {foundingError && (
            <p className="text-[12.5px] text-danger" role="alert">
              {foundingError}
            </p>
          )}
          <button
            type="button"
            className="self-start rounded-lg px-3.5 py-2 text-[13px] font-semibold text-white shadow-[0_8px_20px_-8px_var(--accent)] disabled:cursor-not-allowed disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))' }}
            onClick={handleFoundOrganization}
            disabled={foundingOrganization}
          >
            {foundingOrganization ? 'Creando…' : 'Fundar organización'}
          </button>
        </div>
      )}

      {founded && (
        <div className="mb-6 rounded-xl border border-accent/35 bg-accent/10 p-4">
          <p className="mb-2 text-[13.5px] leading-snug text-text-h">
            Organización creada. Ya eres su administrador.
          </p>
          <button
            type="button"
            className="rounded-lg border border-border px-3.5 py-2 text-[13px] font-medium text-text-h"
            onClick={() => {
              onClose()
              navigate('/organizacion')
            }}
          >
            Ir al panel de organización
          </button>
        </div>
      )}

      <form className="flex flex-col gap-[18px]" onSubmit={handleSubmit} noValidate>
        <div className="grid grid-cols-2 gap-[14px]">
          <TextField
            label="Nombre"
            type="text"
            value={firstName}
            error={errors.firstName}
            disabled={submitting}
            onChange={setFirstName}
            onBlur={() => {}}
          />
          <TextField
            label="Apellido"
            type="text"
            value={lastName}
            error={errors.lastName}
            disabled={submitting}
            onChange={setLastName}
            onBlur={() => {}}
          />
        </div>

        <TextField
          label="Segundo nombre (opcional)"
          type="text"
          value={middleName}
          disabled={submitting}
          onChange={setMiddleName}
          onBlur={() => {}}
        />

        <TextField
          label="Nombre visible"
          type="text"
          value={displayName}
          disabled={submitting}
          onChange={setDisplayName}
          onBlur={() => {}}
        />

        {submitError && (
          <p
            className="rounded-lg border border-danger/35 bg-danger/10 px-[13px] py-[11px] text-sm leading-snug text-danger"
            role="alert"
          >
            {submitError}
          </p>
        )}

        {successMessage && (
          <p
            className="rounded-lg border border-accent/35 bg-accent/10 px-[13px] py-[11px] text-sm leading-snug text-accent"
            role="status"
          >
            {successMessage}
          </p>
        )}

        <button
          className="self-start rounded-lg px-4 py-2.5 text-[14px] font-semibold text-white shadow-[0_8px_20px_-8px_var(--accent)] transition-[transform,opacity] hover:not-disabled:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))' }}
          type="submit"
          disabled={submitting}
        >
          {submitting ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </form>
    </Modal>
  )
}
