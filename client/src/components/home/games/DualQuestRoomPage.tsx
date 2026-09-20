import { MultiplayerLobby } from './MultiplayerLobby'
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { LogOut, RotateCcw, Trophy } from 'lucide-react'
import { useAuth } from '../../../hooks/useAuth'
import { useDualQuestRoom } from './useDualQuestRoom'
import { DualQuestBoard } from './DualQuestBoard'
import { TriggerQuestionModal } from './TriggerQuestionModal'
import { AssemblyModal } from './AssemblyModal'
import type { DualQuestDirection, DualQuestRole, DualQuestRoomStateView } from './dualQuestTypes'

const KEY_TO_DIRECTION: Record<string, DualQuestDirection> = {
  ArrowUp: 'UP',
  ArrowDown: 'DOWN',
  ArrowLeft: 'LEFT',
  ArrowRight: 'RIGHT',
  w: 'UP',
  s: 'DOWN',
  a: 'LEFT',
  d: 'RIGHT',
}

/**
 * Sala de Dúo Lógico en tiempo real (ruta `/dual-quest/sala/:code?`, ver
 * App.tsx) — mismo criterio de página propia que DominoRoomPage. La
 * diferencia real frente a los demás juegos en vivo: el movimiento es
 * continuo mientras se mantiene una tecla presionada (keydown/keyup), no
 * una acción puntual por turno.
 */
export function DualQuestRoomPage() {
  const { code: codeFromUrl } = useParams<{ code?: string }>()
  const [searchParams] = useSearchParams()
  const gameIdToCreate = searchParams.get('gameId')
  const navigate = useNavigate()
  const { token } = useAuth()
  const {
    room,
    error,
    connecting,
    lastTriggerResult,
    lastAssemblyResult,
    createRoom,
    joinRoom,
    setReady,
    messages,
    sendChatMessage,
    move,
    activateTrigger,
    answerTrigger,
    submitAssembly,
    restart,
    leaveRoom,
  } = useDualQuestRoom(token)

  const [joinCodeInput, setJoinCodeInput] = useState('')
  const [chosenRole, setChosenRole] = useState<DualQuestRole>('FIRE')
  const startedRef = useRef(false)
  const activeDirectionRef = useRef<DualQuestDirection | null>(null)

  useEffect(() => {
    if (connecting || startedRef.current) return
    if (codeFromUrl) {
      startedRef.current = true
      joinRoom(codeFromUrl.toUpperCase())
    }
    // La creación (gameId en la URL) espera a que el usuario elija rol — ver handleCreateSubmit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connecting, codeFromUrl])

  useEffect(() => {
    if (room && !codeFromUrl) {
      navigate(`/dual-quest/sala/${room.code}`, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.code])

  // Movimiento continuo: mientras `phase === 'PLAYING'`, mantener una tecla
  // manda la dirección; soltarla la limpia. Mismo patrón de teclado que
  // useMazeCollectorGame, ahora emitiendo al servidor en vez de mover local.
  useEffect(() => {
    if (room?.phase !== 'PLAYING') return

    function handleKeyDown(event: KeyboardEvent) {
      const direction = KEY_TO_DIRECTION[event.key]
      if (!direction || activeDirectionRef.current === direction) return
      event.preventDefault()
      activeDirectionRef.current = direction
      move(direction)
    }
    function handleKeyUp(event: KeyboardEvent) {
      const direction = KEY_TO_DIRECTION[event.key]
      if (!direction || activeDirectionRef.current !== direction) return
      activeDirectionRef.current = null
      move(null)
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      activeDirectionRef.current = null
    }
  }, [room?.phase, move])

  function handleExit() {
    leaveRoom()
    navigate('/')
  }

  function handleCreateSubmit() {
    if (!gameIdToCreate) return
    startedRef.current = true
    createRoom(gameIdToCreate, chosenRole)
  }

  function handleJoinSubmit() {
    const code = joinCodeInput.trim().toUpperCase()
    if (!code) return
    startedRef.current = true
    joinRoom(code)
  }

  const self = room?.players.find((p) => p.isSelf)
  const isHostSelf = Boolean(self?.isHost)

  const activeSwitchTrigger = room && self && !room.pendingQuestion
    ? findActiveTrigger(room, self)
    : null

  if (room?.phase === 'WAITING') return <MultiplayerLobby
    room={room} roomPath={`/dual-quest/sala/${encodeURIComponent(room.code)}`} maxPlayers={2}
    isHost={Boolean(self?.isHost)} connecting={connecting} error={error}


    onReady={setReady} onExit={handleExit} messages={messages} onSend={sendChatMessage}
  ></MultiplayerLobby>

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-bg">
      <div className="mx-auto flex min-h-full max-w-[720px] flex-col p-5 sm:p-8">
        <header className="mb-5 flex items-center justify-between gap-3">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-wide text-accent">
              {room?.gameTitle ?? 'Dúo Lógico'}
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

        {!room && codeFromUrl && <p className="py-10 text-center text-[14px] text-text">Conectando a la sala…</p>}

        {!room && gameIdToCreate && !startedRef.current && (
          <div className="mx-auto flex w-full max-w-[380px] flex-col gap-3 rounded-2xl border border-border bg-surface p-6">
            <p className="text-[14px] text-text-h">Elige tu rol:</p>
            <div className="flex gap-2">
              <button
                type="button"
                className={`flex-1 rounded-lg border px-4 py-2.5 text-[14px] font-medium ${chosenRole === 'FIRE' ? 'border-orange-500 bg-orange-500/10 text-orange-600' : 'border-border text-text-h'}`}
                onClick={() => setChosenRole('FIRE')}
              >
                🔥 Fuego
              </button>
              <button
                type="button"
                className={`flex-1 rounded-lg border px-4 py-2.5 text-[14px] font-medium ${chosenRole === 'WATER' ? 'border-blue-500 bg-blue-500/10 text-blue-600' : 'border-border text-text-h'}`}
                onClick={() => setChosenRole('WATER')}
              >
                💧 Agua
              </button>
            </div>
            <button
              type="button"
              className="rounded-lg px-4 py-2.5 text-[14px] font-semibold text-white shadow-[0_8px_20px_-8px_var(--accent)]"
              style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))' }}
              onClick={handleCreateSubmit}
            >
              Crear sala
            </button>
          </div>
        )}


        {room && (room.phase === 'PLAYING' || room.phase === 'FINISHED') && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap justify-center gap-2">
              {room.players.map((player) => (
                <span
                  key={player.userId}
                  className="rounded-full border border-border px-3 py-1.5 text-[12px] font-medium text-text-h"
                >
                  {player.role === 'FIRE' ? '🔥' : '💧'} {player.displayName}
                </span>
              ))}
              <span className="rounded-full border border-accent/30 bg-accent/10 px-3 py-1.5 text-[12px] font-medium text-accent">
                Gemas: {room.collectedGemIds.length} / {room.gems.length}
              </span>
            </div>

            <DualQuestBoard
              gridCols={room.gridCols}
              gridRows={room.gridRows}
              grid={room.grid}
              corePosition={room.corePosition}
              gates={room.gates}
              gems={room.gems}
              players={room.players}
            />

            {room.phase === 'PLAYING' && (
              <p className="text-center text-[12px] text-text">
                Muévete con las flechas o WASD. {self?.role === 'FIRE' ? '🔥' : '💧'} eres{' '}
                {self?.role === 'FIRE' ? 'el Fuego' : 'el Agua'}.
              </p>
            )}

            {activeSwitchTrigger && (
              <button
                type="button"
                className="mx-auto rounded-xl border border-accent/40 bg-accent/10 px-5 py-2.5 text-[14px] font-semibold text-accent"
                onClick={() => activateTrigger(activeSwitchTrigger)}
              >
                Activar interruptor
              </button>
            )}
          </div>
        )}

        {room?.pendingQuestion && (
          <TriggerQuestionModal
            question={room.pendingQuestion}
            isSelf={room.pendingQuestion.forRole === self?.role}
            answeringDisplayName={
              room.players.find((p) => p.role === room.pendingQuestion!.forRole)?.displayName ?? ''
            }
            result={lastTriggerResult}
            onAnswer={(optionIndex) => answerTrigger(room.pendingQuestion!.triggerId, optionIndex)}
          />
        )}

        {room?.canAssemble && room.phase === 'PLAYING' && (
          <AssemblyModal
            gems={room.gems}
            coreQuestion={room.coreQuestion}
            result={lastAssemblyResult}
            onSubmit={submitAssembly}
          />
        )}

        {room && room.phase === 'FINISHED' && (
          <div className="mt-4 flex flex-col items-center gap-4 py-4 text-center">
            <span
              className="flex h-14 w-14 items-center justify-center rounded-full text-white"
              style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))' }}
            >
              <Trophy className="h-7 w-7" strokeWidth={1.75} />
            </span>
            <p className="text-[18px] font-semibold text-text-h">¡Armaron el concepto juntos!</p>
            {isHostSelf ? (
              <button
                type="button"
                className="flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-[14px] font-semibold text-white shadow-[0_8px_20px_-8px_var(--accent)]"
                style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))' }}
                onClick={restart}
              >
                <RotateCcw className="h-4 w-4" strokeWidth={2} />
                Jugar de nuevo
              </button>
            ) : (
              <p className="text-[12.5px] text-text">Esperando a que el anfitrión reinicie…</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/** Devuelve el triggerId activable si el jugador está parado exactamente en el interruptor de un trigger de su propio rol, con la compuerta todavía cerrada. */
function findActiveTrigger(
  room: DualQuestRoomStateView,
  self: { role: DualQuestRole; position: { row: number; col: number } },
): string | null {
  const trigger = room.triggers.find(
    (t) =>
      t.activatedByRole === self.role &&
      t.switchPosition.row === self.position.row &&
      t.switchPosition.col === self.position.col,
  )
  if (!trigger) return null
  const gate = room.gates.find((g) => g.gateId === trigger.gateId)
  if (gate?.open) return null
  return trigger.triggerId
}
