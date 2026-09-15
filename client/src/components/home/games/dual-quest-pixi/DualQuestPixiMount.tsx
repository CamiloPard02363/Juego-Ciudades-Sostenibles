import { useEffect, useRef, useState } from 'react';
import { DualQuestPixiGame } from './DualQuestPixiGame';
import type { LevelDef, PuzzlePieceDef } from './dualQuestPixiTypes';

interface DualQuestPixiMountProps {
  level: LevelDef;
}

type DeathBanner = { role: 'FIRE' | 'WATER'; cause: string } | null;

/**
 * Puente entre el motor Pixi (canvas, física, sprites) y React (HUD y
 * popups pedagógicos). El canvas es solo el mundo del juego; todo el
 * texto — contador de fichas, el popup educativo, el Gran Final — es DOM
 * normal superpuesto encima, que es donde el texto se ve y se lee mejor.
 */
export function DualQuestPixiMount({ level }: DualQuestPixiMountProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<DualQuestPixiGame | null>(null);

  const [progress, setProgress] = useState({ collected: 0, total: level.puzzlePieces.length });
  const [activePopup, setActivePopup] = useState<PuzzlePieceDef | null>(null);
  const [deathBanner, setDeathBanner] = useState<DeathBanner>(null);
  const [finalReveal, setFinalReveal] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const game = new DualQuestPixiGame(level);
    gameRef.current = game;
    let cancelled = false;

    game.mount(host).then(() => {
      if (cancelled) return;

      game.state.on('piece-collected', ({ pieceId, collected, total }) => {
        setProgress({ collected, total });
        const piece = game.state.getPuzzlePieceById(pieceId);
        if (piece) setActivePopup(piece);
      });

      game.state.on('player-died', ({ role, cause }) => {
        setDeathBanner({ role, cause });
        window.setTimeout(() => setDeathBanner(null), 1800);
      });

      game.state.on('level-complete', () => setFinalReveal(true));
    });

    return () => {
      cancelled = true;
      gameRef.current = null;
      game.destroy();
    };
    // El nivel no cambia en caliente en este componente — si se quiere
    // soportar cambiar de nivel sin desmontar, hay que mover `level` a un
    // efecto separado que reconstruya el juego explícitamente.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function closePopupAndResume(): void {
    setActivePopup(null);
    gameRef.current?.state.resume();
  }

  return (
    <div className="relative w-full overflow-hidden rounded-xl border border-slate-800 bg-slate-950" style={{ aspectRatio: '16 / 9' }}>
      <div ref={hostRef} className="absolute inset-0" />

      <div className="pointer-events-none absolute left-3 top-3 rounded-full bg-slate-900/80 px-3 py-1 font-mono text-xs text-white">
        Fichas: {progress.collected}/{progress.total}
      </div>

      {deathBanner && (
        <div className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 rounded-full bg-red-700/90 px-4 py-1.5 text-sm text-white">
          {deathBanner.role === 'FIRE' ? 'Lumen' : 'Gota'} no resistió {deathBanner.cause === 'WATER' ? 'el agua' : deathBanner.cause === 'LAVA' ? 'la lava' : 'los residuos'} — reiniciando...
        </div>
      )}

      {activePopup && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-5 text-white shadow-2xl">
            <h3 className="mb-1 text-lg font-bold text-emerald-300">{activePopup.concept.title}</h3>
            <p className="mb-4 text-sm leading-relaxed text-slate-300">{activePopup.concept.body}</p>
            <button
              type="button"
              onClick={closePopupAndResume}
              className="w-full rounded-lg bg-emerald-600 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
            >
              Seguir jugando
            </button>
          </div>
        </div>
      )}

      {finalReveal && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-700 bg-slate-900 p-6 text-white shadow-2xl">
            <h3 className="mb-1 text-xl font-bold text-emerald-300">¡Nivel completo! {level.finalReveal.title}</h3>
            <p className="mb-4 text-sm text-slate-400">{level.finalReveal.summary}</p>
            <div className="grid grid-cols-2 gap-3">
              <figure className="overflow-hidden rounded-lg border border-emerald-700">
                <img src={level.finalReveal.positiveUrl} alt="Lado positivo del concepto" className="w-full" />
                <figcaption className="bg-emerald-900/60 py-1 text-center text-xs">Lo que sí funciona</figcaption>
              </figure>
              <figure className="overflow-hidden rounded-lg border border-red-800">
                <img src={level.finalReveal.negativeUrl} alt="Lado negativo del concepto" className="w-full" />
                <figcaption className="bg-red-900/60 py-1 text-center text-xs">Lo que hay que evitar</figcaption>
              </figure>
            </div>
            <button
              type="button"
              onClick={() => setFinalReveal(false)}
              className="mt-5 w-full rounded-lg bg-emerald-600 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
