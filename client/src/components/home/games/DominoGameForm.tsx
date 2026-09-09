import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { TextField } from '../../TextField'
import { Modal } from './Modal'
import { SaveVisibilityModal } from './SaveVisibilityModal'
import { ImageUploadField } from './ImageUploadField'
import { useAuth } from '../../../hooks/useAuth'
import { useToast } from '../../../hooks/useToast'
import { createGame, publishGame } from '../../../services/game.service'
import { createCategory, listCategories, type CategoryWithGameCount } from '../../../services/category.service'
import { ApiError } from '../../../utils/http'
import {
  DEFAULT_DOMINO_CONFIG,
  DOMINO_ICON_KEYS,
  DOMINO_ICON_LABELS,
  MAX_DOMINO_CONCEPTS,
  MIN_DOMINO_CONCEPTS,
  iconForConcept,
} from './dominoTypes'

type ConceptDraft = {
  label: string
  icon: string
  color: string
}

/** Paleta sugerida: colores bien diferenciables entre sí, para que las mitades de ficha no se confundan de un vistazo. */
const SUGGESTED_COLORS = [
  '#f59e0b',
  '#22c55e',
  '#3b82f6',
  '#14b8a6',
  '#06b6d4',
  '#8b5cf6',
  '#ec4899',
  '#ef4444',
  '#84cc16',
  '#f97316',
]

function emptyConcept(index: number): ConceptDraft {
  return {
    label: '',
    icon: DOMINO_ICON_KEYS[index % DOMINO_ICON_KEYS.length],
    color: SUGGESTED_COLORS[index % SUGGESTED_COLORS.length],
  }
}

type DominoGameFormProps = {
  onClose: () => void
  onCreated: () => void
  onBack: () => void
  onCategoryCreated: () => void
}

/**
 * Crea un juego DOMINO en DRAFT (sin publicar), igual que GuessWhoGameForm:
 * el creador decide en el paso siguiente si lo guarda en privado o lo publica
 * a la comunidad. El contenido son los conceptos que reemplazan a los números
 * de las fichas — el set de fichas lo genera el reproductor a partir de ellos.
 */
export function DominoGameForm({
  onClose,
  onCreated,
  onBack,
  onCategoryCreated,
}: DominoGameFormProps) {
  const { token } = useAuth()
  const { showToast } = useToast()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null)
  const [concepts, setConcepts] = useState<ConceptDraft[]>(
    Array.from({ length: MIN_DOMINO_CONCEPTS }, (_, index) => emptyConcept(index)),
  )
  const [handSize, setHandSize] = useState(DEFAULT_DOMINO_CONFIG.handSize)
  const [categories, setCategories] = useState<CategoryWithGameCount[]>([])
  const [categoryId, setCategoryId] = useState('')
  const [newCategoryName, setNewCategoryName] = useState('')
  const [creatingCategory, setCreatingCategory] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [createdGameId, setCreatedGameId] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    listCategories(token)
      .then((items) => setCategories(items))
      .catch(() => {})
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

  function updateConcept<K extends keyof ConceptDraft>(index: number, field: K, value: ConceptDraft[K]) {
    setConcepts((current) =>
      current.map((concept, i) => (i === index ? { ...concept, [field]: value } : concept)),
    )
  }

  function addConcept() {
    setConcepts((current) =>
      current.length < MAX_DOMINO_CONCEPTS ? [...current, emptyConcept(current.length)] : current,
    )
  }

  function removeConcept(index: number) {
    setConcepts((current) =>
      current.length > MIN_DOMINO_CONCEPTS ? current.filter((_, i) => i !== index) : current,
    )
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
    if (concepts.length < MIN_DOMINO_CONCEPTS) {
      setError(`Necesitas al menos ${MIN_DOMINO_CONCEPTS} conceptos.`)
      return
    }
    if (concepts.length > MAX_DOMINO_CONCEPTS) {
      setError(`El dominó admite como máximo ${MAX_DOMINO_CONCEPTS} conceptos.`)
      return
    }
    if (!Number.isInteger(handSize) || handSize < 3 || handSize > 12) {
      setError('Las fichas iniciales deben ser un entero entre 3 y 12.')
      return
    }
    if (concepts.some((concept) => !concept.label.trim())) {
      setError('Cada concepto necesita un nombre antes de crear el juego.')
      return
    }
    const labels = concepts.map((concept) => concept.label.trim().toLowerCase())
    if (new Set(labels).size !== labels.length) {
      setError('No puede haber dos conceptos con el mismo nombre.')
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      const game = await createGame(token, {
        title: title.trim(),
        description: description.trim(),
        gameType: 'DOMINO',
        categoryId,
        theme: coverImageUrl ? { coverImageUrl } : undefined,
        content: concepts.map((concept) => ({
          label: concept.label.trim(),
          icon: concept.icon,
          color: concept.color,
        })),
        config: { handSize },
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

  const tileCount = (concepts.length * (concepts.length + 1)) / 2

  return (
    <Modal onClose={onClose} maxWidthClassName="max-w-[640px]">
      <button
        type="button"
        className="mb-3 text-[12.5px] font-medium text-accent hover:underline"
        onClick={onBack}
      >
        ← Cambiar tipo de juego
      </button>
      <h2 className="mb-1 text-[20px] tracking-tight text-text-h">Dominó</h2>
      <p className="mb-6 text-[13px] text-text">
        Cada mitad de una ficha es un concepto tuyo en vez de un número. Con {concepts.length}{' '}
        conceptos el set queda en {tileCount} fichas — se juega solo contra el tablero, empatando
        los extremos abiertos.
      </p>

      <form className="flex flex-col gap-[16px]" onSubmit={handleSubmit} noValidate>
        <TextField
          label="Título del juego"
          type="text"
          value={title}
          disabled={submitting}
          onChange={setTitle}
          onBlur={() => {}}
        />
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

        <div>
          <label className="mb-1.5 block text-[13px] font-medium text-text-h" htmlFor="domino-hand-size">
            Fichas que recibe el jugador
          </label>
          <input
            id="domino-hand-size"
            type="number"
            min={3}
            max={12}
            className="w-full rounded-lg border border-border bg-bg px-[13px] py-[11px] text-[15px] text-text-h outline-none focus:border-accent"
            value={handSize}
            disabled={submitting}
            onChange={(event) => setHandSize(Number(event.target.value))}
          />
          <p className="mt-1 text-[11.5px] text-text">Entre 3 y 12 fichas; el resto queda en el pozo.</p>
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

        <div className="flex flex-col gap-3">
          {concepts.map((concept, index) => {
            const Icon = iconForConcept(concept.icon)
            return (
              <div key={index} className="rounded-xl border border-border p-4">
                <div className="mb-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4" style={{ color: concept.color }} strokeWidth={2} />
                    <p className="text-[13px] font-semibold text-text-h">Concepto {index + 1}</p>
                  </div>
                  {concepts.length > MIN_DOMINO_CONCEPTS && (
                    <button
                      type="button"
                      className="text-[12px] font-medium text-danger"
                      onClick={() => removeConcept(index)}
                      disabled={submitting}
                    >
                      Quitar
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="sm:col-span-1">
                    <TextField
                      label="Nombre"
                      type="text"
                      value={concept.label}
                      disabled={submitting}
                      onChange={(value) => updateConcept(index, 'label', value)}
                      onBlur={() => {}}
                    />
                  </div>
                  <div>
                    <label
                      className="mb-1.5 block text-[13px] font-medium text-text-h"
                      htmlFor={`concept-icon-${index}`}
                    >
                      Ícono
                    </label>
                    <select
                      id={`concept-icon-${index}`}
                      className="w-full rounded-lg border border-border bg-bg px-[13px] py-[11px] text-[15px] text-text-h outline-none focus:border-accent"
                      value={concept.icon}
                      disabled={submitting}
                      onChange={(event) => updateConcept(index, 'icon', event.target.value)}
                    >
                      {DOMINO_ICON_KEYS.map((key) => (
                        <option key={key} value={key}>
                          {DOMINO_ICON_LABELS[key] ?? key}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label
                      className="mb-1.5 block text-[13px] font-medium text-text-h"
                      htmlFor={`concept-color-${index}`}
                    >
                      Color
                    </label>
                    <input
                      id={`concept-color-${index}`}
                      type="color"
                      className="h-[45px] w-full cursor-pointer rounded-lg border border-border bg-bg px-2 py-1.5 outline-none focus:border-accent"
                      value={concept.color}
                      disabled={submitting}
                      onChange={(event) => updateConcept(index, 'color', event.target.value)}
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {concepts.length < MAX_DOMINO_CONCEPTS && (
          <button
            type="button"
            className="self-start rounded-lg border border-dashed border-border px-3.5 py-2 text-[13px] font-medium text-text-h"
            onClick={addConcept}
            disabled={submitting}
          >
            + Agregar concepto
          </button>
        )}

        {error && (
          <p
            className="rounded-lg border border-danger/35 bg-danger/10 px-[13px] py-[11px] text-sm leading-snug text-danger"
            role="alert"
          >
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
    </Modal>
  )
}
