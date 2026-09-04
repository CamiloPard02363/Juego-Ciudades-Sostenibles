import { useState } from 'react'
import { TextField } from './TextField'
import { useLoginForm } from '../hooks/useLoginForm'

export function LoginForm() {
  const {
    values,
    errors,
    submitError,
    submitting,
    handleChange,
    handleBlur,
    handleSubmit,
  } = useLoginForm()
  const [showPassword, setShowPassword] = useState(false)

  return (
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
        placeholder="••••••••"
        autoComplete="current-password"
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

      <button
        className="mt-1 rounded-lg px-4 py-3 text-[15px] font-semibold text-white shadow-[0_8px_20px_-8px_var(--accent)] transition-[transform,opacity] hover:not-disabled:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
        style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))' }}
        type="submit"
        disabled={submitting}
      >
        {submitting ? 'Ingresando…' : 'Iniciar sesión'}
      </button>
    </form>
  )
}
