import { GameInstructionsGate } from './GameInstructionsGate'
import { Link } from 'react-router-dom'
import { DualQuestPixiMount } from './dual-quest-pixi/DualQuestPixiMount'
import { level1EnergiaRenovable } from './dual-quest-pixi/levels/level1EnergiaRenovable'

/**
 * Página de prueba del motor PixiJS de Dúo Lógico — local, un solo
 * teclado (Lumen en WASD, Gota en flechas), sin backend ni sala en
 * tiempo real. Deliberadamente separada de /dual-quest/sala, que es la
 * versión real conectada al servidor: mientras este motor no tenga
 * multijugador por red, no debe compartir ruta con la que sí lo tiene.
 */
export function DualQuestPixiDemoPage() {
  return <GameInstructionsGate kind="DUAL_QUEST_PIXI"><DualQuestPixiDemoPageSession /></GameInstructionsGate>
}

function DualQuestPixiDemoPageSession() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-slate-950">
      <div className="flex shrink-0 items-center justify-between gap-3 p-4">
        <div>
          <h1 className="text-xl font-bold text-white">Dúo Lógico · Motor PixiJS (demo local)</h1>
          <p className="text-sm text-slate-400">
            Lumen: A/D moverse, W saltar o nadar, S bucear. Gota: flechas izquierda/derecha, arriba saltar o nadar,
            abajo bucear.
          </p>
        </div>
        <Link to="/" className="shrink-0 text-sm text-emerald-400 hover:underline">
          ← Salir
        </Link>
      </div>
      <div className="relative min-h-0 flex-1 px-4 pb-4">
        <DualQuestPixiMount level={level1EnergiaRenovable} />
      </div>
    </div>
  )
}
