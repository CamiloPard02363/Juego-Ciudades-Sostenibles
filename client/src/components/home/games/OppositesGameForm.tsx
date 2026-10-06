import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { TextField } from '../../TextField'
import { SaveVisibilityModal } from './SaveVisibilityModal'
import { ImageUploadField } from './ImageUploadField'
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

type PairDraft = {
  posTitle: string
  posDescription: string
  posImageUrl: string | null
  negTitle: string
  negDescription: string
  negImageUrl: string | null
}

const EMPTY_PAIR: PairDraft = {
  posTitle: '',
  posDescription: '',
  posImageUrl: null,
  negTitle: '',
  negDescription: '',
  negImageUrl: null,
}

/**
 * Fases del formulario (issue #218): este tipo de juego no tiene parámetros
 * de configuración propios (el modo "OPPOSITES" es fijo), así que en vez de
 * forzar una fase de Configuración vacía se queda en 2 fases: Identidad y
 * Contenido.
 */
const PHASES = [{ label: 'Identidad del juego' }, { label: 'Contenido: parejas' }] as const
const TOTAL_PHASES = PHASES.length

type OppositesGameFormProps = {
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

export function OppositesGameForm({
  onClose,
  onCreated,
  onBack,
  onCategoryCreated,
}: OppositesGameFormProps) {
  const { token } = useAuth()
  const { showToast } = useToast()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null)
  const [pairs, setPairs] = useState<PairDraft[]>([{ ...EMPTY_PAIR }, { ...EMPTY_PAIR }])
  const [categories, setCategories] = useState<CategoryWithGameCount[]>([])
  const [categoryId, setCategoryId] = useState('')
  const [organizations, setOrganizations] = useState<OrganizationWithMyRole[]>([])
  const [organizationId, setOrganizationId] = useState('')
  const [createdGameId, setCreatedGameId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [phase, setPhase] = useState(0)
  const { setSubPhase } = useCreateGameProgress()

  // Informa al header del wizard (CreateGameLayout) en qué fase va este
  // formulario, para que "Paso X de Y" cuente las sub-fases — se limpia al
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
    setPairs(
      items.map((item) => {
        const raw = (item ?? {}) as Record<string, unknown>
        return {
          posTitle: typeof raw.posTitle === 'string' ? raw.posTitle : '',
          posDescription: typeof raw.posDescription === 'string' ? raw.posDescription : '',
          posImageUrl: typeof raw.posImageUrl === 'string' ? raw.posImageUrl : null,
          negTitle: typeof raw.negTitle === 'string' ? raw.negTitle : '',
          negDescription: typeof raw.negDescription === 'string' ? raw.negDescription : '',
          negImageUrl: typeof raw.negImageUrl === 'string' ? raw.negImageUrl : null,
        }
      }),
    )
  }

  function updatePair<K extends keyof PairDraft>(index: number, field: K, value: PairDraft[K]) {
    setPairs((current) =>
      current.map((pair, i) => (i === index ? { ...pair, [field]: value } : pair)),
    )
  }

  function addPair() {
    setPairs((current) => [...current, { ...EMPTY_PAIR }])
  }

  function removePair(index: number) {
    setPairs((current) => (current.length > 2 ? current.filter((_, i) => i !== index) : current))
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

  /** Valida solo los campos de la fase 2 (Contenido): el bloque repetible de parejas. */
  function validateContentPhase(): string | null {
    const incompletePair = pairs.some(
      (pair) =>
        !pair.posTitle.trim() ||
        !pair.posDescription.trim() ||
        !pair.negTitle.trim() ||
        !pair.negDescription.trim(),
    )
    if (incompletePair) {
      return 'Completa todos los campos de cada pareja antes de crear el juego.'
    }
    return null
  }

  const VALIDATORS = [validateIdentityPhase, validateContentPhase]

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
        gameType: 'MEMORY_MATCH',
        categoryId,
        organizationId: organizationId || undefined,
        theme: coverImageUrl ? { coverImageUrl } : undefined,
        config: { mode: 'OPPOSITES' },
        content: pairs.map((pair) => ({
          posTitle: pair.posTitle.trim(),
          posDescription: pair.posDescription.trim(),
          posImageUrl: pair.posImageUrl,
          negTitle: pair.negTitle.trim(),
          negDescription: pair.negDescription.trim(),
          negImageUrl: pair.negImageUrl,
        })),
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
        gameKind="OPPOSITES"
        gameTitle={title.trim()}
      />
    )
  }

  return (
    <GameFormShell
      backLabel="Cambiar modo"
      onBack={onBack}
      title="Conceptos opuestos"
      description="Cada pareja tiene un aspecto positivo y su contraparte negativa."
      aiPanel={
        <AiGameAssistantPanel gameType="MEMORY_MATCH" mode="OPPOSITES" disabled={submitting} onDraftReady={applyAiDraft} />
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
        <div className="grid grid-cols-1 gap-3 animate-[fade-in-up_0.25s_ease-out_backwards] xl:grid-cols-2">
          {pairs.map((pair, index) => (
            <div key={index} className="rounded-xl border border-border p-4">
              <div className="mb-2.5 flex items-center justify-between">
                <p className="text-[13px] font-semibold text-text-h">Pareja {index + 1}</p>
                {pairs.length > 2 && (
                  <button
                    type="button"
                    className="text-[12px] font-medium text-danger"
                    onClick={() => removePair(index)}
                    disabled={submitting}
                  >
                    Quitar
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <TextField
                  label="Positivo · Título"
                  type="text"
                  value={pair.posTitle}
                  disabled={submitting}
                  onChange={(value) => updatePair(index, 'posTitle', value)}
                  onBlur={() => {}}
                />
                <TextField
                  label="Negativo · Título"
                  type="text"
                  value={pair.negTitle}
                  disabled={submitting}
                  onChange={(value) => updatePair(index, 'negTitle', value)}
                  onBlur={() => {}}
                />
                <TextField
                  label="Positivo · Descripción"
                  type="text"
                  value={pair.posDescription}
                  disabled={submitting}
                  onChange={(value) => updatePair(index, 'posDescription', value)}
                  onBlur={() => {}}
                />
                <TextField
                  label="Negativo · Descripción"
                  type="text"
                  value={pair.negDescription}
                  disabled={submitting}
                  onChange={(value) => updatePair(index, 'negDescription', value)}
                  onBlur={() => {}}
                />
                <ImageUploadField
                  label="Positivo · Imagen (opcional)"
                  imageUrl={pair.posImageUrl}
                  folder="memory-cards"
                  disabled={submitting}
                  onChange={(url) => updatePair(index, 'posImageUrl', url)}
                />
                <ImageUploadField
                  label="Negativo · Imagen (opcional)"
                  imageUrl={pair.negImageUrl}
                  folder="memory-cards"
                  disabled={submitting}
                  onChange={(url) => updatePair(index, 'negImageUrl', url)}
                />
              </div>
            </div>
          ))}

          <button
            type="button"
            className="self-start rounded-lg border border-dashed border-border px-3.5 py-2 text-[13px] font-medium text-text-h xl:col-span-2"
            onClick={addPair}
            disabled={submitting}
          >
            + Agregar pareja
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
          backLabel={phase === 0 ? 'Cambiar modo' : 'Atrás'}
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
