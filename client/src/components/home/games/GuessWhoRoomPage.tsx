import { GameInstructionsGate } from './GameInstructionsGate'
import { MultiplayerLobby } from './MultiplayerLobby'
import { ChatPanel } from './ChatPanel'
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Copy, Link, LogOut, Trophy, XCircle } from 'lucide-react'
import { useAuth } from '../../../hooks/useAuth'
import { useGuessWhoRoom } from './useGuessWhoRoom'
import { MIN_DISCARDS_TO_ACCUSE } from './guessWhoTypes'
import { Modal } from './Modal'
import { DealCountdownOverlay, MatchBoard, useCountdown } from './MatchBoard'
import { ConfettiBurst } from '../../kids/ConfettiBurst'
import { CardInfoBubble } from './CardInfoBubble'

/**
 * Sala 1v1 de "¿Quién Es?" en página propia (ruta `/quien-es/sala/:code?`,
 * ver App.tsx) en vez de overlay dentro de GamesSection — mismo criterio que
 * DominoRoomPage: reconecta a la sala en curso vía el código en la URL, y no
 * deja el Sidebar/header de HomeLayout montado detrás.
 */
export function GuessWhoRoomPage() {
  return <GameInstructionsGate kind="GUESS_WHO"><GuessWhoRoomSession /></GameInstructionsGate>
}

function GuessWhoRoomSession() {
  const { code: codeFromUrl } = useParams<{ code?: string }>()
  const [searchParams] = useSearchParams()
  const gameIdToCreate = searchParams.get('gameId')
  const navigate = useNavigate()
  const { token, user } = useAuth()
  const {
    room,
    error,
    connecting,
    rematchRejectedMessage,
    dealCountdownMs,
    lastFailedAccusation,
    clearLastFailedAccusation,
    messages,
    createRoom,
    joinRoom,
    setReady,
    updateTurnDuration,
    discardCard,
    accuseCard,
    voteRematch,
    passTurn,
    sendChatMessage,
    askQuestion,
    answerQuestion,
    leaveRoom,
  } = useGuessWhoRoom(token)

  const startedRef = useRef(false)
  const [joinCodeInput, setJoinCodeInput] = useState('')

  // Arranque de la sala: si la URL trae ?gameId= crea una sala nueva; si trae
  // un código en el path, se une a esa sala — mismo patrón de Dominó/Escaleras
  // (ver DominoRoomPage.tsx) para que el link sea compartible/recargable.
  useEffect(() => {
    if (connecting || startedRef.current) return
    if (codeFromUrl) {
      startedRef.current = true
      joinRoom(codeFromUrl.toUpperCase())
    } else if (gameIdToCreate) {
      startedRef.current = true
      createRoom(gameIdToCreate)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connecting, codeFromUrl, gameIdToCreate])

  // En cuanto el servidor confirma el código de una sala recién creada, se
  // refleja en la URL vía react-router (reemplazando, sin agregar historial).
  useEffect(() => {
    if (room && !codeFromUrl) {
      navigate(`/quien-es/sala/${room.code}`, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.code])

  const [copyFeedback, setCopyFeedback] = useState<string | null>(null)

  const [dealDeadline, setDealDeadline] = useState<number | null>(null)
  useEffect(() => {
    if (dealCountdownMs === null) {
      setDealDeadline(null)
      return
    }
    setDealDeadline(Date.now() + dealCountdownMs)
  }, [dealCountdownMs])
  const dealRemainingMs = useCountdown(dealDeadline)

  function handleExit() {
    leaveRoom()
    navigate('/')
  }

  function handleJoinSubmit() {
    const code = joinCodeInput.trim().toUpperCase()
    if (!code) return
    startedRef.current = true
    joinRoom(code)
  }

  useEffect(() => {
    if (!lastFailedAccusation) return
    const timeout = setTimeout(clearLastFailedAccusation, 3500)
    return () => clearTimeout(timeout)
  }, [lastFailedAccusation, clearLastFailedAccusation])

  const nextTurnPlayer = room?.players.find((player) => player.userId === room.activePlayerUserId)
  const accusationFailedMessage =
    lastFailedAccusation && `Bandera equivocada. Turno de ${nextTurnPlayer?.displayName ?? 'tu rival'}.`

  function copyRoomLink() {
    if (!room) return
    const url = new URL(window.location.href)
    void navigator.clipboard.writeText(url.toString()).then(() => {
      setCopyFeedback('Enlace copiado')
      setTimeout(() => setCopyFeedback(null), 1800)
    })
  }

  if (rematchRejectedMessage) {
    return (
      <Modal onClose={() => navigate('/')} maxWidthClassName="max-w-[420px]">
        <div className="flex flex-col items-center gap-3 py-4 text-center animate-[fade-in-up_0.3s_ease-out]">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-danger/15 text-danger">
            <LogOut className="h-6 w-6" strokeWidth={2} />
          </span>
          <p className="text-[15px] font-semibold text-text-h">Saliste de la partida</p>
          <p className="text-[13px] text-text">{rematchRejectedMessage}</p>
          <button
            type="button"
            className="mt-2 w-full rounded-lg px-4 py-2.5 text-[14px] font-semibold text-white shadow-[0_8px_20px_-8px_var(--accent)] transition-transform hover:-translate-y-0.5"
            style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))' }}
            onClick={() => navigate('/')}
          >
            Entendido
          </button>
        </div>
      </Modal>
    )
  }

  if (connecting || !room) {
    if (!codeFromUrl && !gameIdToCreate) {
      return (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-bg">
          <div className="mx-auto flex min-h-full max-w-[420px] flex-col justify-center p-5 sm:p-8">
            <p className="mb-3 text-[14px] text-text-h">Ingresa el código de una sala de "¿Quién Es?" para unirte:</p>
            <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-6">
              <input
                value={joinCodeInput}
                onChange={(event) => setJoinCodeInput(event.target.value)}
                placeholder="Código de sala"
                className="rounded-lg border border-border bg-bg px-3.5 py-2.5 text-[14px] tracking-widest uppercase text-text-h"
                maxLength={6}
              />
              <button
                type="button"
                className="rounded-lg px-4 py-2.5 text-[14px] font-semibold text-white shadow-[0_8px_20px_-8px_var(--accent)]"
                style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))' }}
                onClick={handleJoinSubmit}
              >
                Unirme
              </button>
              <button
                type="button"
                className="rounded-lg border border-border px-4 py-2.5 text-[14px] font-medium text-text-h"
                onClick={() => navigate('/')}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )
    }
    return (
      <Modal onClose={handleExit}>
        <p className="text-[14px] text-text">Conectando a la sala…</p>
        {error && (
          <p className="mt-3 text-[13px] text-danger" role="alert">
            {error}
          </p>
        )}
      </Modal>
    )
  }

  const self = room.players.find((player) => player.isSelf)
  const opponent = room.players.find((player) => !player.isSelf)
  const isMyTurn = room.phase === 'PLAYING' && room.activePlayerUserId === self?.userId
  const canAccuse =
    room.phase === 'PLAYING' && isMyTurn && (self?.discardedCardIds.length ?? 0) >= MIN_DISCARDS_TO_ACCUSE
  const winnerIsSelf = room.winnerUserId === user?.id
  const dealing = dealDeadline !== null && dealRemainingMs > 0

  if (room.phase === 'WAITING') return <MultiplayerLobby
    room={room} roomPath={`/quien-es/sala/${encodeURIComponent(room.code)}`} maxPlayers={2}
    isHost={Boolean(self?.isHost)} connecting={connecting} error={error}
    turnDurationSeconds={room.turnDurationSeconds} onUpdateTurnDuration={updateTurnDuration}
    onReady={setReady} onExit={handleExit} messages={messages} onSend={sendChatMessage}
  >{dealing && <DealCountdownOverlay remainingMs={dealRemainingMs} />}</MultiplayerLobby>

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-bg">
      {dealing && <DealCountdownOverlay remainingMs={dealRemainingMs} />}

      <div className="guess-who-play-shell">
        <div className="mb-5 rounded-[24px] border border-border/80 bg-gradient-to-r from-accent/8 via-surface to-bg p-4 shadow-[var(--shadow)]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.18em] text-accent uppercase">Sala activa</p>
              <h2 className="mt-1 text-[22px] font-bold tracking-tight text-text-h">{room.gameTitle}</h2>
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                className="flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-2 text-[13px] font-medium text-text-h transition-colors hover:border-accent/50 hover:text-accent"
                onClick={handleExit}
              >
                <LogOut className="h-4 w-4" strokeWidth={2} />
                Salir
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-border bg-surface/90 p-3">
            <div className="flex flex-wrap items-center gap-2 text-[12.5px] text-text">
              <span className="font-medium text-text-h">Código de sala:</span>
              <code className="rounded-lg border border-accent/30 bg-accent/5 px-2 py-1 text-[13px] font-semibold text-accent">
                {room.code}
              </code>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-xl border border-border bg-bg px-2.5 py-1.5 text-[11px] font-medium text-text-h transition-colors hover:border-accent hover:text-accent"
                onClick={() => {
                  void navigator.clipboard.writeText(room.code).then(() => {
                    setCopyFeedback('Código copiado')
                    setTimeout(() => setCopyFeedback(null), 1800)
                  })
                }}
              >
                <Copy className="h-3 w-3" strokeWidth={2} />
                Copiar código
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-xl border border-accent/50 bg-accent/10 px-2.5 py-1.5 text-[11px] font-semibold text-accent transition-colors hover:border-accent hover:bg-accent/20"
                onClick={copyRoomLink}
              >
                <Link className="h-3 w-3" strokeWidth={2} />
                Copiar enlace
              </button>
              {copyFeedback && <span className="text-[11px] font-medium text-accent" role="status">{copyFeedback}</span>}
            </div>
          </div>
        </div>

        {error && (
          <p
            className="mb-4 rounded-lg border border-danger/35 bg-danger/10 px-[13px] py-[11px] text-sm leading-snug text-danger"
            role="alert"
          >
            {error}
          </p>
        )}

        {accusationFailedMessage && (
          <div
            className="mb-4 flex items-center gap-2.5 rounded-lg border border-danger/35 bg-danger/10 px-[13px] py-[11px] text-sm leading-snug font-medium text-danger animate-[fade-in-up_0.2s_ease-out]"
            role="status"
          >
            <XCircle className="h-4 w-4 shrink-0" strokeWidth={2} />
            {accusationFailedMessage}
          </div>
        )}

        <div className="guess-who-play-panels">
        <div className="guess-who-play-board">
        {room.phase === 'PLAYING' && self && opponent && (
          <MatchBoard
            cards={room.cards}
            self={self}
            opponent={opponent}
            isMyTurn={isMyTurn}
            canAccuse={canAccuse}
            accusationMessage={lastFailedAccusation ? 'Bandera equivocada' : null}
            turnDeadline={room.turnDeadline}
            turnDurationSeconds={room.turnDurationSeconds}
            onDiscard={discardCard}
            onAccuse={accuseCard}
            onPassTurn={passTurn}
          />
        )}

        {room.phase === 'FINISHED' && opponent && self && (
          <div className="relative flex flex-col items-center gap-4 py-6 text-center">
            {winnerIsSelf && <ConfettiBurst trigger={room.winnerUserId ?? 'win'} />}
            <span
              className="flex h-14 w-14 items-center justify-center rounded-full text-white animate-[trophy-pop-in_0.5s_cubic-bezier(0.16,1,0.3,1)]"
              style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))' }}
            >
              <Trophy className="h-7 w-7" strokeWidth={1.75} />
            </span>
            <p className="text-[18px] font-semibold text-text-h animate-[fade-in-up_0.4s_ease-out_0.1s_backwards]">
              {winnerIsSelf ? '¡Ganaste!' : `Ganó ${room.players.find((p) => p.userId === room.winnerUserId)?.displayName}`}
            </p>

            <div className="flex items-start justify-center gap-4 animate-[fade-in-up_0.4s_ease-out_0.2s_backwards]">
              <RevealedSecretCard
                ownerLabel="Tu tarjeta era"
                card={room.cards.find((card) => card.cardId === self.secretCardId)}
                isWinner={self.userId === room.winnerUserId}
              />
              <RevealedSecretCard
                ownerLabel={`Tarjeta de ${opponent.displayName}`}
                card={room.cards.find((card) => card.cardId === opponent.secretCardId)}
                isWinner={opponent.userId === room.winnerUserId}
              />
            </div>

            {!self.hasVotedRematch && (
              <div className="flex w-full max-w-[320px] flex-col gap-3 rounded-xl border border-border p-4 animate-[fade-in-up_0.4s_ease-out_0.3s_backwards]">
                <p className="text-[13px] font-medium text-text-h">¿Quieres jugar otra ronda?</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="flex-1 rounded-lg px-4 py-2.5 text-[14px] font-semibold text-white shadow-[0_8px_20px_-8px_var(--accent)] transition-transform hover:-translate-y-0.5"
                    style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))' }}
                    onClick={() => voteRematch(true)}
                  >
                    Sí, seguir
                  </button>
                  <button
                    type="button"
                    className="flex-1 rounded-lg border border-border px-4 py-2.5 text-[14px] font-medium text-text-h transition-transform hover:-translate-y-0.5"
                    onClick={() => {
                      voteRematch(false)
                      handleExit()
                    }}
                  >
                    No, salir
                  </button>
                </div>
              </div>
            )}

            {self.hasVotedRematch && (
              <div className="flex items-center gap-2 rounded-xl border border-accent/40 bg-accent/5 px-4 py-3 text-[13px] font-medium text-text-h animate-[fade-in-up_0.3s_ease-out]">
                Esperando la respuesta de {opponent.displayName}
                <span className="flex items-center gap-0.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent animate-[waiting-dot-bounce_1.2s_ease-in-out_infinite]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-accent animate-[waiting-dot-bounce_1.2s_ease-in-out_0.15s_infinite]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-accent animate-[waiting-dot-bounce_1.2s_ease-in-out_0.3s_infinite]" />
                </span>
              </div>
            )}

            <button
              type="button"
              className="text-[12.5px] font-medium text-text underline-offset-2 hover:text-text-h hover:underline"
              onClick={handleExit}
            >
              Salir sin votar
            </button>
          </div>
        )}
        </div>
        <ChatPanel
          inline
          error={error}
          messages={room.guidedChat ?? []}
          selfUserId={self?.userId ?? null}
          onSend={sendChatMessage}
          disconnected={connecting || dealing}
          guided={room.phase === 'PLAYING' ? { cards: room.cards, questions: room.suggestedQuestions ?? [], pending: room.pendingQuestion ?? null, isMyTurn, onAsk: askQuestion, onAnswer: answerQuestion } : undefined}
        />
        </div>
      </div>
    </div>
  )
}

function RevealedSecretCard({
  ownerLabel,
  card,
  isWinner,
}: {
  ownerLabel: string
  card: { imageUrl: string; label: string; info?: string | null } | undefined
  isWinner: boolean
}) {
  if (!card) return null
  return (
    <div className="relative flex w-[112px] flex-col items-center gap-1.5">
      <div className={`relative overflow-hidden rounded-lg border-2 ${isWinner ? 'border-accent' : 'border-border'}`}>
        <img src={card.imageUrl} alt="" className="h-24 w-full object-cover" />
        {isWinner && (
          <span className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-white">
            <Trophy className="h-3 w-3" strokeWidth={2.5} />
          </span>
        )}
      </div>
      {card.info && <CardInfoBubble info={card.info} label={card.label} />}
      <p className="text-[11px] font-medium text-text">{ownerLabel}</p>
      <p className="text-[12.5px] font-semibold text-text-h">{card.label}</p>
    </div>
  )
}
