import { useState } from 'react'
import { Modal } from './Modal'
import { useAuth } from '../../../hooks/useAuth'
import { resolveRoomCode, type ResolvedRoom } from './resolveRoomCode'

type JoinByCodeModalProps = {
  onClose: () => void
  onResolved: (resolved: ResolvedRoom, code: string) => void
}

/**
 * Modal agnóstico al juego: solo pide un código, lo resuelve contra el
 * gateway de salas (que revisa salas 1v1, torneos grupales y salas de
 * dominó) y le pasa al llamador a qué juego/modo pertenece para que abra la
 * sala correcta.
 */
export function JoinByCodeModal({ onClose, onResolved }: JoinByCodeModalProps) {
  const { token } = useAuth()
  const [code, setCode] = useState('')
  const [resolving, setResolving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleSubmit() {
    const trimmed = code.trim().toUpperCase()
    if (!token || trimmed.length !== 6) return

    setResolving(true)
    setError(null)

    resolveRoomCode(token, trimmed)
      .then((resolved) => onResolved(resolved, trimmed))
      .catch((err: Error) => setError(err.message))
      .finally(() => setResolving(false))
  }

  return (
    <Modal onClose={onClose} maxWidthClassName="max-w-[420px]">
      <h2 className="mb-1 text-[19px] tracking-tight text-text-h">Unirme con código</h2>
      <p className="mb-6 text-[13px] text-text">
        Ingresa el código de 6 caracteres que te compartieron, sin importar el juego.
      </p>
      <div className="flex gap-2">
        <input
          type="text"
          autoFocus
          className="flex-1 rounded-lg border border-border bg-bg px-3 py-2.5 text-[13px] tracking-widest uppercase text-text-h outline-none focus:border-accent"
          placeholder="CÓDIGO"
          value={code}
          maxLength={6}
          disabled={resolving}
          onChange={(event) => setCode(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') handleSubmit()
          }}
        />
        <button
          type="button"
          className="shrink-0 rounded-lg border border-border px-3.5 py-2.5 text-[12.5px] font-medium text-text-h disabled:cursor-not-allowed disabled:opacity-50"
          disabled={resolving || code.trim().length !== 6}
          onClick={handleSubmit}
        >
          {resolving ? 'Buscando…' : 'Unirme'}
        </button>
      </div>
      {error && (
        <p className="mt-3 text-[13px] text-danger" role="alert">
          {error}
        </p>
      )}
      <button
        type="button"
        className="mt-6 w-full rounded-lg border border-border px-4 py-2.5 text-[14px] font-medium text-text-h"
        onClick={onClose}
      >
        Cancelar
      </button>
    </Modal>
  )
}
