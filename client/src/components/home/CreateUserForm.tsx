import { useState } from 'react'
import type { FormEvent } from 'react'
import { TextField } from '../TextField'
import { useAuth } from '../../hooks/useAuth'
import { createUser } from '../../services/auth.service'
import { ApiError } from '../../utils/http'
import { validateEmail, validateNewPassword, validateRequiredName } from '../../utils/validation'

const ROLES = ['STUDENT', 'TEACHER', 'ADMIN'] as const

type CreateUserFormProps = {
  onCreated: () => void
  onCancel: () => void
}

export function CreateUserForm({ onCreated, onCancel }: CreateUserFormProps) {
  const { token } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [role, setRole] = useState<(typeof ROLES)[number]>('STUDENT')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!token) return

    const validationError =
      validateEmail(email) ??
      validateNewPassword(password) ??
      validateRequiredName(firstName, 'El nombre') ??
      validateRequiredName(lastName, 'El apellido')
    if (validationError) {
      setError(validationError)
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      await createUser(token, { email, password, firstName, lastName, role })
      onCreated()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo crear el usuario.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form
      className="mb-6 flex flex-col gap-[14px] rounded-xl border border-border bg-code-bg p-5"
      onSubmit={handleSubmit}
      noValidate
    >
      <div className="grid grid-cols-2 gap-[14px]">
        <TextField
          label="Nombre"
          type="text"
          value={firstName}
          disabled={submitting}
          onChange={setFirstName}
          onBlur={() => {}}
        />
        <TextField
          label="Apellido"
          type="text"
          value={lastName}
          disabled={submitting}
          onChange={setLastName}
          onBlur={() => {}}
        />
      </div>

      <TextField
        label="Correo"
        type="email"
        value={email}
        disabled={submitting}
        onChange={setEmail}
        onBlur={() => {}}
      />

      <TextField
        label="Contraseña temporal"
        type="password"
        value={password}
        disabled={submitting}
        onChange={setPassword}
        onBlur={() => {}}
      />

      <div className="flex flex-col gap-[7px]">
        <label className="text-sm font-medium text-text-h" htmlFor="create-user-role">
          Rol
        </label>
        <select
          id="create-user-role"
          value={role}
          disabled={submitting}
          onChange={(event) => setRole(event.target.value as (typeof ROLES)[number])}
          className="rounded-lg border border-border bg-bg px-[13px] py-[11px] text-[15px] text-text-h outline-none focus:border-accent"
        >
          {ROLES.map((roleOption) => (
            <option key={roleOption} value={roleOption}>
              {roleOption}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <p
          className="rounded-lg border border-danger/35 bg-danger/10 px-[13px] py-[11px] text-sm leading-snug text-danger"
          role="alert"
        >
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          className="rounded-lg px-4 py-2.5 text-[14px] font-semibold text-white shadow-[0_8px_20px_-8px_var(--accent)] transition-[transform,opacity] hover:not-disabled:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))' }}
          disabled={submitting}
        >
          {submitting ? 'Creando…' : 'Crear usuario'}
        </button>
        <button
          type="button"
          className="rounded-lg border border-border px-4 py-2.5 text-[14px] font-medium text-text-h"
          disabled={submitting}
          onClick={onCancel}
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}
