import { useNavigate } from 'react-router-dom'
import { Modal } from './Modal'

type GuessWhoRoomProps = {
  gameId: string
  onExit: () => void
}

/**
 * Punto de entrada de "¿Quién Es?" al pulsar "Crear una partida" en el
 * detalle del juego: pregunta el formato (1 contra 1 o Grupo) y navega a la
 * ruta dedicada correspondiente (`/quien-es/sala` o `/quien-es/torneo`, ver
 * App.tsx) — ya no monta la sala/torneo como overlay en este mismo árbol
 * (ver issue #146). Unirse con un código no se pregunta acá — el detalle del
 * juego y el botón "Unirme con código" del home ya resuelven el `kind` y
 * navegan directo (ver `handleCodeResolved`/`LIVE_ROOM_ROUTES`).
 */
export function GuessWhoRoom({ gameId, onExit }: GuessWhoRoomProps) {
  const navigate = useNavigate()

  return (
    <Modal onClose={onExit} maxWidthClassName="max-w-[440px]">
      <div className="space-y-5">
        <div className="rounded-2xl bg-gradient-to-r from-accent/12 via-accent/5 to-transparent p-4">
          <p className="text-[11px] font-semibold tracking-[0.18em] text-accent uppercase">¿Quién Es?</p>
          <h2 className="mt-2 text-[24px] font-bold tracking-tight text-text-h">Elige tu formato</h2>
        </div>
        <p className="text-[13px] text-text">¿Quieres jugar individual (1 contra 1) o en grupo?</p>
        <div className="flex flex-col gap-3">
          <button
            type="button"
            className="rounded-2xl px-4 py-3 text-[14.5px] font-semibold text-white shadow-[0_12px_24px_-12px_var(--accent)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_28px_-14px_var(--accent)]"
            style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))' }}
            onClick={() => navigate(`/quien-es/sala?gameId=${gameId}`)}
          >
            1 contra 1
          </button>
          <button
            type="button"
            className="rounded-2xl border border-border bg-surface px-4 py-3 text-[14.5px] font-semibold text-text-h transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/50 hover:bg-accent/5"
            onClick={() => navigate(`/quien-es/torneo?gameId=${gameId}`)}
          >
            Grupo (torneo eliminatorio)
          </button>
        </div>
        <button
          type="button"
          className="w-full rounded-xl border border-border px-4 py-2.5 text-[14px] font-medium text-text-h transition-colors hover:border-accent/50 hover:text-accent"
          onClick={onExit}
        >
          Cancelar
        </button>
      </div>
    </Modal>
  )
}
