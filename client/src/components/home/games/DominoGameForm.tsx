import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { TextField } from '../../TextField'
import { SaveVisibilityModal } from './SaveVisibilityModal'
import { ImageUploadField } from './ImageUploadField'
import { IconPickerField } from './IconPickerField'
import { AiGameAssistantPanel } from './AiGameAssistantPanel'
import { GameFormShell } from './GameFormShell'
import { WizardPhaseNav } from './WizardPhaseNav'
import type { GameDraft } from '../../../services/ai-game-assistant.service'
import { OrganizationSelectField } from './create/OrganizationSelectField'
import { CategorySelectField } from './create/CategorySelectField'
import { useCreateGameProgress } from './create/CreateGameProgressContext'
import { useAuth } from '../../../hooks/useAuth'
import { useToast } from '../../../hooks/useToast'
import { createGame, publishGame } from '../../../services/game.service'
import {
  listSubjects as listCategories,
  type SubjectWithGameCount as CategoryWithGameCount,
} from '../../../services/subject.service'
import { listMyOrganizations, type OrganizationWithMyRole } from '../../../services/organization.service'
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

/**
 * Fases del formulario (issue #218): antes era un único scroll largo
 * validado solo al submit final; ahora se fragmenta en 3 pasos lógicos, cada
 * uno con su propia validación antes de dejar avanzar.
 */
const PHASES = [
  { label: 'Identidad del juego' },
  { label: 'Configuración del juego' },
  { label: 'Contenido: conceptos' },
] as const
const TOTAL_PHASES = PHASES.length

type DominoGameFormProps = {
  onClose: () => void
  /**
   * Se dispara tras elegir visibilidad en SaveVisibilityModal, con el id del
   * juego recién creado y dónde quedó guardado — para que quien llama pueda
   * redirigir al listado correcto y destacar la tarjeta (issue #218).
   */
  onCreated: (gameId: string, visibility: 'private' | 'community') => void
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
  const [organizations, setOrganizations] = useState<OrganizationWithMyRole[]>([])
  const [organizationId, setOrganizationId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [createdGameId, setCreatedGameId] = useState<string | null>(null)
  const [phase, setPhase] = useState(0)
  const { setSubPhase } = useCreateGameProgress()

  // Informa al header del wizard (CreateGameLayout) en qué fase va este
  // formulario, para que "Paso X de Y" cuente las 3 sub-fases — se limpia al
  // desmontar (ej. al volver a elegir tipo de juego).
  useEffect(() => {
    setSubPhase({ phase: phase + 1, totalPhases: TOTAL_PHASES, phaseLabel: PHASES[phase].label })
    return () => setSubPhase(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

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

  function applyAiDraft(draft: GameDraft) {
    const items = Array.isArray(draft.content) ? draft.content : []
    setConcepts(
      items.map((item, index) => {
        const raw = (item ?? {}) as Record<string, unknown>
        return {
          label: typeof raw.label === 'string' ? raw.label : '',
          icon: typeof raw.icon === 'string' && DOMINO_ICON_KEYS.includes(raw.icon)
            ? raw.icon
            : DOMINO_ICON_KEYS[index % DOMINO_ICON_KEYS.length],
          color: typeof raw.color === 'string' ? raw.color : SUGGESTED_COLORS[index % SUGGESTED_COLORS.length],
        }
      }),
    )
    const config = (draft.config ?? {}) as Record<string, unknown>
    if (typeof config.handSize === 'number') setHandSize(config.handSize)
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

  /** Valida solo los campos de la fase 1 (Identidad): título, descripción, materia. */
  function validateIdentityPhase(): string | null {
    if (!title.trim() || title.trim().length < 3) {
      return 'El título debe tener al menos 3 caracteres.'
    }
    if (!description.trim() || description.trim().length < 10) {
      return 'La descripción debe tener al menos 10 caracteres.'
    }
    if (!categoryId) {
      return 'Elige una materia para el juego.'
    }
    return null
  }

  /** Valida solo los campos de la fase 2 (Configuración): parámetros propios del tipo de juego. */
  function validateConfigPhase(): string | null {
    if (!Number.isInteger(handSize) || handSize < 3 || handSize > 12) {
      return 'Las fichas iniciales deben ser un entero entre 3 y 12.'
    }
    return null
  }

  /** Valida solo los campos de la fase 3 (Contenido): el bloque repetible de conceptos. */
  function validateContentPhase(): string | null {
    if (concepts.length < MIN_DOMINO_CONCEPTS) {
      return `Necesitas al menos ${MIN_DOMINO_CONCEPTS} conceptos.`
    }
    if (concepts.length > MAX_DOMINO_CONCEPTS) {
      return `El dominó admite como máximo ${MAX_DOMINO_CONCEPTS} conceptos.`
    }
    if (concepts.some((concept) => !concept.label.trim())) {
      return 'Cada concepto necesita un nombre antes de crear el juego.'
    }
    const labels = concepts.map((concept) => concept.label.trim().toLowerCase())
    if (new Set(labels).size !== labels.length) {
      return 'No puede haber dos conceptos con el mismo nombre.'
    }
    return null
  }

  const VALIDATORS = [validateIdentityPhase, validateConfigPhase, validateContentPhase]

  function goToNextPhase() {
    const validationError = VALIDATORS[phase]()
    if (validationError) {
      setError(validationError)
      return
    }
    setError(null)
    setPhase((current) => Math.min(current + 1, TOTAL_PHASES - 1))
  }

  function goToPreviousPhase() {
    setError(null)
    setPhase((current) => Math.max(current - 1, 0))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!token) return

    // Al llegar aquí ya se validó fase por fase al avanzar, pero se revalida
    // todo por si el usuario retrocedió y cambió algo — no cuesta nada y
    // evita depender únicamente del orden de navegación.
    for (const validate of VALIDATORS) {
      const validationError = validate()
      if (validationError) {
        setError(validationError)
        return
      }
    }

    setSubmitting(true)
    setError(null)
    try {
      const game = await createGame(token, {
        title: title.trim(),
        description: description.trim(),
        gameType: 'DOMINO',
        categoryId,
        organizationId: organizationId || undefined,
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
    onCreated(createdGameId, visibility)
  }

  if (createdGameId) {
    return <SaveVisibilityModal onChoose={handleChooseVisibility} />
  }

  const tileCount = (concepts.length * (concepts.length + 1)) / 2

  return (
    <GameFormShell
      backLabel="Cambiar tipo de juego"
      onBack={onBack}
      title="Dominó"
      description={
        <>
          Cada mitad de una ficha es un concepto tuyo en vez de un número. Con {concepts.length}{' '}
          conceptos el set queda en {tileCount} fichas — se juega solo contra el tablero, empatando
          los extremos abiertos.
        </>
      }
      aiPanel={<AiGameAssistantPanel gameType="DOMINO" disabled={submitting} onDraftReady={applyAiDraft} />}
    >
      <form className="flex flex-col gap-[16px]" onSubmit={handleSubmit} noValidate>
        <p className="text-[11.5px] font-semibold uppercase tracking-wide text-accent">
          Fase {phase + 1} de {TOTAL_PHASES} · {PHASES[phase].label}
        </p>

        {phase === 0 && (
          <div className="flex flex-col gap-[16px] animate-[fade-in-up_0.25s_ease-out_backwards]">
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

            <CategorySelectField
              token={token}
              categories={categories}
              categoryId={categoryId}
              onCategoryIdChange={setCategoryId}
              onCategoryCreated={(category) => {
                setCategories((current) => [...current, category])
                onCategoryCreated()
              }}
              disabled={submitting}
              showToast={showToast}
            />

            <OrganizationSelectField
              organizations={organizations}
              value={organizationId}
              disabled={submitting}
              onChange={setOrganizationId}
            />
          </div>
        )}

        {phase === 1 && (
          <div className="flex flex-col gap-[16px] animate-[fade-in-up_0.25s_ease-out_backwards]">
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
          </div>
        )}

        {phase === 2 && (
        <div className="grid grid-cols-1 gap-3 animate-[fade-in-up_0.25s_ease-out_backwards] xl:grid-cols-2">
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
                    <IconPickerField
                      id={`concept-icon-${index}`}
                      value={concept.icon}
                      labels={DOMINO_ICON_LABELS}
                      disabled={submitting}
                      onChange={(key) => updateConcept(index, 'icon', key)}
                    />
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

          {concepts.length < MAX_DOMINO_CONCEPTS && (
            <button
              type="button"
              className="self-start rounded-lg border border-dashed border-border px-3.5 py-2 text-[13px] font-medium text-text-h xl:col-span-2"
              onClick={addConcept}
              disabled={submitting}
            >
              + Agregar concepto
            </button>
          )}
        </div>
        )}

        {error && (
          <p
            className="rounded-lg border border-danger/35 bg-danger/10 px-[13px] py-[11px] text-sm leading-snug text-danger"
            role="alert"
          >
            {error}
          </p>
        )}

        <WizardPhaseNav
          onBack={phase === 0 ? onBack : goToPreviousPhase}
          backLabel={phase === 0 ? 'Cambiar tipo de juego' : 'Atrás'}
          onNext={goToNextPhase}
          isLastPhase={phase === TOTAL_PHASES - 1}
          submitting={submitting}
        />

        {phase === TOTAL_PHASES - 1 && (
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
              onClick={goToPreviousPhase}
              disabled={submitting}
            >
              ← Atrás
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
        )}
      </form>
    </GameFormShell>
  )
}
