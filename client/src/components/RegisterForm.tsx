import { useState } from 'react'
import { TextField } from './TextField'
import { useRegisterForm } from '../hooks/useRegisterForm'

export function RegisterForm() {
  const {
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
  } = useRegisterForm()
  const [showPassword, setShowPassword] = useState(false)

  return (
    <>
      <div className="mb-4 flex items-center gap-2" aria-hidden="true">
        <span
          className="h-1.5 flex-1 rounded-full"
          style={{ background: 'var(--accent)' }}
        />
        <span
          className="h-1.5 flex-1 rounded-full"
          style={{ background: step === 2 ? 'var(--accent)' : 'var(--border)' }}
        />
      </div>

      {step === 1 ? (
        <form className="flex flex-col gap-[18px]" onSubmit={handleNextStep} noValidate>
          <div className="grid grid-cols-2 gap-[14px]">
            <TextField
              label="Nombre"
              type="text"
              value={values.firstName}
              error={errors.firstName}
              placeholder="Ana"
              autoComplete="given-name"
              disabled={submitting}
              autoFocus
              onChange={(value) => handleChange('firstName', value)}
              onBlur={(value) => handleBlur('firstName', value)}
            />
            <TextField
              label="Apellido"
              type="text"
              value={values.lastName}
              error={errors.lastName}
              placeholder="García"
              autoComplete="family-name"
              disabled={submitting}
              onChange={(value) => handleChange('lastName', value)}
              onBlur={(value) => handleBlur('lastName', value)}
            />
          </div>

          <TextField
            label="Segundo nombre (opcional)"
            type="text"
            value={values.middleName}
            error={errors.middleName}
            placeholder="María"
            autoComplete="additional-name"
            disabled={submitting}
            onChange={(value) => handleChange('middleName', value)}
            onBlur={(value) => handleBlur('middleName', value)}
          />

          <TextField
            label="Fecha de nacimiento"
            type="date"
            value={values.birthDate}
            error={errors.birthDate}
            max={new Date().toISOString().slice(0, 10)}
            disabled={submitting}
            onChange={(value) => handleChange('birthDate', value)}
            onBlur={(value) => handleBlur('birthDate', value)}
          />

          <button
            className="mt-1 rounded-lg px-4 py-3 text-[15px] font-semibold text-white shadow-[0_8px_20px_-8px_var(--accent)] transition-[transform,opacity] hover:not-disabled:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))' }}
            type="submit"
          >
            Continuar
          </button>
        </form>
      ) : (
        <form className="flex flex-col gap-[18px]" onSubmit={handleSubmit} noValidate>
          <TextField
            label="Correo electrónico"
            type="email"
            value={values.email}
            error={errors.email}
            placeholder="tucorreo@ejemplo.com"
            autoComplete="email"
            disabled={submitting}
            autoFocus
            onChange={(value) => handleChange('email', value)}
            onBlur={(value) => handleBlur('email', value)}
          />

          <TextField
            label="Contraseña"
            type={showPassword ? 'text' : 'password'}
            value={values.password}
            error={errors.password}
            placeholder="Mínimo 8 caracteres"
            autoComplete="new-password"
            disabled={submitting}
            onChange={(value) => handleChange('password', value)}
            onBlur={(value) => handleBlur('password', value)}
            action={
              <button
                type="button"
                className="mr-1.5 shrink-0 rounded-md px-2.5 py-1.5 text-[13px] font-medium text-accent hover:bg-accent/10"
                aria-pressed={showPassword}
                onClick={() => setShowPassword((current) => !current)}
              >
                {showPassword ? 'Ocultar' : 'Mostrar'}
              </button>
            }
          />

          {submitError && (
            <p
              className="rounded-lg border border-danger/35 bg-danger/10 px-[13px] py-[11px] text-sm leading-snug text-danger"
              role="alert"
            >
              {submitError}
            </p>
          )}

          <div className="flex gap-[10px]">
            <button
              type="button"
              className="rounded-lg border border-border px-4 py-3 text-[15px] font-semibold text-text-h transition-colors hover:bg-code-bg disabled:cursor-not-allowed disabled:opacity-60"
              onClick={handleBackStep}
              disabled={submitting}
            >
              Atrás
            </button>
            <button
              className="flex-1 rounded-lg px-4 py-3 text-[15px] font-semibold text-white shadow-[0_8px_20px_-8px_var(--accent)] transition-[transform,opacity] hover:not-disabled:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))' }}
              type="submit"
              disabled={submitting}
            >
              {submitting ? 'Creando cuenta…' : 'Crear cuenta'}
            </button>
          </div>
        </form>
      )}
    </>
  )
}
