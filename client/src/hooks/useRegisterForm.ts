import { useCallback, useState } from 'react'
import type { FormEvent } from 'react'
import { useAuth } from './useAuth'
import { ApiError } from '../utils/http'
import {
  validateBirthDate,
  validateEmail,
  validateNewPassword,
  validateRequiredName,
} from '../utils/validation'

type Field = 'email' | 'password' | 'firstName' | 'lastName' | 'middleName' | 'birthDate'

type FormState = Record<Field, string>
type FieldErrors = Partial<Record<Field, string>>

// El formulario se divide en 2 pasos para que cada pantalla quepa sin scroll
// (6 campos en una sola card obligaban a scrollear la card en pantallas
// comunes de laptop).
const STEP_1_FIELDS: Field[] = ['firstName', 'lastName', 'middleName', 'birthDate']
const STEP_2_FIELDS: Field[] = ['email', 'password']

const VALIDATORS: Record<Field, (value: string) => string | null> = {
  email: validateEmail,
  password: validateNewPassword,
  firstName: (value) => validateRequiredName(value, 'El nombre'),
  lastName: (value) => validateRequiredName(value, 'El apellido'),
  middleName: () => null,
  birthDate: validateBirthDate,
}

/** Estado, validación y envío del formulario de registro, en 2 pasos. */
export function useRegisterForm() {
  const { signUp } = useAuth()
  const [step, setStep] = useState<1 | 2>(1)
  const [values, setValues] = useState<FormState>({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    middleName: '',
    birthDate: '',
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

  const handleNextStep = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()

      const nextErrors: FieldErrors = {}
      for (const field of STEP_1_FIELDS) {
        const error = VALIDATORS[field](values[field])
        if (error) nextErrors[field] = error
      }

      setTouched((current) => ({
        ...current,
        firstName: true,
        lastName: true,
        middleName: true,
        birthDate: true,
      }))
      setErrors((current) => ({ ...current, ...nextErrors }))
      if (Object.keys(nextErrors).length > 0) return

      setStep(2)
    },
    [values],
  )

  const handleBackStep = useCallback(() => {
    setStep(1)
  }, [])

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      if (submitting) return

      const nextErrors: FieldErrors = {}
      for (const field of STEP_2_FIELDS) {
        const error = VALIDATORS[field](values[field])
        if (error) nextErrors[field] = error
      }

      setTouched((current) => ({ ...current, email: true, password: true }))
      setErrors((current) => ({ ...current, ...nextErrors }))
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
          birthDate: values.birthDate,
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
    step,
    values,
    errors,
    submitError,
    submitting,
    handleChange,
    handleBlur,
    handleNextStep,
    handleBackStep,
    handleSubmit,
  }
}
