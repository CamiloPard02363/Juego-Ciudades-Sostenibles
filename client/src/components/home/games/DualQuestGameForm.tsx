import { useEffect, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { TextField } from '../../TextField'
import { SaveVisibilityModal } from './SaveVisibilityModal'
import { ImageUploadField } from './ImageUploadField'
import { AiGameAssistantPanel } from './AiGameAssistantPanel'
import type { GameDraft } from '../../../services/ai-game-assistant.service'
import { OrganizationSelectField } from './create/OrganizationSelectField'
import { DualQuestBoard } from './DualQuestBoard'
import { useAuth } from '../../../hooks/useAuth'
import { useToast } from '../../../hooks/useToast'
import { createGame, publishGame } from '../../../services/game.service'
import {
  createSubject,
  listSubjects as listCategories,
  type SubjectWithGameCount as CategoryWithGameCount,
} from '../../../services/subject.service'
import { listMyOrganizations, type OrganizationWithMyRole } from '../../../services/organization.service'
import { ApiError } from '../../../utils/http'
import {
  DEFAULT_GRID_COLS,
  DEFAULT_GRID_ROWS,
  MAX_GRID_COLS,
  MAX_GRID_ROWS,
  MIN_GEMS_PER_ROLE,
  MIN_GRID_COLS,
  MIN_GRID_ROWS,
  buildEmptyGrid,
  resizeGrid,
} from './dualQuestTypes'
import type {
  DualQuestCellPosition,
  DualQuestGateDraft,
  DualQuestGemDraft,
  DualQuestRole,
  DualQuestTriggerDraft,
} from './dualQuestTypes'

type PlacementMode =
  | { kind: 'CELL' }
  | { kind: 'FIRE_START' }
  | { kind: 'WATER_START' }
  | { kind: 'CORE' }
  | { kind: 'GATE'; gateId: string }
  | { kind: 'SWITCH'; triggerId: string }
  | { kind: 'GEM'; gemId: string }

function emptyGate(index: number): DualQuestGateDraft {
  return { gateId: `gate-${index + 1}`, position: { row: 0, col: 0 } }
}

function emptyTrigger(index: number, gateId: string): DualQuestTriggerDraft {
  return {
    triggerId: `trigger-${index + 1}`,
    kind: 'SWITCH',
    activatedByRole: 'FIRE',
    switchPosition: { row: 0, col: 0 },
    gateId,
  }
}

function emptyGem(index: number, role: DualQuestRole): DualQuestGemDraft {
  return { gemId: `gem-${index + 1}`, role, position: { row: 0, col: 0 }, label: '' }
}

function isPosition(value: unknown): value is DualQuestCellPosition {
  return (
    typeof value === 'object' &&
    value !== null &&
    Number.isInteger((value as DualQuestCellPosition).row) &&
    Number.isInteger((value as DualQuestCellPosition).col)
  )
}

type DualQuestGameFormProps = {
  onClose: () => void
  onCreated: () => void
  onBack: () => void
  onCategoryCreated: () => void
}

/**
 * Crea un juego DUAL_QUEST en DRAFT, igual que los demás. El editor del
 * grid es clicable (cicla 0→1→2→3), y un selector de "modo de colocación"
 * reutiliza el mismo tablero para posicionar fireStart/waterStart/core/
 * compuertas/interruptores/gemas sin superponer varios editores distintos.
 * El orden de las gemas en el rompecabezas de ensamblaje se deriva de su
 * posición en la lista (no un número manual) — así siempre es 1..N sin
 * huecos, como exige el validador del servidor.
 */
export function DualQuestGameForm({ onClose, onCreated, onBack, onCategoryCreated }: DualQuestGameFormProps) {
  const { token } = useAuth()
  const { showToast } = useToast()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null)
  const [coreQuestion, setCoreQuestion] = useState('')
  const [gridCols, setGridCols] = useState(DEFAULT_GRID_COLS)
  const [gridRows, setGridRows] = useState(DEFAULT_GRID_ROWS)
  const [grid, setGrid] = useState<number[][]>(() => buildEmptyGrid(DEFAULT_GRID_ROWS, DEFAULT_GRID_COLS))
  const [fireStart, setFireStart] = useState<DualQuestCellPosition>({ row: 0, col: 0 })
  const [waterStart, setWaterStart] = useState<DualQuestCellPosition>({ row: 0, col: DEFAULT_GRID_COLS - 1 })
  const [corePosition, setCorePosition] = useState<DualQuestCellPosition>({
    row: Math.floor(DEFAULT_GRID_ROWS / 2),
    col: Math.floor(DEFAULT_GRID_COLS / 2),
  })
  const [gates, setGates] = useState<DualQuestGateDraft[]>([emptyGate(0)])
  const [triggers, setTriggers] = useState<DualQuestTriggerDraft[]>([emptyTrigger(0, 'gate-1')])
  const [gems, setGems] = useState<DualQuestGemDraft[]>([
    emptyGem(0, 'FIRE'),
    emptyGem(1, 'WATER'),
    emptyGem(2, 'FIRE'),
    emptyGem(3, 'WATER'),
  ])
  const [placementMode, setPlacementMode] = useState<PlacementMode>({ kind: 'CELL' })

  const [categories, setCategories] = useState<CategoryWithGameCount[]>([])
  const [categoryId, setCategoryId] = useState('')
  const [newCategoryName, setNewCategoryName] = useState('')
  const [creatingCategory, setCreatingCategory] = useState(false)
  const [organizations, setOrganizations] = useState<OrganizationWithMyRole[]>([])
  const [organizationId, setOrganizationId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [createdGameId, setCreatedGameId] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    listCategories(token)
      .then((items) => setCategories(items))
      .catch(() => {})
  }, [token])

  useEffect(() => {
    if (!token) return
    listMyOrganizations(token)
      .then((items) => setOrganizations(items))
      .catch((err: unknown) => {
        console.error('No se pudieron cargar las organizaciones del usuario:', err)
      })
  }, [token])

  // Toda materia nueva creada al vuelo aquí nace como sub-materia privada de
  // la materia raíz que ya esté elegida en el selector de arriba — por eso
  // exige tener un categoryId (raíz) seleccionado antes de poder crearla.
  async function handleCreateCategory() {
    if (!token || !newCategoryName.trim() || !categoryId) return
    setCreatingCategory(true)
    setError(null)
    try {
      const category = await createSubject(token, newCategoryName.trim(), categoryId)
      setCategories((current) => [...current, { ...category, gameCount: 0 }])
      setCategoryId(category.id)
      setNewCategoryName('')
      showToast('Materia creada', 'success')
      onCategoryCreated()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo crear la materia.')
    } finally {
      setCreatingCategory(false)
    }
  }

  function applyAiDraft(draft: GameDraft) {
    const config = (draft.config ?? {}) as Record<string, unknown>
    const content = Array.isArray(draft.content) ? draft.content : []

    if (typeof config.coreQuestion === 'string') setCoreQuestion(config.coreQuestion)

    if (Array.isArray(config.grid) && typeof config.gridCols === 'number' && typeof config.gridRows === 'number') {
      setGrid(config.grid as number[][])
      setGridCols(config.gridCols)
      setGridRows(config.gridRows)
    }

    if (isPosition(config.fireStart)) setFireStart(config.fireStart)
    if (isPosition(config.waterStart)) setWaterStart(config.waterStart)
    if (isPosition(config.corePosition)) setCorePosition(config.corePosition)

    if (Array.isArray(config.gates)) {
      setGates(
        config.gates.map((item, index) => {
          const raw = (item ?? {}) as Record<string, unknown>
          return {
            gateId: typeof raw.gateId === 'string' ? raw.gateId : `gate-${index + 1}`,
            position: isPosition(raw.position) ? raw.position : { row: 0, col: 0 },
          }
        }),
      )
    }

    if (Array.isArray(config.triggers)) {
      setTriggers(
        config.triggers.map((item, index) => {
          const raw = (item ?? {}) as Record<string, unknown>
          return {
            triggerId: typeof raw.triggerId === 'string' ? raw.triggerId : `trigger-${index + 1}`,
            kind: raw.kind === 'QUESTION' ? 'QUESTION' : 'SWITCH',
            activatedByRole: raw.activatedByRole === 'WATER' ? 'WATER' : 'FIRE',
            switchPosition: isPosition(raw.switchPosition) ? raw.switchPosition : { row: 0, col: 0 },
            gateId: typeof raw.gateId === 'string' ? raw.gateId : '',
            prompt: typeof raw.prompt === 'string' ? raw.prompt : undefined,
            options: Array.isArray(raw.options) ? (raw.options as string[]) : undefined,
            correctOptionIndex:
              typeof raw.correctOptionIndex === 'number' ? raw.correctOptionIndex : undefined,
          }
        }),
      )
    }

    // "order" (1..N) llega del validador del servidor; el estado local lo
    // deriva de la posición en el arreglo, así que se ordena antes de setearlo.
    const gems = content
      .map((item) => (item ?? {}) as Record<string, unknown>)
      .filter((raw) => typeof raw.order === 'number')
      .sort((a, b) => (a.order as number) - (b.order as number))
      .map((raw, index) => ({
        gemId: typeof raw.gemId === 'string' ? raw.gemId : `gem-${index + 1}`,
        role: (raw.role === 'WATER' ? 'WATER' : 'FIRE') as DualQuestRole,
        position: isPosition(raw.position) ? raw.position : { row: 0, col: 0 },
        label: typeof raw.label === 'string' ? raw.label : '',
      }))
    if (gems.length > 0) setGems(gems)
  }

  function handleGridSizeChange(nextRows: number, nextCols: number) {
    setGrid((current) => resizeGrid(current, nextRows, nextCols))
    setGridRows(nextRows)
    setGridCols(nextCols)
  }

  function handleCellClick(row: number, col: number) {
    if (placementMode.kind === 'FIRE_START') {
      setFireStart({ row, col })
      return
    }
    if (placementMode.kind === 'WATER_START') {
      setWaterStart({ row, col })
      return
    }
    if (placementMode.kind === 'CORE') {
      setCorePosition({ row, col })
      return
    }
    if (placementMode.kind === 'GATE') {
      setGates((current) =>
        current.map((g) => (g.gateId === placementMode.gateId ? { ...g, position: { row, col } } : g)),
      )
      return
    }
    if (placementMode.kind === 'SWITCH') {
      setTriggers((current) =>
        current.map((t) => (t.triggerId === placementMode.triggerId ? { ...t, switchPosition: { row, col } } : t)),
      )
      return
    }
    if (placementMode.kind === 'GEM') {
      setGems((current) => current.map((g) => (g.gemId === placementMode.gemId ? { ...g, position: { row, col } } : g)))
      return
    }
    // CELL: cicla el tipo de casilla 0→1→2→3→0.
    setGrid((current) =>
      current.map((r, rIndex) => (rIndex === row ? r.map((c, cIndex) => (cIndex === col ? ((c + 1) % 4) : c)) : r)),
    )
  }

  function addGate() {
    const gate = emptyGate(gates.length)
    setGates([...gates, gate])
    setTriggers([...triggers, emptyTrigger(triggers.length, gate.gateId)])
  }

  function removeGate(gateId: string) {
    if (gates.length <= 1) return
    setGates(gates.filter((g) => g.gateId !== gateId))
    setTriggers(triggers.filter((t) => t.gateId !== gateId))
  }

  function updateTrigger(triggerId: string, patch: Partial<DualQuestTriggerDraft>) {
    setTriggers(triggers.map((t) => (t.triggerId === triggerId ? { ...t, ...patch } : t)))
  }

  function addGem(role: DualQuestRole) {
    setGems([...gems, emptyGem(gems.length, role)])
  }

  function removeGem(gemId: string) {
    setGems(gems.filter((g) => g.gemId !== gemId))
  }

  function updateGem(gemId: string, patch: Partial<DualQuestGemDraft>) {
    setGems(gems.map((g) => (g.gemId === gemId ? { ...g, ...patch } : g)))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!token) return

    if (!title.trim() || title.trim().length < 3) {
      setError('El título debe tener al menos 3 caracteres.')
      return
    }
    if (!description.trim() || description.trim().length < 10) {
      setError('La descripción debe tener al menos 10 caracteres.')
      return
    }
    if (!categoryId) {
      setError('Elige una materia para el juego.')
      return
    }
    if (!coreQuestion.trim()) {
      setError('La Gema Núcleo necesita una pregunta/hipótesis.')
      return
    }
    if (gates.length === 0) {
      setError('Agrega al menos una compuerta.')
      return
    }
    for (const trigger of triggers) {
      if (trigger.kind === 'QUESTION' && (!trigger.prompt?.trim() || (trigger.options ?? []).some((o) => !o.trim()))) {
        setError('Cada interruptor de tipo pregunta necesita su reto completo.')
        return
      }
    }
    const fireGems = gems.filter((g) => g.role === 'FIRE')
    const waterGems = gems.filter((g) => g.role === 'WATER')
    if (fireGems.length < MIN_GEMS_PER_ROLE || waterGems.length < MIN_GEMS_PER_ROLE) {
      setError(`Necesitas al menos ${MIN_GEMS_PER_ROLE} gemas de cada rol.`)
      return
    }
    if (gems.some((g) => !g.label.trim())) {
      setError('Cada gema necesita un nombre.')
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      const game = await createGame(token, {
        title: title.trim(),
        description: description.trim(),
        gameType: 'DUAL_QUEST',
        categoryId,
        organizationId: organizationId || undefined,
        theme: coverImageUrl ? { coverImageUrl } : undefined,
        config: {
          coreQuestion: coreQuestion.trim(),
          gridCols,
          gridRows,
          grid,
          fireStart,
          waterStart,
          corePosition,
          gates: gates.map((g) => ({ gateId: g.gateId, position: g.position })),
          triggers: triggers.map((t) => ({
            triggerId: t.triggerId,
            kind: t.kind,
            activatedByRole: t.activatedByRole,
            switchPosition: t.switchPosition,
            gateId: t.gateId,
            ...(t.kind === 'QUESTION'
              ? { prompt: t.prompt?.trim(), options: t.options?.map((o) => o.trim()), correctOptionIndex: t.correctOptionIndex ?? 0 }
              : {}),
          })),
        },
        // El orden se deriva de la posición en la lista — 1..N sin huecos por diseño.
        content: gems.map((gem, index) => ({
          gemId: gem.gemId,
          role: gem.role,
          position: gem.position,
          label: gem.label.trim(),
          order: index + 1,
        })),
      })
      setCreatedGameId(game.id)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo crear el juego.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleChooseVisibility(visibility: 'private' | 'community') {
    if (!token || !createdGameId) return
    if (visibility === 'community') {
      await publishGame(token, createdGameId)
    }
    showToast('Juego creado', 'success')
    onCreated()
  }

  if (createdGameId) {
    return <SaveVisibilityModal onChoose={handleChooseVisibility} />
  }

  return (
    <div className="mx-auto max-w-[760px] p-8">
      <button type="button" className="mb-3 text-[12.5px] font-medium text-accent hover:underline" onClick={onBack}>
        ← Cambiar tipo de juego
      </button>
      <h2 className="mb-1 text-[20px] tracking-tight text-text-h">Dúo Lógico</h2>
      <p className="mb-6 text-[13px] text-text">
        Dos roles complementarios (Fuego/Agua) recorren el mismo mapa, cada uno bloqueado por casillas del
        otro, y dependen entre sí para avanzar. Al final arman juntos un concepto ensamblando lo que cada
        uno recolectó.
      </p>

      <form className="flex flex-col gap-[16px]" onSubmit={handleSubmit} noValidate>
        <TextField label="Título del juego" type="text" value={title} disabled={submitting} onChange={setTitle} onBlur={() => {}} />
        <TextField
          label="Descripción"
          type="text"
          value={description}
          disabled={submitting}
          onChange={setDescription}
          onBlur={() => {}}
        />

        <AiGameAssistantPanel gameType="DUAL_QUEST" disabled={submitting} onDraftReady={applyAiDraft} />

        <ImageUploadField
          label="Portada del juego (opcional)"
          imageUrl={coverImageUrl}
          folder="game-covers"
          disabled={submitting}
          onChange={setCoverImageUrl}
        />
        <TextField
          label="Pregunta/hipótesis de la Gema Núcleo"
          type="text"
          value={coreQuestion}
          disabled={submitting}
          onChange={setCoreQuestion}
          onBlur={() => {}}
        />

        <div>
          <label className="mb-1.5 block text-[13px] font-medium text-text-h" htmlFor="game-category">
            Materia
          </label>
          <select
            id="game-category"
            className="w-full rounded-lg border border-border bg-bg px-[13px] py-[11px] text-[15px] text-text-h outline-none focus:border-accent"
            value={categoryId}
            disabled={submitting}
            onChange={(event) => setCategoryId(event.target.value)}
          >
            <option value="">Elige una materia…</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <div className="mt-2 flex gap-2">
            <input
              type="text"
              className="flex-1 rounded-lg border border-border bg-bg px-[13px] py-2 text-[13px] text-text-h outline-none focus:border-accent"
              placeholder={categoryId ? 'Nombre de la sub-materia…' : 'Elige una materia arriba primero'}
              value={newCategoryName}
              disabled={submitting || creatingCategory || !categoryId}
              onChange={(event) => setNewCategoryName(event.target.value)}
            />
            <button
              type="button"
              className="shrink-0 rounded-lg border border-dashed border-border px-3 py-2 text-[12px] font-medium text-text-h disabled:cursor-not-allowed disabled:opacity-60"
              onClick={handleCreateCategory}
              disabled={submitting || creatingCategory || !newCategoryName.trim() || !categoryId}
            >
              {creatingCategory ? 'Creando…' : '+ Crear'}
            </button>
          </div>
        </div>

        <OrganizationSelectField organizations={organizations} value={organizationId} disabled={submitting} onChange={setOrganizationId} />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-text-h">Columnas del mapa</label>
            <input
              type="number"
              min={MIN_GRID_COLS}
              max={MAX_GRID_COLS}
              className="w-full rounded-lg border border-border bg-bg px-[13px] py-[9px] text-[14px] text-text-h outline-none focus:border-accent"
              value={gridCols}
              disabled={submitting}
              onChange={(e) => handleGridSizeChange(gridRows, Number(e.target.value))}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-text-h">Filas del mapa</label>
            <input
              type="number"
              min={MIN_GRID_ROWS}
              max={MAX_GRID_ROWS}
              className="w-full rounded-lg border border-border bg-bg px-[13px] py-[9px] text-[14px] text-text-h outline-none focus:border-accent"
              value={gridRows}
              disabled={submitting}
              onChange={(e) => handleGridSizeChange(Number(e.target.value), gridCols)}
            />
          </div>
        </div>

        <div className="rounded-xl border border-border p-4">
          <p className="mb-2.5 text-[13px] font-semibold text-text-h">Editor del mapa</p>
          <p className="mb-3 text-[11.5px] text-text">
            Elige un modo y haz clic en el mapa para colocar. En modo "Casilla" cada clic cicla libre → muro
            → solo-Fuego → solo-Agua.
          </p>
          <div className="mb-3 flex flex-wrap gap-1.5">
            <ModeButton active={placementMode.kind === 'CELL'} onClick={() => setPlacementMode({ kind: 'CELL' })}>
              Casilla
            </ModeButton>
            <ModeButton active={placementMode.kind === 'FIRE_START'} onClick={() => setPlacementMode({ kind: 'FIRE_START' })}>
              Inicio Fuego
            </ModeButton>
            <ModeButton active={placementMode.kind === 'WATER_START'} onClick={() => setPlacementMode({ kind: 'WATER_START' })}>
              Inicio Agua
            </ModeButton>
            <ModeButton active={placementMode.kind === 'CORE'} onClick={() => setPlacementMode({ kind: 'CORE' })}>
              Gema Núcleo
            </ModeButton>
          </div>
          <DualQuestBoard
            gridCols={gridCols}
            gridRows={gridRows}
            grid={grid}
            corePosition={corePosition}
            fireStart={fireStart}
            waterStart={waterStart}
            gates={gates.map((g) => ({ ...g, open: false }))}
            gems={gems.map((g) => ({ ...g, collected: false }))}
            onCellClick={handleCellClick}
          />
        </div>

        <div className="flex flex-col gap-3">
          <p className="text-[13px] font-semibold text-text-h">Compuertas e interruptores (la dependencia obligatoria)</p>
          {gates.map((gate) => {
            const trigger = triggers.find((t) => t.gateId === gate.gateId)
            return (
              <div key={gate.gateId} className="rounded-xl border border-border p-4">
                <div className="mb-2.5 flex items-center justify-between">
                  <p className="text-[13px] font-semibold text-text-h">
                    Compuerta en ({gate.position.row},{gate.position.col})
                  </p>
                  {gates.length > 1 && (
                    <button type="button" className="text-[12px] font-medium text-danger" onClick={() => removeGate(gate.gateId)} disabled={submitting}>
                      Quitar
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  className={`mb-3 rounded-lg border px-3 py-1.5 text-[12px] font-medium ${placementMode.kind === 'GATE' && placementMode.gateId === gate.gateId ? 'border-accent bg-accent/10 text-accent' : 'border-border text-text-h'}`}
                  onClick={() => setPlacementMode({ kind: 'GATE', gateId: gate.gateId })}
                  disabled={submitting}
                >
                  Colocar en el mapa
                </button>

                {trigger && (
                  <div className="flex flex-col gap-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1.5 block text-[12px] font-medium text-text-h">Tipo</label>
                        <select
                          className="w-full rounded-lg border border-border bg-bg px-[13px] py-[9px] text-[13px] text-text-h outline-none focus:border-accent"
                          value={trigger.kind}
                          disabled={submitting}
                          onChange={(e) => updateTrigger(trigger.triggerId, { kind: e.target.value as 'SWITCH' | 'QUESTION' })}
                        >
                          <option value="SWITCH">Interruptor directo</option>
                          <option value="QUESTION">Pregunta</option>
                        </select>
                      </div>
                      <div>
                        <label className="mb-1.5 block text-[12px] font-medium text-text-h">Quién lo activa</label>
                        <select
                          className="w-full rounded-lg border border-border bg-bg px-[13px] py-[9px] text-[13px] text-text-h outline-none focus:border-accent"
                          value={trigger.activatedByRole}
                          disabled={submitting}
                          onChange={(e) => updateTrigger(trigger.triggerId, { activatedByRole: e.target.value as DualQuestRole })}
                        >
                          <option value="FIRE">🔥 Fuego</option>
                          <option value="WATER">💧 Agua</option>
                        </select>
                      </div>
                    </div>
                    <button
                      type="button"
                      className={`self-start rounded-lg border px-3 py-1.5 text-[12px] font-medium ${placementMode.kind === 'SWITCH' && placementMode.triggerId === trigger.triggerId ? 'border-accent bg-accent/10 text-accent' : 'border-border text-text-h'}`}
                      onClick={() => setPlacementMode({ kind: 'SWITCH', triggerId: trigger.triggerId })}
                      disabled={submitting}
                    >
                      Colocar interruptor en ({trigger.switchPosition.row},{trigger.switchPosition.col})
                    </button>

                    {trigger.kind === 'QUESTION' && (
                      <>
                        <TextField
                          label="Pregunta"
                          type="text"
                          value={trigger.prompt ?? ''}
                          disabled={submitting}
                          onChange={(v) => updateTrigger(trigger.triggerId, { prompt: v })}
                          onBlur={() => {}}
                        />
                        {[0, 1].map((optionIndex) => (
                          <div key={optionIndex} className="flex items-center gap-2">
                            <input
                              type="radio"
                              checked={(trigger.correctOptionIndex ?? 0) === optionIndex}
                              onChange={() => updateTrigger(trigger.triggerId, { correctOptionIndex: optionIndex })}
                              disabled={submitting}
                            />
                            <input
                              type="text"
                              placeholder={`Opción ${optionIndex + 1}`}
                              className="flex-1 rounded-lg border border-border bg-bg px-[13px] py-2 text-[13px] text-text-h outline-none focus:border-accent"
                              value={trigger.options?.[optionIndex] ?? ''}
                              disabled={submitting}
                              onChange={(e) => {
                                const options = [...(trigger.options ?? ['', ''])]
                                options[optionIndex] = e.target.value
                                updateTrigger(trigger.triggerId, { options })
                              }}
                            />
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                )}
              </div>
            )
          })}
          <button
            type="button"
            className="self-start rounded-lg border border-dashed border-border px-3.5 py-2 text-[13px] font-medium text-text-h"
            onClick={addGate}
            disabled={submitting}
          >
            + Agregar compuerta
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <p className="text-[13px] font-semibold text-text-h">
            Gemas fragmento — el orden de esta lista es el orden correcto del ensamblaje final
          </p>
          {gems.map((gem, index) => (
            <div key={gem.gemId} className="rounded-xl border border-border p-4">
              <div className="mb-2.5 flex items-center justify-between">
                <p className="text-[13px] font-semibold text-text-h">
                  #{index + 1} · {gem.role === 'FIRE' ? '🔥 Fuego' : '💧 Agua'}
                </p>
                {gems.length > MIN_GEMS_PER_ROLE * 2 && (
                  <button type="button" className="text-[12px] font-medium text-danger" onClick={() => removeGem(gem.gemId)} disabled={submitting}>
                    Quitar
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <TextField
                  label="Nombre del fragmento"
                  type="text"
                  value={gem.label}
                  disabled={submitting}
                  onChange={(v) => updateGem(gem.gemId, { label: v })}
                  onBlur={() => {}}
                />
                <button
                  type="button"
                  className={`self-end rounded-lg border px-3 py-2.5 text-[13px] font-medium ${placementMode.kind === 'GEM' && placementMode.gemId === gem.gemId ? 'border-accent bg-accent/10 text-accent' : 'border-border text-text-h'}`}
                  onClick={() => setPlacementMode({ kind: 'GEM', gemId: gem.gemId })}
                  disabled={submitting}
                >
                  Colocar en ({gem.position.row},{gem.position.col})
                </button>
              </div>
            </div>
          ))}
          <div className="flex gap-2">
            <button type="button" className="rounded-lg border border-dashed border-border px-3.5 py-2 text-[13px] font-medium text-text-h" onClick={() => addGem('FIRE')} disabled={submitting}>
              + Gema de Fuego
            </button>
            <button type="button" className="rounded-lg border border-dashed border-border px-3.5 py-2 text-[13px] font-medium text-text-h" onClick={() => addGem('WATER')} disabled={submitting}>
              + Gema de Agua
            </button>
          </div>
        </div>

        {error && (
          <p className="rounded-lg border border-danger/35 bg-danger/10 px-[13px] py-[11px] text-sm leading-snug text-danger" role="alert">
            {error}
          </p>
        )}

        <div className="flex gap-2">
          <button
            type="submit"
            className="rounded-lg px-4 py-2.5 text-[14px] font-semibold text-white shadow-[0_8px_20px_-8px_var(--accent)] transition-transform hover:not-disabled:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))' }}
            disabled={submitting}
          >
            {submitting ? 'Creando…' : 'Crear juego'}
          </button>
          <button
            type="button"
            className="rounded-lg border border-border px-4 py-2.5 text-[14px] font-medium text-text-h"
            onClick={onClose}
            disabled={submitting}
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  )
}

function ModeButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      className={`rounded-lg border px-3 py-1.5 text-[12px] font-medium ${active ? 'border-accent bg-accent/10 text-accent' : 'border-border text-text-h'}`}
      onClick={onClick}
    >
      {children}
    </button>
  )
}
