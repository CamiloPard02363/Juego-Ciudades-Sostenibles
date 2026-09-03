import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { TextField } from '../../TextField'
import { Modal } from './Modal'
import { ImageUploadField } from './ImageUploadField'
import { useAuth } from '../../../hooks/useAuth'
import { useToast } from '../../../hooks/useToast'
import { createGame, publishGame } from '../../../services/game.service'
import { createCategory, listCategories, type CategoryWithGameCount } from '../../../services/category.service'
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

type OppositesGameFormProps = {
  onClose: () => void
  onCreated: () => void
  onBack: () => void
}

export function OppositesGameForm({ onClose, onCreated, onBack }: OppositesGameFormProps) {
  const { token } = useAuth()
  const { showToast } = useToast()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null)
  const [pairs, setPairs] = useState<PairDraft[]>([{ ...EMPTY_PAIR }, { ...EMPTY_PAIR }])
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
    const incompletePair = pairs.some(
      (pair) =>
        !pair.posTitle.trim() ||
        !pair.posDescription.trim() ||
        !pair.negTitle.trim() ||
        !pair.negDescription.trim(),
    )
    if (incompletePair) {
      setError('Completa todos los campos de cada pareja antes de crear el juego.')
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      const game = await createGame(token, {
        title: title.trim(),
        description: description.trim(),
        gameType: 'MEMORY_MATCH',
        categoryId,
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
      // El creador ve su propio juego de inmediato; publicarlo lo hace
      // visible para el resto de la plataforma sin un paso manual extra.
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
        ← Cambiar modo
      </button>
      <h2 className="mb-1 text-[20px] tracking-tight text-text-h">Conceptos opuestos</h2>
      <p className="mb-6 text-[13px] text-text">
        Cada pareja tiene un aspecto positivo y su contraparte negativa.
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
        </div>

        <button
          type="button"
          className="self-start rounded-lg border border-dashed border-border px-3.5 py-2 text-[13px] font-medium text-text-h"
          onClick={addPair}
          disabled={submitting}
        >
          + Agregar pareja
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
            {submitting ? 'Creando…' : 'Crear y publicar'}
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
