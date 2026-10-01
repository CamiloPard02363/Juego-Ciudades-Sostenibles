import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Zap } from 'lucide-react'
import { TextField } from './TextField'
import { ThemeToggle } from './ThemeToggle'
import { useAuth } from '../hooks/useAuth'
import { acceptInvitation, getInvitationByToken, type InvitationPreview } from '../services/invitation.service'
import { ApiError } from '../utils/http'

/**
 * `GET /invitaciones/:token` (issue #232): el estudiante invitado abre este
 * link (copiado y distribuido manualmente por el admin/profesor — MVP sin
 * envío de email real), completa su propio registro definiendo contraseña, y
 * queda matriculado automáticamente en la organización/clase que originó la
 * invitación. Sin `JwtAuthGuard` detrás: quien llega aquí todavía no tiene
 * cuenta.
 */
export function AcceptInvitationPage() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const { applyInvitationSession } = useAuth()

  const [preview, setPreview] = useState<InvitationPreview | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!token) return
    setLoading(true)
    getInvitationByToken(token)
      .then(setPreview)
      .catch((err: unknown) => {
        setLoadError(
          err instanceof ApiError ? err.message : 'No se pudo cargar la invitación.',
        )
      })
      .finally(() => setLoading(false))
  }, [token])

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!token) return
    setSubmitError(null)

    if (password.length < 8) {
      setSubmitError('La contraseña debe tener al menos 8 caracteres.')
      return
    }

    setSubmitting(true)
    try {
      const { accessToken, user } = await acceptInvitation(token, { plainPassword: password })
      applyInvitationSession(accessToken, user)
      navigate('/', { replace: true })
    } catch (err) {
      setSubmitError(
        err instanceof ApiError ? err.message : 'No se pudo completar el registro.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="relative flex h-svh max-h-svh min-h-0 flex-col items-center justify-center gap-3 overflow-hidden p-5 sm:p-8">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 15% 20%, color-mix(in srgb, var(--accent) 22%, transparent), transparent 55%), radial-gradient(circle at 85% 80%, color-mix(in srgb, var(--accent-2) 18%, transparent), transparent 50%)',
        }}
      />

      <div className="absolute top-5 right-5 sm:top-8 sm:right-8">
        <ThemeToggle />
      </div>

      <div
        className="relative w-full max-w-[420px] rounded-2xl border border-border bg-surface p-6 text-left shadow-[var(--shadow)] sm:p-8"
        style={{ boxShadow: 'var(--shadow), var(--glow)' }}
      >
        <header className="mb-5 text-center">
          <span
            className="inline-flex h-13 w-13 items-center justify-center rounded-2xl text-white"
            style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))' }}
            aria-hidden="true"
          >
            <Zap className="h-6 w-6" fill="currentColor" strokeWidth={0} />
          </span>
          <h1 className="mt-3 mb-1.5 text-[26px] tracking-tight text-text-h">Completa tu registro</h1>
          <p className="text-[15px]">Te invitaron a unirte a NexusPlay.</p>
        </header>

        {loading ? (
          <p className="text-center text-[14px] text-text">Cargando invitación…</p>
        ) : loadError ? (
          <div className="flex flex-col gap-4">
            <p
              className="rounded-lg border border-danger/35 bg-danger/10 px-[13px] py-[11px] text-sm leading-snug text-danger"
              role="alert"
            >
              {loadError}
            </p>
            <Link
              to="/login"
              className="text-center text-[13px] font-medium text-accent hover:underline"
            >
              Ir a iniciar sesión
            </Link>
          </div>
        ) : (
          preview && (
            <form className="flex flex-col gap-[18px]" onSubmit={handleSubmit} noValidate>
              <p className="text-[14px] text-text">
                Hola <strong className="text-text-h">{preview.firstName}</strong>. Define una
                contraseña para activar tu cuenta con el correo{' '}
                <strong className="text-text-h">{preview.email}</strong>.
              </p>

              <TextField
                label="Contraseña"
                type={showPassword ? 'text' : 'password'}
                value={password}
                placeholder="Mínimo 8 caracteres"
                autoComplete="new-password"
                disabled={submitting}
                autoFocus
                onChange={setPassword}
                onBlur={() => {}}
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
                {submitting ? 'Creando cuenta…' : 'Activar cuenta'}
              </button>
            </form>
          )
        )}
      </div>
    </main>
  )
}
