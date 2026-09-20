import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { MessageCircle, Send, X } from 'lucide-react'
import type { GuessWhoChatMessage } from './guessWhoTypes'

/**
 * Panel de chat de la sala 1v1: flota sobre el modal del juego para que los
 * dos jugadores puedan coordinarse por texto sin llamada ni estar en
 * persona. No guarda historial en el servidor — solo lo que llegó mientras
 * el socket de este cliente estuvo conectado a la sala.
 */
export function ChatPanel({
  messages,
  selfUserId,
  onClose,
  onSend,
  disconnected = false,
  modal = false,
}: {
  messages: GuessWhoChatMessage[]
  selfUserId: string | null
  onClose: () => void
  onSend: (text: string) => void
  disconnected?: boolean
  modal?: boolean
}) {
  const [text, setText] = useState('')
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight })
  }, [messages.length])

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!text.trim() || disconnected) return
    onSend(text)
    setText('')
  }

  return (
    <div
      className="fixed right-5 bottom-5 z-[80] flex h-[min(420px,80dvh)] w-[min(320px,calc(100vw-40px))] flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-[var(--shadow)] animate-[modal-panel-in_0.2s_cubic-bezier(0.16,1,0.3,1)]"
      role="dialog"
      aria-modal={modal || undefined}
      aria-label="Chat de la sala"
    >
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <p className="flex items-center gap-1.5 text-[13px] font-semibold text-text-h">
          <MessageCircle className="h-4 w-4 text-accent" strokeWidth={2} />
          Chat de la partida
        </p>
        <button
          type="button"
          className="text-text hover:text-accent"
          onClick={onClose}
          aria-label="Cerrar chat"
        >
          <X className="h-4 w-4" strokeWidth={2} />
        </button>
      </div>

      <div
        role="log"
        aria-live="polite"
        aria-label="Mensajes de la sala"
        ref={listRef}
        className="flex flex-1 flex-col gap-2 overflow-y-auto px-4 py-3"
      >
        {messages.length === 0 ? (
          <p className="m-auto text-center text-[12.5px] text-text">
            Todavía no hay mensajes. Escribe algo para coordinar con los
            jugadores.
          </p>
        ) : (
          messages.map((message, index) => {
            const isSelf = message.userId === selfUserId
            return (
              <div
                key={`${message.sentAt}-${index}`}
                className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'}`}
              >
                {!isSelf && (
                  <span className="mb-0.5 px-1 text-[10.5px] font-medium text-text">
                    {message.displayName}
                  </span>
                )}
                <span
                  className={`max-w-[85%] rounded-lg px-3 py-1.5 text-[13px] leading-snug break-words ${
                    isSelf ? 'text-white' : 'border border-border text-text-h'
                  }`}
                  style={
                    isSelf
                      ? {
                          background:
                            'linear-gradient(135deg, var(--accent), var(--accent-2))',
                        }
                      : undefined
                  }
                >
                  {message.text}
                </span>
              </div>
            )
          })
        )}
      </div>

      <form
        className="flex gap-2 border-t border-border p-3"
        onSubmit={handleSubmit}
      >
        <input
          type="text"
          className="min-w-0 flex-1 rounded-lg border border-border bg-bg px-3 py-2 text-[13px] text-text-h outline-none focus:border-accent"
          aria-label="Mensaje"
          autoFocus
          disabled={disconnected}
          placeholder="Escribe un mensaje…"
          maxLength={500}
          value={text}
          onChange={(event) => setText(event.target.value)}
        />
        <button
          type="submit"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white disabled:cursor-not-allowed disabled:opacity-50"
          style={{
            background:
              'linear-gradient(135deg, var(--accent), var(--accent-2))',
          }}
          disabled={!text.trim() || disconnected}
          aria-label="Enviar mensaje"
        >
          <Send className="h-4 w-4" strokeWidth={2} />
        </button>
      </form>
    </div>
  )
}
