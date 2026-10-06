import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { TextField } from '../../TextField'
import { SaveVisibilityModal } from './SaveVisibilityModal'
import { ImageUploadField } from './ImageUploadField'
import { AudioUploadField } from './AudioUploadField'
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

type CardDraft = {
  imageUrl: string | null
  label: string
  audioUrl: string | null
  /** Dato breve opcional sobre el tema de la tarjeta (ej. dato de un país si es una bandera). */
  info: string
}

const EMPTY_CARD: CardDraft = { imageUrl: null, label: '', audioUrl: null, info: '' }
const MIN_CARDS = 12
const MAX_INFO_LENGTH = 500
const DEFAULT_MAX_ACCUSATION_COUNT = 6

/**
 * Fases del formulario (issue #218): antes era un único scroll largo
 * validado solo al submit final; ahora se fragmenta en 3 pasos lógicos, cada
 * uno con su propia validación antes de dejar avanzar.
 */
const PHASES = [
  { label: 'Identidad del juego' },
  { label: 'Configuración del juego' },
  { label: 'Contenido: tarjetas' },
] as const
const TOTAL_PHASES = PHASES.length

type GuessWhoGameFormProps = {
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
 * Crea un juego GUESS_WHO en DRAFT (sin publicar): a diferencia de las cartas
 * de memoria, este tipo se juega en una sala multijugador en vivo, así que no
 * tiene sentido "publicarlo" automáticamente — el creador decide cuándo abrir
 * una sala desde el detalle del juego.
 */
export function GuessWhoGameForm({
  onClose,
  onCreated,
  onBack,
  onCategoryCreated,
}: GuessWhoGameFormProps) {
  const { token } = useAuth()
  const { showToast } = useToast()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null)
  const [cards, setCards] = useState<CardDraft[]>(
    Array.from({ length: MIN_CARDS }, () => ({ ...EMPTY_CARD })),
  )
  const [maxAccusationCount, setMaxAccusationCount] = useState(DEFAULT_MAX_ACCUSATION_COUNT)
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
    setCards(
      items.map((item) => {
        const raw = (item ?? {}) as Record<string, unknown>
        return {
          imageUrl: typeof raw.imageUrl === 'string' ? raw.imageUrl : null,
          label: typeof raw.label === 'string' ? raw.label : '',
          audioUrl: typeof raw.audioUrl === 'string' ? raw.audioUrl : null,
          info: typeof raw.info === 'string' ? raw.info : '',
        }
      }),
    )
    const config = (draft.config ?? {}) as Record<string, unknown>
    if (typeof config.maxAccusationCount === 'number') setMaxAccusationCount(config.maxAccusationCount)
  }

  function updateCard<K extends keyof CardDraft>(index: number, field: K, value: CardDraft[K]) {
    setCards((current) => current.map((card, i) => (i === index ? { ...card, [field]: value } : card)))
  }

  function addCard() {
    setCards((current) => [...current, { ...EMPTY_CARD }])
  }

  function removeCard(index: number) {
    setCards((current) => (current.length > MIN_CARDS ? current.filter((_, i) => i !== index) : current))
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
    if (!Number.isInteger(maxAccusationCount) || maxAccusationCount < 2 || maxAccusationCount > 12) {
      return 'Las cartas restantes para acusar deben ser un entero entre 2 y 12.'
    }
    return null
  }

  /** Valida solo los campos de la fase 3 (Contenido): el bloque repetible de tarjetas. */
  function validateContentPhase(): string | null {
    if (cards.length < MIN_CARDS) {
      return `Necesitas al menos ${MIN_CARDS} tarjetas.`
    }
    const incompleteCard = cards.some((card) => !card.label.trim() || !card.imageUrl)
    if (incompleteCard) {
      return 'Cada tarjeta necesita una imagen y un nombre antes de crear el juego.'
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
        gameType: 'GUESS_WHO',
        categoryId,
        organizationId: organizationId || undefined,
        theme: coverImageUrl ? { coverImageUrl } : undefined,
        content: cards.map((card) => ({
          imageUrl: card.imageUrl as string,
          label: card.label.trim(),
          audioUrl: card.audioUrl,
          info: card.info.trim() || null,
        })),
        config: { maxAccusationCount },
      })
      // El juego queda en DRAFT; la elección de dónde guardarlo (privado o
      // publicado a la comunidad) se hace en el paso siguiente.
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
  }

  if (createdGameId) {
    return (
      <SaveVisibilityModal
        onChoose={handleChooseVisibility}
        onDone={(visibility) => onCreated(createdGameId, visibility)}
        gameKind="GUESS_WHO"
        gameTitle={title.trim()}
      />
    )
  }

  return (
    <GameFormShell
      backLabel="Cambiar tipo de juego"
      onBack={onBack}
      title="¿Quién Es?"
      description="Cada tarjeta tiene una imagen, un nombre y un audio opcional. Se juega en una sala en vivo entre 2 personas — abre la sala desde el detalle del juego una vez creado."
      aiPanel={
        <AiGameAssistantPanel
          gameType="GUESS_WHO"
          disabled={submitting}
          imagesRequired={{ min: MIN_CARDS, max: 60, enforceMinimum: false }}
          onDraftReady={applyAiDraft}
        />
      }
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
              <label className="mb-1.5 block text-[13px] font-medium text-text-h" htmlFor="max-accusation-count">
                Cartas restantes para poder acusar
              </label>
              <input
                id="max-accusation-count"
                type="number"
                min={2}
                max={12}
                className="w-full rounded-lg border border-border bg-bg px-[13px] py-[11px] text-[15px] text-text-h outline-none focus:border-accent"
                value={maxAccusationCount}
                disabled={submitting}
                onChange={(event) => setMaxAccusationCount(Number(event.target.value))}
              />
              <p className="mt-1 text-[11.5px] text-text">Entre 2 y 12 tarjetas.</p>
            </div>
          </div>
        )}

        {phase === 2 && (
        <div className="grid grid-cols-1 gap-3 animate-[fade-in-up_0.25s_ease-out_backwards] xl:grid-cols-2">
          {cards.map((card, index) => (
            <div key={index} className="rounded-xl border border-border p-4">
              <div className="mb-2.5 flex items-center justify-between">
                <p className="text-[13px] font-semibold text-text-h">Tarjeta {index + 1}</p>
                {cards.length > MIN_CARDS && (
                  <button
                    type="button"
                    className="text-[12px] font-medium text-danger"
                    onClick={() => removeCard(index)}
                    disabled={submitting}
                  >
                    Quitar
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <TextField
                  label="Nombre"
                  type="text"
                  value={card.label}
                  disabled={submitting}
                  onChange={(value) => updateCard(index, 'label', value)}
                  onBlur={() => {}}
                />
                <ImageUploadField
                  label="Imagen"
                  imageUrl={card.imageUrl}
                  folder="guess-who-cards"
                  disabled={submitting}
                  onChange={(url) => updateCard(index, 'imageUrl', url)}
                />
              </div>
              <div className="mt-3">
                <AudioUploadField
                  label="Audio (opcional)"
                  audioUrl={card.audioUrl}
                  folder="guess-who-audio"
                  disabled={submitting}
                  onChange={(url) => updateCard(index, 'audioUrl', url)}
                />
              </div>
              <div className="mt-3">
                <label
                  className="mb-1.5 block text-[13px] font-medium text-text-h"
                  htmlFor={`card-info-${index}`}
                >
                  Dato curioso (opcional)
                </label>
                <textarea
                  id={`card-info-${index}`}
                  rows={2}
                  maxLength={MAX_INFO_LENGTH}
                  className="w-full resize-none rounded-lg border border-border bg-bg px-[13px] py-[11px] text-[13.5px] text-text-h outline-none focus:border-accent"
                  placeholder="Ej. su capital es Buenos Aires y es el país de habla hispana más grande del mundo."
                  value={card.info}
                  disabled={submitting}
                  onChange={(event) => updateCard(index, 'info', event.target.value)}
                />
                <p className="mt-1 text-[11.5px] text-text">
                  Aparece como una burbuja de información en la tarjeta durante el juego.
                </p>
              </div>
            </div>
          ))}

          <button
            type="button"
            className="self-start rounded-lg border border-dashed border-border px-3.5 py-2 text-[13px] font-medium text-text-h xl:col-span-2"
            onClick={addCard}
            disabled={submitting}
          >
            + Agregar tarjeta
          </button>
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
