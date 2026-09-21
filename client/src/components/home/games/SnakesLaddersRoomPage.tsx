import { GameInstructionsGate } from './GameInstructionsGate'
import { MultiplayerLobby } from './MultiplayerLobby'
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Dices, LogOut, RotateCcw, Trophy } from 'lucide-react'
import { useAuth } from '../../../hooks/useAuth'
import { useSnakesLaddersRoom } from './useSnakesLaddersRoom'
import { SnakesLaddersBoard } from './SnakesLaddersBoard'
import { ChallengeModal } from './ChallengeModal'
import { useCountdown } from './MatchBoard'

/**
 * Sala de Escaleras y Serpientes en tiempo real (2-4 jugadores): página
 * propia (ruta `/escaleras-serpientes/sala/:code?`, ver App.tsx), mismo
 * criterio que `DominoRoomPage` — compartible/recargable por link.
 */
export function SnakesLaddersRoomPage() {
  return <GameInstructionsGate kind="SNAKES_LADDERS"><SnakesLaddersRoomPageSession /></GameInstructionsGate>
}

function SnakesLaddersRoomPageSession() {
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
    lastChallengeResult,
    createRoom,
    joinRoom,
    setReady,
    messages,
    sendChatMessage,
    updateTurnDuration,
    rollDice,
    answerChallenge,
    voteRematch,
    leaveRoom,
  } = useSnakesLaddersRoom(token)

  const [joinCodeInput, setJoinCodeInput] = useState('')
  const startedRef = useRef(false)

  const remainingMs = useCountdown(room?.turnDeadline ?? null)

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

  useEffect(() => {
    if (room && !codeFromUrl) {
      navigate(`/escaleras-serpientes/sala/${room.code}`, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.code])

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

  const self = room?.players.find((p) => p.isSelf)
  const isMyTurn = room?.phase === 'PLAYING' && room.activePlayerUserId === user?.id
  const activePlayer = room?.players.find((p) => p.userId === room.activePlayerUserId)

  if (room?.phase === 'WAITING') return <MultiplayerLobby
    room={room} roomPath={`/escaleras-serpientes/sala/${encodeURIComponent(room.code)}`} maxPlayers={4}
    isHost={Boolean(self?.isHost)} connecting={connecting} error={error}
    turnDurationSeconds={room.turnDurationSeconds} onUpdateTurnDuration={updateTurnDuration}
    minTurn={15} maxTurn={180}
    onReady={setReady} onExit={handleExit} messages={messages} onSend={sendChatMessage}
  ></MultiplayerLobby>

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-bg">
      <div className="mx-auto flex min-h-full max-w-[880px] flex-col p-5 sm:p-8">
        <header className="mb-5 flex items-center justify-between gap-3">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-wide text-accent">
              {room?.gameTitle ?? 'Escaleras y Serpientes'}
            </p>
            <h1 className="text-[20px] tracking-tight text-text-h">Sala en vivo</h1>
          </div>
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-[13px] font-medium text-text-h"
            onClick={handleExit}
          >
            <LogOut className="h-4 w-4" strokeWidth={2} />
            Salir
          </button>
        </header>

        {error && (
          <p className="mb-4 rounded-lg border border-danger/40 bg-danger/10 px-4 py-2.5 text-[13px] text-danger">
            {error}
          </p>
        )}
        {rematchRejectedMessage && (
          <p className="mb-4 rounded-lg border border-danger/40 bg-danger/10 px-4 py-2.5 text-[13px] text-danger">
            {rematchRejectedMessage}
          </p>
        )}

        {!room && !codeFromUrl && !gameIdToCreate && (
          <div className="mx-auto flex w-full max-w-[380px] flex-col gap-3 rounded-2xl border border-border bg-surface p-6">
            <p className="text-[14px] text-text-h">Ingresa el código de una sala para unirte:</p>
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
          </div>
        )}

        {!room && (codeFromUrl || gameIdToCreate) && (
          <p className="py-10 text-center text-[14px] text-text">Conectando a la sala…</p>
        )}


        {room && room.phase === 'PLAYING' && (
          <div className="flex flex-col gap-5">
            <div className="rounded-2xl border border-border bg-code-bg p-4">
              <div className="mb-2 flex items-center justify-between text-[13px]">
                <span className="text-text-h">
                  Turno de: <strong>{activePlayer?.displayName ?? '—'}</strong>
                  {isMyTurn ? ' (tú)' : ''}
                </span>
                {room.turnDeadline !== null && (
                  <span className="text-text">{Math.ceil(remainingMs / 1000)}s</span>
                )}
              </div>
              {room.lastRoll !== null && (
                <p className="text-[12px] text-text">Última tirada: {room.lastRoll}</p>
              )}
            </div>

            <SnakesLaddersBoard
              boardSize={room.boardSize}
              ladders={room.ladders}
              snakes={room.snakes}
              players={room.players}
              activePlayerUserId={room.activePlayerUserId}
            />

            <div className="flex flex-wrap gap-2">
              {room.players.map((player) => (
                <span
                  key={player.userId}
                  className={`rounded-full border px-3 py-1.5 text-[12px] font-medium ${
                    player.userId === room.activePlayerUserId
                      ? 'border-accent bg-accent/10 text-accent'
                      : 'border-border text-text-h'
                  }`}
                >
                  {player.displayName}: casilla {player.position}
                </span>
              ))}
            </div>

            {isMyTurn && !room.pendingChallenge && (
              <button
                type="button"
                className="mx-auto flex items-center gap-2 rounded-2xl px-6 py-3 text-[15px] font-semibold text-white shadow-[0_8px_20px_-8px_var(--accent)] transition-transform hover:-translate-y-0.5"
                style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))' }}
                onClick={rollDice}
              >
                <Dices className="h-5 w-5" strokeWidth={2} />
                Tirar el dado
              </button>
            )}
            {!isMyTurn && !room.pendingChallenge && (
              <p className="text-center text-[13px] text-text">Esperando a {activePlayer?.displayName}…</p>
            )}
          </div>
        )}

        {room?.pendingChallenge && (
          <ChallengeModal
            challenge={room.pendingChallenge}
            isSelf={room.pendingChallenge.forUserId === user?.id}
            answeringDisplayName={
              room.players.find((p) => p.userId === room.pendingChallenge!.forUserId)?.displayName ?? ''
            }
            result={lastChallengeResult}
            onAnswer={answerChallenge}
          />
        )}

        {room && room.phase === 'FINISHED' && (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <span
              className="flex h-14 w-14 items-center justify-center rounded-full text-white"
              style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))' }}
            >
              <Trophy className="h-7 w-7" strokeWidth={1.75} />
            </span>
            <p className="text-[18px] font-semibold text-text-h">
              {room.winnerUserId === user?.id
                ? '¡Ganaste!'
                : `Ganó ${room.players.find((p) => p.userId === room.winnerUserId)?.displayName ?? 'otro jugador'}`}
            </p>

            <div className="mt-2 flex flex-col items-center gap-2">
              <p className="text-[12.5px] text-text">
                {self?.hasVotedRematch ? 'Esperando a los demás jugadores…' : '¿Quieren una revancha?'}
              </p>
              {!self?.hasVotedRematch && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-[14px] font-semibold text-white shadow-[0_8px_20px_-8px_var(--accent)]"
                    style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))' }}
                    onClick={() => voteRematch(true)}
                  >
                    <RotateCcw className="h-4 w-4" strokeWidth={2} />
                    Revancha
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-border px-4 py-2.5 text-[14px] font-medium text-text-h"
                    onClick={() => voteRematch(false)}
                  >
                    No, gracias
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
