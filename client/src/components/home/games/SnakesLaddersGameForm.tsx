import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { TextField } from '../../TextField'
import { SaveVisibilityModal } from './SaveVisibilityModal'
import { ImageUploadField } from './ImageUploadField'
import { OrganizationSelectField } from './create/OrganizationSelectField'
import { useAuth } from '../../../hooks/useAuth'
import { useToast } from '../../../hooks/useToast'
import { createGame, publishGame } from '../../../services/game.service'
import { createCategory, listCategories, type CategoryWithGameCount } from '../../../services/category.service'
import { listMyOrganizations, type OrganizationWithMyRole } from '../../../services/organization.service'
import { ApiError } from '../../../utils/http'
import {
  DEFAULT_BOARD_SIZE,
  DEFAULT_TURN_DURATION_SECONDS,
  MAX_BOARD_SIZE,
  MIN_BOARD_SIZE,
  MIN_CELL_QUESTIONS,
} from './snakesLaddersTypes'

type LinkDraft = {
  from: number
  to: number
  prompt: string
  options: string[]
  correctOptionIndex: number
}

type CellQuestionDraft = {
  cellNumber: number
  prompt: string
  options: string[]
  correctOptionIndex: number
}

function emptyLink(from: number, to: number): LinkDraft {
  return { from, to, prompt: '', options: ['', ''], correctOptionIndex: 0 }
}

function emptyCellQuestion(cellNumber: number): CellQuestionDraft {
  return { cellNumber, prompt: '', options: ['', ''], correctOptionIndex: 0 }
}

type SnakesLaddersGameFormProps = {
  onClose: () => void
  onCreated: () => void
  onBack: () => void
  onCategoryCreated: () => void
}

/**
 * Crea un juego SNAKES_LADDERS en DRAFT, igual que Dominó: el creador decide
 * después si lo guarda en privado o lo publica. Cada escalera/serpiente se
 * edita junto con su reto (no como dos listas separadas que hay que
 * mantener sincronizadas a mano) — al enviar, se separan en `config`
 * (posiciones) y `content` (retos), como espera el validador del servidor.
 */
export function SnakesLaddersGameForm({ onClose, onCreated, onBack, onCategoryCreated }: SnakesLaddersGameFormProps) {
  const { token } = useAuth()
  const { showToast } = useToast()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null)
  const [boardSize, setBoardSize] = useState(DEFAULT_BOARD_SIZE)
  const [turnDurationSeconds, setTurnDurationSeconds] = useState(DEFAULT_TURN_DURATION_SECONDS)
  const [ladders, setLadders] = useState<LinkDraft[]>([emptyLink(4, 14)])
  const [snakes, setSnakes] = useState<LinkDraft[]>([emptyLink(17, 7)])
  const [cellQuestions, setCellQuestions] = useState<CellQuestionDraft[]>(
    Array.from({ length: MIN_CELL_QUESTIONS }, (_, i) => emptyCellQuestion(6 + i * 3)),
  )
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

  async function handleCreateCategory() {
    if (!token || !newCategoryName.trim()) return
    setCreatingCategory(true)
    setError(null)
    try {
      const category = await createCategory(token, newCategoryName.trim())
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

  function updateLink(list: LinkDraft[], setList: (v: LinkDraft[]) => void, index: number, patch: Partial<LinkDraft>) {
    setList(list.map((item, i) => (i === index ? { ...item, ...patch } : item)))
  }

  function updateLinkOption(
    list: LinkDraft[],
    setList: (v: LinkDraft[]) => void,
    index: number,
    optionIndex: number,
    value: string,
  ) {
    const item = list[index]
    const options = item.options.map((o, i) => (i === optionIndex ? value : o))
    updateLink(list, setList, index, { options })
  }

  function updateCellQuestion(index: number, patch: Partial<CellQuestionDraft>) {
    setCellQuestions(cellQuestions.map((item, i) => (i === index ? { ...item, ...patch } : item)))
  }

  function updateCellOption(index: number, optionIndex: number, value: string) {
    const item = cellQuestions[index]
    const options = item.options.map((o, i) => (i === optionIndex ? value : o))
    updateCellQuestion(index, { options })
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
    if (!Number.isInteger(boardSize) || boardSize < MIN_BOARD_SIZE || boardSize > MAX_BOARD_SIZE) {
      setError(`El tablero debe tener entre ${MIN_BOARD_SIZE} y ${MAX_BOARD_SIZE} casillas.`)
      return
    }
    if (ladders.length === 0 && snakes.length === 0) {
      setError('Agrega al menos una escalera o una serpiente.')
      return
    }
    if (cellQuestions.length < MIN_CELL_QUESTIONS) {
      setError(`Necesitas al menos ${MIN_CELL_QUESTIONS} retos de casilla normal.`)
      return
    }
    const allLinks = [...ladders, ...snakes]
    for (const link of allLinks) {
      if (!link.prompt.trim() || link.options.some((o) => !o.trim())) {
        setError('Cada escalera y serpiente necesita su reto completo (pregunta y opciones).')
        return
      }
    }
    for (const question of cellQuestions) {
      if (!question.prompt.trim() || question.options.some((o) => !o.trim())) {
        setError('Cada reto de casilla necesita pregunta y opciones completas.')
        return
      }
    }

    setSubmitting(true)
    setError(null)
    try {
      const game = await createGame(token, {
        title: title.trim(),
        description: description.trim(),
        gameType: 'SNAKES_LADDERS',
        categoryId,
        organizationId: organizationId || undefined,
        theme: coverImageUrl ? { coverImageUrl } : undefined,
        config: {
          boardSize,
          turnDurationSeconds,
          ladders: ladders.map((l) => ({ from: l.from, to: l.to })),
          snakes: snakes.map((s) => ({ from: s.from, to: s.to })),
        },
        content: [
          ...ladders.map((l) => ({
            cellNumber: l.from,
            triggerType: 'LADDER' as const,
            prompt: l.prompt.trim(),
            options: l.options.map((o) => o.trim()),
            correctOptionIndex: l.correctOptionIndex,
            difficulty: 'HIGH' as const,
          })),
          ...snakes.map((s) => ({
            cellNumber: s.from,
            triggerType: 'SNAKE' as const,
            prompt: s.prompt.trim(),
            options: s.options.map((o) => o.trim()),
            correctOptionIndex: s.correctOptionIndex,
          })),
          ...cellQuestions.map((q) => ({
            cellNumber: q.cellNumber,
            triggerType: 'CELL' as const,
            prompt: q.prompt.trim(),
            options: q.options.map((o) => o.trim()),
            correctOptionIndex: q.correctOptionIndex,
          })),
        ],
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
    <div className="mx-auto max-w-[680px] p-8">
      <button type="button" className="mb-3 text-[12.5px] font-medium text-accent hover:underline" onClick={onBack}>
        ← Cambiar tipo de juego
      </button>
      <h2 className="mb-1 text-[20px] tracking-tight text-text-h">Escaleras y Serpientes</h2>
      <p className="mb-6 text-[13px] text-text">
        El avance no depende del azar: cada escalera exige un reto de alta complejidad para subir, y cada
        serpiente da una oportunidad de recuperación antes de resbalar. Ciudad Sostenible es el tema por
        defecto, pero puedes cambiar la narrativa por completo con tus propias preguntas.
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

        <ImageUploadField
          label="Portada del juego (opcional)"
          imageUrl={coverImageUrl}
          folder="game-covers"
          disabled={submitting}
          onChange={setCoverImageUrl}
        />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-text-h" htmlFor="sl-board-size">
              Casillas del tablero
            </label>
            <input
              id="sl-board-size"
              type="number"
              min={MIN_BOARD_SIZE}
              max={MAX_BOARD_SIZE}
              className="w-full rounded-lg border border-border bg-bg px-[13px] py-[11px] text-[15px] text-text-h outline-none focus:border-accent"
              value={boardSize}
              disabled={submitting}
              onChange={(event) => setBoardSize(Number(event.target.value))}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-text-h" htmlFor="sl-turn-duration">
              Segundos por turno
            </label>
            <input
              id="sl-turn-duration"
              type="number"
              min={15}
              max={180}
              className="w-full rounded-lg border border-border bg-bg px-[13px] py-[11px] text-[15px] text-text-h outline-none focus:border-accent"
              value={turnDurationSeconds}
              disabled={submitting}
              onChange={(event) => setTurnDurationSeconds(Number(event.target.value))}
            />
          </div>
        </div>

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
              placeholder="¿No está tu materia? Créala aquí…"
              value={newCategoryName}
              disabled={submitting || creatingCategory}
              onChange={(event) => setNewCategoryName(event.target.value)}
            />
            <button
              type="button"
              className="shrink-0 rounded-lg border border-dashed border-border px-3 py-2 text-[12px] font-medium text-text-h disabled:cursor-not-allowed disabled:opacity-60"
              onClick={handleCreateCategory}
              disabled={submitting || creatingCategory || !newCategoryName.trim()}
            >
              {creatingCategory ? 'Creando…' : '+ Crear'}
            </button>
          </div>
        </div>

        <OrganizationSelectField organizations={organizations} value={organizationId} disabled={submitting} onChange={setOrganizationId} />

        <LinksSection
          title="Escaleras (innovaciones sostenibles)"
          accent="emerald"
          links={ladders}
          boardSize={boardSize}
          submitting={submitting}
          onAdd={() => setLadders([...ladders, emptyLink(2, 3)])}
          onRemove={(i) => setLadders(ladders.filter((_, idx) => idx !== i))}
          onChange={(i, patch) => updateLink(ladders, setLadders, i, patch)}
          onOptionChange={(i, oi, v) => updateLinkOption(ladders, setLadders, i, oi, v)}
        />

        <LinksSection
          title="Serpientes (desastres ambientales)"
          accent="rose"
          links={snakes}
          boardSize={boardSize}
          submitting={submitting}
          onAdd={() => setSnakes([...snakes, emptyLink(3, 2)])}
          onRemove={(i) => setSnakes(snakes.filter((_, idx) => idx !== i))}
          onChange={(i, patch) => updateLink(snakes, setSnakes, i, patch)}
          onOptionChange={(i, oi, v) => updateLinkOption(snakes, setSnakes, i, oi, v)}
        />

        <div className="flex flex-col gap-3">
          <p className="text-[13px] font-semibold text-text-h">
            Retos de casillas normales (mínimo {MIN_CELL_QUESTIONS})
          </p>
          {cellQuestions.map((question, index) => (
            <div key={index} className="rounded-xl border border-border p-4">
              <div className="mb-2.5 flex items-center justify-between">
                <p className="text-[13px] font-semibold text-text-h">Reto {index + 1}</p>
                {cellQuestions.length > MIN_CELL_QUESTIONS && (
                  <button
                    type="button"
                    className="text-[12px] font-medium text-danger"
                    onClick={() => setCellQuestions(cellQuestions.filter((_, i) => i !== index))}
                    disabled={submitting}
                  >
                    Quitar
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label className="mb-1.5 block text-[12px] font-medium text-text-h">Casilla</label>
                  <input
                    type="number"
                    min={2}
                    max={boardSize - 1}
                    className="w-full rounded-lg border border-border bg-bg px-[13px] py-[9px] text-[14px] text-text-h outline-none focus:border-accent"
                    value={question.cellNumber}
                    disabled={submitting}
                    onChange={(e) => updateCellQuestion(index, { cellNumber: Number(e.target.value) })}
                  />
                </div>
                <div className="sm:col-span-2">
                  <TextField
                    label="Pregunta"
                    type="text"
                    value={question.prompt}
                    disabled={submitting}
                    onChange={(v) => updateCellQuestion(index, { prompt: v })}
                    onBlur={() => {}}
                  />
                </div>
              </div>
              <OptionsEditor
                groupName={`cell-question-correct-${index}`}
                options={question.options}
                correctOptionIndex={question.correctOptionIndex}
                disabled={submitting}
                onOptionChange={(oi, v) => updateCellOption(index, oi, v)}
                onAddOption={() => updateCellQuestion(index, { options: [...question.options, ''] })}
                onRemoveOption={(oi) =>
                  updateCellQuestion(index, { options: question.options.filter((_, i) => i !== oi) })
                }
                onCorrectChange={(oi) => updateCellQuestion(index, { correctOptionIndex: oi })}
              />
            </div>
          ))}
          <button
            type="button"
            className="self-start rounded-lg border border-dashed border-border px-3.5 py-2 text-[13px] font-medium text-text-h"
            onClick={() => setCellQuestions([...cellQuestions, emptyCellQuestion(2)])}
            disabled={submitting}
          >
            + Agregar reto de casilla
          </button>
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

function LinksSection({
  title,
  accent,
  links,
  boardSize,
  submitting,
  onAdd,
  onRemove,
  onChange,
  onOptionChange,
}: {
  title: string
  accent: 'emerald' | 'rose'
  links: LinkDraft[]
  boardSize: number
  submitting: boolean
  onAdd: () => void
  onRemove: (index: number) => void
  onChange: (index: number, patch: Partial<LinkDraft>) => void
  onOptionChange: (index: number, optionIndex: number, value: string) => void
}) {
  const borderColor = accent === 'emerald' ? 'border-emerald-400/40' : 'border-rose-400/40'
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[13px] font-semibold text-text-h">{title}</p>
      {links.map((link, index) => (
        <div key={index} className={`rounded-xl border ${borderColor} p-4`}>
          <div className="mb-2.5 flex items-center justify-between">
            <p className="text-[13px] font-semibold text-text-h">
              {index + 1}. de casilla {link.from} a {link.to}
            </p>
            {links.length > 0 && (
              <button
                type="button"
                className="text-[12px] font-medium text-danger"
                onClick={() => onRemove(index)}
                disabled={submitting}
              >
                Quitar
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-text-h">Casilla origen</label>
              <input
                type="number"
                min={2}
                max={boardSize - 1}
                className="w-full rounded-lg border border-border bg-bg px-[13px] py-[9px] text-[14px] text-text-h outline-none focus:border-accent"
                value={link.from}
                disabled={submitting}
                onChange={(e) => onChange(index, { from: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-text-h">Casilla destino</label>
              <input
                type="number"
                min={2}
                max={boardSize - 1}
                className="w-full rounded-lg border border-border bg-bg px-[13px] py-[9px] text-[14px] text-text-h outline-none focus:border-accent"
                value={link.to}
                disabled={submitting}
                onChange={(e) => onChange(index, { to: Number(e.target.value) })}
              />
            </div>
          </div>
          <div className="mt-3">
            <TextField
              label="Reto"
              type="text"
              value={link.prompt}
              disabled={submitting}
              onChange={(v) => onChange(index, { prompt: v })}
              onBlur={() => {}}
            />
          </div>
          <OptionsEditor
            groupName={`${title}-correct-${index}`}
            options={link.options}
            correctOptionIndex={link.correctOptionIndex}
            disabled={submitting}
            onOptionChange={onOptionChange.bind(null, index)}
            onAddOption={() => onChange(index, { options: [...link.options, ''] })}
            onRemoveOption={(oi) => onChange(index, { options: link.options.filter((_, i) => i !== oi) })}
            onCorrectChange={(oi) => onChange(index, { correctOptionIndex: oi })}
          />
        </div>
      ))}
      <button
        type="button"
        className="self-start rounded-lg border border-dashed border-border px-3.5 py-2 text-[13px] font-medium text-text-h"
        onClick={onAdd}
        disabled={submitting}
      >
        + Agregar
      </button>
    </div>
  )
}

function OptionsEditor({
  groupName,
  options,
  correctOptionIndex,
  disabled,
  onOptionChange,
  onAddOption,
  onRemoveOption,
  onCorrectChange,
}: {
  groupName: string
  options: string[]
  correctOptionIndex: number
  disabled: boolean
  onOptionChange: (optionIndex: number, value: string) => void
  onAddOption: () => void
  onRemoveOption: (optionIndex: number) => void
  onCorrectChange: (optionIndex: number) => void
}) {
  return (
    <div className="mt-3 flex flex-col gap-2">
      <p className="text-[12px] font-medium text-text-h">Opciones (marca la correcta)</p>
      {options.map((option, optionIndex) => (
        <div key={optionIndex} className="flex items-center gap-2">
          <input
            type="radio"
            name={groupName}
            checked={correctOptionIndex === optionIndex}
            onChange={() => onCorrectChange(optionIndex)}
            disabled={disabled}
          />
          <input
            type="text"
            className="flex-1 rounded-lg border border-border bg-bg px-[13px] py-2 text-[13px] text-text-h outline-none focus:border-accent"
            value={option}
            disabled={disabled}
            onChange={(e) => onOptionChange(optionIndex, e.target.value)}
          />
          {options.length > 2 && (
            <button
              type="button"
              className="text-[11px] font-medium text-danger"
              onClick={() => onRemoveOption(optionIndex)}
              disabled={disabled}
            >
              Quitar
            </button>
          )}
        </div>
      ))}
      {options.length < 6 && (
        <button
          type="button"
          className="self-start text-[11.5px] font-medium text-accent"
          onClick={onAddOption}
          disabled={disabled}
        >
          + Agregar opción
        </button>
      )}
    </div>
  )
}
