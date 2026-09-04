import { useCallback, useState } from 'react'
import type { FormEvent } from 'react'
import { useAuth } from './useAuth'
import { ApiError } from '../utils/http'
import { validateEmail, validatePassword } from '../utils/validation'

type Field = 'email' | 'password'

type FormState = Record<Field, string>
type FieldErrors = Partial<Record<Field, string>>

const VALIDATORS: Record<Field, (value: string) => string | null> = {
  email: validateEmail,
  password: validatePassword,
}

/** Estado, validación y envío del formulario de inicio de sesión. */
export function useLoginForm() {
  const { signIn } = useAuth()
  const [values, setValues] = useState<FormState>({ email: '', password: '' })
  const [errors, setErrors] = useState<FieldErrors>({})
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleChange = useCallback(
    (field: Field, value: string) => {
      setValues((current) => ({ ...current, [field]: value }))
      setSubmitError(null)
      // Solo se revalida en vivo un campo que el usuario ya visitó,
      // para no mostrarle errores mientras aún está escribiendo.
      if (touched[field]) {
        setErrors((current) => ({
          ...current,
          [field]: VALIDATORS[field](value) ?? undefined,
        }))
      }
    },
    [touched],
  )

  const handleBlur = useCallback((field: Field, value: string) => {
    setTouched((current) => ({ ...current, [field]: true }))
    setErrors((current) => ({
      ...current,
      [field]: VALIDATORS[field](value) ?? undefined,
    }))
  }, [])

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      if (submitting) return

      const nextErrors: FieldErrors = {}
      for (const field of Object.keys(VALIDATORS) as Field[]) {
        const error = VALIDATORS[field](values[field])
        if (error) nextErrors[field] = error
      }

      setTouched({ email: true, password: true })
      setErrors(nextErrors)
      setSubmitError(null)
      if (Object.keys(nextErrors).length > 0) return

      setSubmitting(true)
      try {
        await signIn(values)
      } catch (error) {
        setSubmitError(
          error instanceof ApiError
            ? error.message
            : 'Ocurrió un error inesperado. Intenta de nuevo.',
        )
        setSubmitting(false)
      }
      // En caso de éxito no se restablece `submitting`: el componente se
      // desmonta al cambiar la vista a la sesión iniciada.
    },
    [signIn, submitting, values],
  )

  return {
    values,
    errors,
    submitError,
    submitting,
    handleChange,
    handleBlur,
    handleSubmit,
  }
}
