import { useState } from 'react'
import type { FormEvent } from 'react'
import { Building2 } from 'lucide-react'
import { joinOrganization } from '../../services/organization.service'
import { useAuth } from '../../hooks/useAuth'
import { ApiError } from '../../utils/http'

/**
 * Vista de entrada a `/organizacion` para un usuario sin ninguna
 * organización todavía (issue #133/#136, Frente A/B). Mismo patrón visual de
 * formulario simple usado en `CreateOrganizationModal`
 * (`OrganizationDashboard.tsx`), pero sin modal: es la vista principal, no un
 * diálogo secundario.
 */
export function JoinOrganizationPanel({ onJoined }: { onJoined: () => void }) {
  const { token } = useAuth()
  const [inviteCode, setInviteCode] = useState('')
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!token || !inviteCode.trim()) return
    setJoining(true)
    setError(null)
    try {
      await joinOrganization(token, inviteCode.trim())
      onJoined()
    } catch (err) {
      // El backend distingue 404 (código inválido) de 403 (organización
      // desactivada); en ambos casos el mensaje real de `ApiError` ya es
      // claro para el usuario, no hace falta reescribirlo por status.
      setError(err instanceof ApiError ? err.message : 'No se pudo unir a la organización.')
    } finally {
      setJoining(false)
    }
  }

  return (
    <section className="flex flex-col items-center gap-6 py-10 text-center">
      <span
        className="flex h-14 w-14 items-center justify-center rounded-2xl text-white"
        style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))' }}
      >
        <Building2 className="h-7 w-7" strokeWidth={2} />
      </span>
      <div>
        <h2 className="text-[20px] tracking-tight text-text-h">Únete a tu organización</h2>
        <p className="mx-auto mt-1 max-w-[380px] text-[13.5px] text-text">
          Pide el código de invitación de tu institución a un administrador y pégalo aquí para
          unirte.
        </p>
      </div>

      <form className="flex w-full max-w-[360px] flex-col gap-3" onSubmit={handleSubmit}>
        <input
          type="text"
          required
          autoFocus
          value={inviteCode}
          onChange={(event) => setInviteCode(event.target.value)}
          placeholder="Código de invitación"
          disabled={joining}
          className="rounded-lg border border-border bg-bg px-3.5 py-2.5 text-center text-[14px] uppercase tracking-wide text-text-h outline-none focus:border-accent"
        />
        {error && (
          <p
            className="rounded-lg border border-danger/35 bg-danger/10 px-[13px] py-[11px] text-sm leading-snug text-danger"
            role="alert"
          >
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={joining || !inviteCode.trim()}
          className="rounded-lg px-4 py-2.5 text-[13.5px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))' }}
        >
          {joining ? 'Uniéndome…' : 'Unirme'}
        </button>
      </form>
    </section>
  )
}
