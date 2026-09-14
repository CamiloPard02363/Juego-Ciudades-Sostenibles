import { useEffect, useState } from 'react'
import { ArrowDown, ArrowUp, CheckCircle2, XCircle } from 'lucide-react'
import type { DualQuestAssemblyResult, DualQuestGemView } from './dualQuestTypes'

type AssemblyModalProps = {
  gems: DualQuestGemView[]
  coreQuestion: string
  result: DualQuestAssemblyResult | null
  onSubmit: (orderedGemIds: string[]) => void
}

const FIRE_COLOR = '#f97316'
const WATER_COLOR = '#3b82f6'

/**
 * Modal de ensamblaje de la Gema Núcleo: ambos jugadores ven las mismas
 * gemas recolectadas (nunca su orden correcto, eso solo lo sabe el
 * servidor) y las reordenan con flechas arriba/abajo — sin drag-and-drop,
 * más simple y accesible por teclado — antes de enviar el arreglo.
 */
export function AssemblyModal({ gems, coreQuestion, result, onSubmit }: AssemblyModalProps) {
  const [order, setOrder] = useState<string[]>(() => gems.map((g) => g.gemId))

  useEffect(() => {
    // Solo se re-inicializa si cambia el conjunto de gemas (no en cada
    // render) — evita perder el reordenamiento del usuario a mitad de camino.
    setOrder((current) => {
      const sameSet = current.length === gems.length && current.every((id) => gems.some((g) => g.gemId === id))
      return sameSet ? current : gems.map((g) => g.gemId)
    })
  }, [gems])

  function moveItem(index: number, direction: -1 | 1) {
    const target = index + direction
    if (target < 0 || target >= order.length) return
    const next = [...order]
    ;[next[index], next[target]] = [next[target], next[index]]
    setOrder(next)
  }

  function gemById(gemId: string): DualQuestGemView | undefined {
    return gems.find((g) => g.gemId === gemId)
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-5">
      <div className="w-full max-w-[480px] rounded-2xl border border-border bg-surface p-6 shadow-[var(--shadow)]">
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-accent">Gema Núcleo</p>
        <h2 className="mb-4 text-[17px] font-semibold leading-snug text-text-h">{coreQuestion}</h2>
        <p className="mb-3 text-[12.5px] text-text">
          Ordena los fragmentos en la secuencia correcta para armar el concepto.
        </p>

        <div className="flex flex-col gap-1.5">
          {order.map((gemId, index) => {
            const gem = gemById(gemId)
            if (!gem) return null
            return (
              <div
                key={gemId}
                className="flex items-center gap-2 rounded-lg border border-border bg-code-bg px-3 py-2"
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: gem.role === 'FIRE' ? FIRE_COLOR : WATER_COLOR }}
                />
                <span className="flex-1 text-[13px] text-text-h">{gem.label}</span>
                <button
                  type="button"
                  className="rounded border border-border p-1 disabled:cursor-not-allowed disabled:opacity-30"
                  disabled={index === 0}
                  onClick={() => moveItem(index, -1)}
                  aria-label="Subir"
                >
                  <ArrowUp className="h-3.5 w-3.5" strokeWidth={2} />
                </button>
                <button
                  type="button"
                  className="rounded border border-border p-1 disabled:cursor-not-allowed disabled:opacity-30"
                  disabled={index === order.length - 1}
                  onClick={() => moveItem(index, 1)}
                  aria-label="Bajar"
                >
                  <ArrowDown className="h-3.5 w-3.5" strokeWidth={2} />
                </button>
              </div>
            )
          })}
        </div>

        {result && (
          <p
            className={`mt-3 flex items-center gap-1.5 text-[13px] ${result.correct ? 'text-emerald-600' : 'text-rose-600'}`}
          >
            {result.correct ? <CheckCircle2 className="h-4 w-4" strokeWidth={2} /> : <XCircle className="h-4 w-4" strokeWidth={2} />}
            {result.correct ? '¡Correcto! Armaron el concepto.' : 'Ese orden no es correcto — sigue intentando.'}
          </p>
        )}

        <button
          type="button"
          className="mt-4 w-full rounded-lg px-4 py-2.5 text-[14px] font-semibold text-white shadow-[0_8px_20px_-8px_var(--accent)]"
          style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))' }}
          onClick={() => onSubmit(order)}
        >
          Ensamblar
        </button>
      </div>
    </div>
  )
}
