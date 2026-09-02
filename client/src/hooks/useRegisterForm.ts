import { useCallback, useState } from 'react'
import type { FormEvent } from 'react'
import { useAuth } from './useAuth'
import { ApiError } from '../utils/http'
import { validateEmail, validateNewPassword, validateRequiredName } from '../utils/validation'

type Field = 'email' | 'password' | 'firstName' | 'lastName' | 'middleName'

type FormState = Record<Field, string>
type FieldErrors = Partial<Record<Field, string>>

const VALIDATORS: Record<Field, (value: string) => string | null> = {
  email: validateEmail,
  password: validateNewPassword,
  firstName: (value) => validateRequiredName(value, 'El nombre'),
  lastName: (value) => validateRequiredName(value, 'El apellido'),
  middleName: () => null,
}

/** Estado, validación y envío del formulario de registro. */
export function useRegisterForm() {
  const { signUp } = useAuth()
  const [values, setValues] = useState<FormState>({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    middleName: '',
  })
  const [errors, setErrors] = useState<FieldErrors>({})
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleChange = useCallback(
    (field: Field, value: string) => {
      setValues((current) => ({ ...current, [field]: value }))
      setSubmitError(null)
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

      setTouched({
        email: true,
        password: true,
        firstName: true,
        lastName: true,
        middleName: true,
      })
      setErrors(nextErrors)
      setSubmitError(null)
      if (Object.keys(nextErrors).length > 0) return

      setSubmitting(true)
      try {
        await signUp({
          email: values.email,
          password: values.password,
          firstName: values.firstName,
          lastName: values.lastName,
          middleName: values.middleName || undefined,
        })
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
    [signUp, submitting, values],
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
