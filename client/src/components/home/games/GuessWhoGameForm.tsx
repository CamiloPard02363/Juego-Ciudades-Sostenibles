import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { TextField } from '../../TextField'
import { Modal } from './Modal'
import { ImageUploadField } from './ImageUploadField'
import { AudioUploadField } from './AudioUploadField'
import { useAuth } from '../../../hooks/useAuth'
import { useToast } from '../../../hooks/useToast'
import { createGame, publishGame } from '../../../services/game.service'
import { createCategory, listCategories, type CategoryWithGameCount } from '../../../services/category.service'
import { ApiError } from '../../../utils/http'

type CardDraft = {
  imageUrl: string | null
  label: string
  audioUrl: string | null
}

const EMPTY_CARD: CardDraft = { imageUrl: null, label: '', audioUrl: null }
const MIN_CARDS = 12

type GuessWhoGameFormProps = {
  onClose: () => void
  onCreated: () => void
  onBack: () => void
}

/**
 * Crea un juego GUESS_WHO en DRAFT (sin publicar): a diferencia de las cartas
 * de memoria, este tipo se juega en una sala multijugador en vivo, así que no
 * tiene sentido "publicarlo" automáticamente — el creador decide cuándo abrir
 * una sala desde el detalle del juego.
 */
export function GuessWhoGameForm({ onClose, onCreated, onBack }: GuessWhoGameFormProps) {
  const { token } = useAuth()
  const { showToast } = useToast()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null)
  const [cards, setCards] = useState<CardDraft[]>(
    Array.from({ length: MIN_CARDS }, () => ({ ...EMPTY_CARD })),
  )
  const [categories, setCategories] = useState<CategoryWithGameCount[]>([])
  const [categoryId, setCategoryId] = useState('')
  const [newCategoryName, setNewCategoryName] = useState('')
  const [creatingCategory, setCreatingCategory] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

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
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo crear la materia.')
    } finally {
      setCreatingCategory(false)
    }
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
    if (cards.length < MIN_CARDS) {
      setError(`Necesitas al menos ${MIN_CARDS} tarjetas.`)
      return
    }
    const incompleteCard = cards.some((card) => !card.label.trim() || !card.imageUrl)
    if (incompleteCard) {
      setError('Cada tarjeta necesita una imagen y un nombre antes de crear el juego.')
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      const game = await createGame(token, {
        title: title.trim(),
        description: description.trim(),
        gameType: 'GUESS_WHO',
        categoryId,
        theme: coverImageUrl ? { coverImageUrl } : undefined,
        content: cards.map((card) => ({
          imageUrl: card.imageUrl as string,
          label: card.label.trim(),
          audioUrl: card.audioUrl,
        })),
      })
      await publishGame(token, game.id)
      showToast('Juego creado', 'success')
      onCreated()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo crear el juego.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal onClose={onClose} maxWidthClassName="max-w-[640px]">
      <button
        type="button"
        className="mb-3 text-[12.5px] font-medium text-accent hover:underline"
        onClick={onBack}
      >
        ← Cambiar tipo de juego
      </button>
      <h2 className="mb-1 text-[20px] tracking-tight text-text-h">¿Quién Es?</h2>
      <p className="mb-6 text-[13px] text-text">
        Cada tarjeta tiene una imagen, un nombre y un audio opcional. Se juega en una sala en vivo
        entre 2 personas — abre la sala desde el detalle del juego una vez creado.
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
            </div>
          ))}
        </div>

        <button
          type="button"
          className="self-start rounded-lg border border-dashed border-border px-3.5 py-2 text-[13px] font-medium text-text-h"
          onClick={addCard}
          disabled={submitting}
        >
          + Agregar tarjeta
        </button>

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
