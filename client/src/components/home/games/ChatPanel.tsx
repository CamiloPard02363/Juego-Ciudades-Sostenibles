import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { MessageCircle, Send, X } from 'lucide-react'
import type { GuessWhoChatMessage, GuessWhoCard, GuidedQuestion, PendingQuestion } from './guessWhoTypes'

export type GuidedChatControls = {
  cards: GuessWhoCard[]
  questions: GuidedQuestion[]
  pending: PendingQuestion | null
  isMyTurn: boolean
  onAsk: (questionId: string) => void
  onAnswer: (requestId: string, answer: boolean) => void
}

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
  inline = false,
  guided,
  error,
}: {
  messages: GuessWhoChatMessage[]
  selfUserId: string | null
  onClose?: () => void
  onSend: (text: string) => void
  disconnected?: boolean
  modal?: boolean
  inline?: boolean
  guided?: GuidedChatControls
  error?: string | null
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
      className={inline ? 'guess-who-side-chat flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden rounded-2xl border border-accent/30 bg-surface/80 shadow-[var(--shadow)] backdrop-blur-xl' : 'fixed right-5 bottom-5 z-[80] flex h-[min(420px,80dvh)] w-[min(320px,calc(100vw-40px))] flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-[var(--shadow)] animate-[modal-panel-in_0.2s_cubic-bezier(0.16,1,0.3,1)]'}
      role={inline ? 'region' : 'dialog'}
      aria-modal={modal || undefined}
      aria-label="Chat de la sala"
    >
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <p className="flex items-center gap-1.5 text-[13px] font-semibold text-text-h">
          <MessageCircle className="h-4 w-4 text-accent" strokeWidth={2} />
          Chat de la partida
        </p>
        {!inline && <button
          type="button"
          className="text-text hover:text-accent"
          onClick={onClose}
          aria-label="Cerrar chat"
        >
          <X className="h-4 w-4" strokeWidth={2} />
        </button>}
      </div>

      {inline && error && <p role="alert" className="mx-3 mt-2 rounded-lg border border-danger/40 bg-surface/90 p-2 text-[12px] text-danger">{error}</p>}
      <div
        role="log"
        aria-live="polite"
        aria-label="Mensajes de la sala"
        ref={listRef}
        className="flex min-h-[100px] flex-1 flex-col gap-2 overflow-y-auto px-4 py-3"
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

      {guided && <div className="max-h-[45%] shrink-0 overflow-y-auto border-t border-accent/20 bg-accent/5 px-3 py-3">
        {guided.pending ? <>
          <p className="text-[12px] font-bold text-accent">{guided.pending.askerId === selfUserId ? 'Esperando a tu rival…' : 'Tu rival pregunta'}</p>
          <p className="mt-1 text-[13px] font-semibold text-text-h">{guided.pending.text}</p>
          <QuestionGroup question={guided.pending} cards={guided.cards} />
          {guided.pending.askerId !== selfUserId && <div className="mt-2 flex gap-2">
            {[true, false].map(answer => <button key={String(answer)} type="button" disabled={disconnected} onClick={() => guided.onAnswer(guided.pending!.requestId, answer)} className="min-h-11 flex-1 rounded-xl border border-accent bg-accent/10 px-3 py-2 font-bold text-accent focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-50">{answer ? 'Sí' : 'No'}</button>)}
          </div>}
          <p className="mt-2 text-[11px] text-text">La respuesta descarta automáticamente las opciones que no coinciden. La pregunta vence al cambiar el turno.</p>
        </> : <>
          <p className="text-[12px] font-bold text-accent">Preguntas Sí/No · descarte automático</p>
          {!guided.isMyTurn ? <p className="mt-1 text-[12px] text-text">Podrás preguntar en tu turno. Puedes escribir mensajes mientras esperas.</p> : <div className="mt-2 space-y-2">
            {guided.questions.filter(q => normalize(q.text).includes(normalize(text.trim()))).map(q => <div key={q.id}>
              <button type="button" disabled={disconnected} onClick={() => { guided.onAsk(q.id); setText('') }} className="w-full rounded-xl border border-accent/30 bg-surface/70 px-3 py-2 text-left text-[12px] font-medium text-text-h hover:border-accent focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-50" aria-label={`Preguntar: ${q.text}`}>{q.text}</button>
              <QuestionGroup question={q} cards={guided.cards} />
            </div>)}
            {guided.questions.filter(q => normalize(q.text).includes(normalize(text.trim()))).length === 0 && <p className="text-[12px] text-text">{guided.questions.length ? 'Sin sugerencias para ese texto. Puedes enviar un mensaje libre.' : 'No quedan preguntas que separen las opciones. Puedes adivinar o conversar.'}</p>}
          </div>}
        </>}
      </div>}

      <form
        className="flex gap-2 border-t border-border p-3"
        onSubmit={handleSubmit}
      >
        <input
          type="text"
          className="min-w-0 flex-1 rounded-lg border border-border bg-bg px-3 py-2 text-[13px] text-text-h outline-none focus:border-accent"
          aria-label="Mensaje"
          autoFocus={!inline}
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
      {guided && <p className="px-3 pb-2 text-[10px] text-text">Los mensajes libres no descartan tarjetas automáticamente.</p>}
    </div>
  )
}

const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

function QuestionGroup({ question, cards }: { question: GuidedQuestion; cards: GuessWhoCard[] }) {
  if (question.text !== '¿Tu tarjeta está en este grupo?') return null
  return <details className="mt-1 text-[12px] text-text-h" open>
    <summary className="cursor-pointer text-accent">Ver tarjetas del grupo</summary>
    <ul className="mt-2 grid grid-cols-3 gap-1.5">{cards.filter(c => question.cardIds.includes(c.cardId)).map(c => <li key={c.cardId} className="rounded-lg border border-border bg-surface/80 p-1"><img src={c.imageUrl} alt="" className="h-10 w-full object-contain" /><p className="break-words text-center text-[10px]">{c.label}</p></li>)}</ul>
  </details>
}
