import { useState } from 'react'
import { io } from 'socket.io-client'
import { Modal } from './Modal'
import { useAuth } from '../../../hooks/useAuth'

const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3000'

type ResolvedRoom = { kind: 'room' | 'tournament'; gameId: string; gameTitle: string }

type JoinByCodeModalProps = {
  onClose: () => void
  onResolved: (resolved: ResolvedRoom, code: string) => void
}

/**
 * Modal agnóstico al juego: solo pide un código, lo resuelve contra el
 * gateway de salas (que revisa tanto salas 1v1 como torneos grupales) y le
 * pasa al llamador a qué juego/modo pertenece para que abra la sala correcta.
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

    const socket = io(`${API_URL}/rooms`, { auth: { token }, transports: ['websocket'] })

    // El gateway no resuelve el ack cuando el código no existe (el filtro de
    // excepciones solo emite "room:error"), así que ese evento es el único
    // camino confiable para el caso de error — el ack solo se usa si sí trae
    // el resultado resuelto.
    socket.on('room:error', (payload: { message: string }) => {
      socket.disconnect()
      setResolving(false)
      setError(payload.message)
    })
    socket.on('connect', () => {
      socket.emit('room:resolve-code', { code: trimmed }, (response?: ResolvedRoom) => {
        if (response && 'kind' in response) {
          socket.disconnect()
          onResolved(response, trimmed)
        }
      })
    })
    socket.on('connect_error', () => {
      socket.disconnect()
      setResolving(false)
      setError('No se pudo conectar. Intenta de nuevo.')
    })
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
