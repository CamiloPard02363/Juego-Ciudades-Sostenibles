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
  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Dúo Lógico · Motor PixiJS (demo local)</h1>
          <p className="text-sm text-slate-500">
            Lumen: A/D moverse, W saltar o nadar, S bucear. Gota: flechas izquierda/derecha, arriba saltar o nadar,
            abajo bucear.
          </p>
        </div>
        <Link to="/" className="text-sm text-emerald-600 hover:underline">
          Volver al inicio
        </Link>
      </div>
      <DualQuestPixiMount level={level1EnergiaRenovable} />
    </main>
  )
}
