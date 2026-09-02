import { useState } from 'react'
import type { FormEvent } from 'react'
import { TextField } from '../TextField'
import { useAuth } from '../../hooks/useAuth'
import { ApiError } from '../../utils/http'
import { validateRequiredName } from '../../utils/validation'

export function ProfileSettings() {
  const { user, updateProfile } = useAuth()

  const [firstName, setFirstName] = useState(user?.firstName ?? '')
  const [lastName, setLastName] = useState(user?.lastName ?? '')
  const [middleName, setMiddleName] = useState(user?.middleName ?? '')
  const [displayName, setDisplayName] = useState(user?.displayName ?? '')
  const [errors, setErrors] = useState<{ firstName?: string; lastName?: string }>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (!user) return null

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
    <section className="max-w-[520px]">
      <h2 className="mb-1 text-[22px] tracking-tight text-text-h">Configuración</h2>
      <p className="mb-6 text-[14px] text-text">
        Actualiza los datos de tu perfil en NexusPlay.
      </p>

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
          className="self-start rounded-lg bg-accent px-4 py-2.5 text-[14px] font-medium text-white transition-opacity hover:not-disabled:opacity-88 disabled:cursor-not-allowed disabled:opacity-60 dark:text-bg"
          type="submit"
          disabled={submitting}
        >
          {submitting ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </form>
    </section>
  )
}
