import { useId } from 'react'
import type { ReactNode } from 'react'

type TextFieldProps = {
  label: string
  type: 'text' | 'email' | 'password'
  value: string
  error?: string
  autoComplete?: string
  placeholder?: string
  disabled?: boolean
  autoFocus?: boolean
  onChange: (value: string) => void
  onBlur: (value: string) => void
  /** Contenido opcional al final del campo, p. ej. mostrar/ocultar clave. */
  action?: ReactNode
}

export function TextField({
  label,
  type,
  value,
  error,
  autoComplete,
  placeholder,
  disabled,
  autoFocus,
  onChange,
  onBlur,
  action,
}: TextFieldProps) {
  const id = useId()
  const errorId = `${id}-error`

  return (
    <div className="flex flex-col gap-[7px]">
      <label className="text-sm font-medium text-text-h" htmlFor={id}>
        {label}
      </label>
      <div
        className={`flex items-center rounded-lg border bg-bg transition-[border-color,box-shadow] ${
          error
            ? 'border-danger focus-within:ring-3 focus-within:ring-danger/15'
            : 'border-border focus-within:border-accent focus-within:ring-3 focus-within:ring-accent/10'
        }`}
      >
        <input
          id={id}
          type={type}
          value={value}
          placeholder={placeholder}
          autoComplete={autoComplete}
          disabled={disabled}
          autoFocus={autoFocus}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          onChange={(event) => onChange(event.target.value)}
          onBlur={(event) => onBlur(event.target.value)}
          className="min-w-0 flex-1 bg-transparent px-[13px] py-[11px] text-[15px] leading-normal text-text-h placeholder:text-text/60 outline-none disabled:cursor-not-allowed disabled:opacity-60"
        />
        {action}
      </div>
      {error && (
        <p className="text-[13px] leading-tight text-danger" id={errorId}>
          {error}
        </p>
      )}
    </div>
  )
}
