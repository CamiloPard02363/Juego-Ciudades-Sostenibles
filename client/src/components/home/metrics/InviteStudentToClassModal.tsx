import { useState } from 'react'
import type { FormEvent } from 'react'
import { useAuth } from '../../../hooks/useAuth'
import { inviteStudentToClass, type EnrollOrInviteResult } from '../../../services/invitation.service'
import { ApiError } from '../../../utils/http'
import { Modal } from '../games/Modal'

type InviteStudentToClassModalProps = {
  classId: string
  className: string
  onClose: () => void
  onLinked: () => void
}

/**
 * Alta manual de estudiante a una clase con invitación por link (issue
 * #232). Mismo patrón de UI que `InviteStudentModal` de `InstitutionView`
 * (institución), pero contra `POST /classes/:id/invitations`: si el email ya
 * tiene cuenta y es miembro de la organización dueña, matricula directo; si
 * no tiene cuenta, genera un link de un solo uso para completar el registro.
 */
export function InviteStudentToClassModal({
  classId,
  className,
  onClose,
  onLinked,
}: InviteStudentToClassModalProps) {
  const { token } = useAuth()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<EnrollOrInviteResult | null>(null)
  const [copied, setCopied] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!token) return
    setSaving(true)
    setError(null)
    setResult(null)
    try {
      const response = await inviteStudentToClass(token, classId, {
        email: email.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      })
      setResult(response)
      if (response.status === 'LINKED') onLinked()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo invitar al estudiante.')
    } finally {
      setSaving(false)
    }
  }

  async function handleCopyLink() {
    if (!result?.invitationUrl) return
    try {
      await navigator.clipboard.writeText(result.invitationUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Silencioso: el link sigue visible en pantalla para copiar a mano.
    }
  }

  return (
    <Modal onClose={onClose}>
      <h3 className="mb-1 text-[17px] font-semibold text-text-h">Invitar estudiante</h3>
      <p className="mb-4 text-[13px] text-text">
        Da de alta a un estudiante en {className}. Si ya tiene cuenta y pertenece a la institución,
        se matricula directo; si no tiene cuenta, se genera un link de invitación.
      </p>

      {result ? (
        <div className="flex flex-col gap-4">
          {result.status === 'LINKED' ? (
            <p
              className="rounded-lg border border-accent/35 bg-accent/10 px-[13px] py-[11px] text-sm leading-snug text-accent"
              role="status"
            >
              El estudiante quedó matriculado en {className} de inmediato.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              <p className="text-[13px] text-text">
                Copia este link y envíaselo al estudiante (vence el{' '}
                {result.expiresAt ? new Date(result.expiresAt).toLocaleDateString() : 'pronto'}):
              </p>
              <div className="flex items-center gap-2 rounded-lg border border-border bg-bg px-3 py-2">
                <code className="min-w-0 flex-1 truncate text-[12.5px] text-text-h">
                  {result.invitationUrl}
                </code>
                <button
                  type="button"
                  className="shrink-0 rounded-md border border-border px-2.5 py-1 text-[12px] font-medium text-text-h hover:border-accent"
                  onClick={handleCopyLink}
                >
                  {copied ? 'Copiado' : 'Copiar'}
                </button>
              </div>
            </div>
          )}
          <div className="flex justify-end">
            <button
              type="button"
              className="rounded-lg border border-border px-3.5 py-2 text-[13px] font-medium text-text-h"
              onClick={onClose}
            >
              Cerrar
            </button>
          </div>
        </div>
      ) : (
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] font-medium text-text-h">Nombre</span>
              <input
                type="text"
                required
                className="rounded-lg border border-border bg-bg px-3.5 py-2.5 text-[14px] text-text-h outline-none focus:border-accent"
                placeholder="Ana"
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                disabled={saving}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] font-medium text-text-h">Apellido</span>
              <input
                type="text"
                required
                className="rounded-lg border border-border bg-bg px-3.5 py-2.5 text-[14px] text-text-h outline-none focus:border-accent"
                placeholder="García"
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                disabled={saving}
              />
            </label>
          </div>
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium text-text-h">Correo del estudiante</span>
            <input
              type="email"
              required
              className="rounded-lg border border-border bg-bg px-3.5 py-2.5 text-[14px] text-text-h outline-none focus:border-accent"
              placeholder="estudiante@correo.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={saving}
            />
          </label>
          {error && (
            <p className="rounded-lg border border-danger/35 bg-danger/10 px-[13px] py-[11px] text-sm leading-snug text-danger" role="alert">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              className="rounded-lg border border-border px-3.5 py-2 text-[13px] font-medium text-text-h"
              onClick={onClose}
              disabled={saving}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-lg px-4 py-2 text-[13px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))' }}
              disabled={saving}
            >
              {saving ? 'Invitando…' : 'Invitar'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  )
}
