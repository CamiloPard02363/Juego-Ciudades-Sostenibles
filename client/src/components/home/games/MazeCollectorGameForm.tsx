import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { TextField } from '../../TextField'
import { SaveVisibilityModal } from './SaveVisibilityModal'
import { ImageUploadField } from './ImageUploadField'
import { IconPickerField } from './IconPickerField'
import { OrganizationSelectField } from './create/OrganizationSelectField'
import { useAuth } from '../../../hooks/useAuth'
import { useToast } from '../../../hooks/useToast'
import { createGame, publishGame } from '../../../services/game.service'
import { createCategory, listCategories, type CategoryWithGameCount } from '../../../services/category.service'
import { listMyOrganizations, type OrganizationWithMyRole } from '../../../services/organization.service'
import { ApiError } from '../../../utils/http'
import {
  DEFAULT_MAZE_CONFIG,
  MAX_MAZE_ITEMS,
  MIN_MAZE_ITEMS,
  MAZE_ICON_LABELS,
  iconForConcept,
  type MazeLayout,
} from './mazeCollectorTypes'
import { DOMINO_ICON_KEYS } from './dominoTypes'

type ItemDraft = {
  label: string
  icon: string
  color: string
  fact: string
}

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

const LAYOUT_OPTIONS: Array<{ value: MazeLayout; label: string }> = [
  { value: 'CLASSIC', label: 'Clásico' },
  { value: 'CROSS', label: 'Cruz' },
  { value: 'SPIRAL', label: 'Espiral' },
]

function emptyItem(index: number): ItemDraft {
  return {
    label: '',
    icon: DOMINO_ICON_KEYS[index % DOMINO_ICON_KEYS.length],
    color: SUGGESTED_COLORS[index % SUGGESTED_COLORS.length],
    fact: '',
  }
}

type MazeCollectorGameFormProps = {
  onClose: () => void
  onCreated: () => void
  onBack: () => void
  onCategoryCreated: () => void
}

/**
 * Crea un juego MAZE_COLLECTOR en DRAFT, igual que Dominó: la narrativa
 * completa (quién recolecta, qué esquiva, qué objetos hay) es contenido de
 * quien crea el juego — el motor (laberinto, movimiento, colisiones) es el
 * mismo sin importar el tema.
 */
export function MazeCollectorGameForm({ onClose, onCreated, onBack, onCategoryCreated }: MazeCollectorGameFormProps) {
  const { token } = useAuth()
  const { showToast } = useToast()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null)
  const [layout, setLayout] = useState<MazeLayout>(DEFAULT_MAZE_CONFIG.layout)
  const [lives, setLives] = useState(DEFAULT_MAZE_CONFIG.lives)
  const [enemySpeed, setEnemySpeed] = useState(DEFAULT_MAZE_CONFIG.enemySpeed)
  const [collectorLabel, setCollectorLabel] = useState('')
  const [collectorIcon, setCollectorIcon] = useState(DEFAULT_MAZE_CONFIG.collectorIcon)
  const [enemyLabel, setEnemyLabel] = useState('')
  const [enemyIcon, setEnemyIcon] = useState(DEFAULT_MAZE_CONFIG.enemyIcon)
  const [items, setItems] = useState<ItemDraft[]>(
    Array.from({ length: MIN_MAZE_ITEMS }, (_, index) => emptyItem(index)),
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

  function updateItem<K extends keyof ItemDraft>(index: number, field: K, value: ItemDraft[K]) {
    setItems((current) => current.map((item, i) => (i === index ? { ...item, [field]: value } : item)))
  }

  function addItem() {
    setItems((current) => (current.length < MAX_MAZE_ITEMS ? [...current, emptyItem(current.length)] : current))
  }

  function removeItem(index: number) {
    setItems((current) => (current.length > MIN_MAZE_ITEMS ? current.filter((_, i) => i !== index) : current))
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
    if (!collectorLabel.trim() || !enemyLabel.trim()) {
      setError('Ponle nombre al personaje que recolecta y a los enemigos.')
      return
    }
    if (items.length < MIN_MAZE_ITEMS) {
      setError(`Necesitas al menos ${MIN_MAZE_ITEMS} objetos.`)
      return
    }
    if (items.length > MAX_MAZE_ITEMS) {
      setError(`El recolector admite como máximo ${MAX_MAZE_ITEMS} objetos.`)
      return
    }
    if (items.some((item) => !item.label.trim())) {
      setError('Cada objeto necesita un nombre antes de crear el juego.')
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      const game = await createGame(token, {
        title: title.trim(),
        description: description.trim(),
        gameType: 'MAZE_COLLECTOR',
        categoryId,
        organizationId: organizationId || undefined,
        theme: coverImageUrl ? { coverImageUrl } : undefined,
        content: items.map((item) => ({
          label: item.label.trim(),
          icon: item.icon,
          color: item.color,
          ...(item.fact.trim() ? { fact: item.fact.trim() } : {}),
        })),
        config: {
          layout,
          lives,
          enemySpeed,
          collectorLabel: collectorLabel.trim(),
          collectorIcon,
          enemyLabel: enemyLabel.trim(),
          enemyIcon,
        },
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
    <div className="mx-auto max-w-[640px] p-8">
      <button type="button" className="mb-3 text-[12.5px] font-medium text-accent hover:underline" onClick={onBack}>
        ← Cambiar tipo de juego
      </button>
      <h2 className="mb-1 text-[20px] tracking-tight text-text-h">Recolector de laberinto</h2>
      <p className="mb-6 text-[13px] text-text">
        Un jugador recorre un laberinto recolectando objetos temáticos mientras esquiva enemigos. Cambia la
        narrativa: puede ser un camión de reciclaje esquivando nubes de contaminación, o cualquier otra idea.
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

        <div>
          <label className="mb-1.5 block text-[13px] font-medium text-text-h" htmlFor="maze-layout">
            Forma del laberinto
          </label>
          <select
            id="maze-layout"
            className="w-full rounded-lg border border-border bg-bg px-[13px] py-[11px] text-[15px] text-text-h outline-none focus:border-accent"
            value={layout}
            disabled={submitting}
            onChange={(event) => setLayout(event.target.value as MazeLayout)}
          >
            {LAYOUT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-text-h" htmlFor="maze-lives">
              Vidas
            </label>
            <input
              id="maze-lives"
              type="number"
              min={1}
              max={5}
              className="w-full rounded-lg border border-border bg-bg px-[13px] py-[11px] text-[15px] text-text-h outline-none focus:border-accent"
              value={lives}
              disabled={submitting}
              onChange={(event) => setLives(Number(event.target.value))}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-text-h" htmlFor="maze-enemy-speed">
              Velocidad de los enemigos
            </label>
            <input
              id="maze-enemy-speed"
              type="number"
              min={1}
              max={3}
              className="w-full rounded-lg border border-border bg-bg px-[13px] py-[11px] text-[15px] text-text-h outline-none focus:border-accent"
              value={enemySpeed}
              disabled={submitting}
              onChange={(event) => setEnemySpeed(Number(event.target.value))}
            />
          </div>
        </div>

        <div className="rounded-xl border border-border p-4">
          <p className="mb-2.5 text-[13px] font-semibold text-text-h">Personaje que recolecta</p>
          <div className="grid grid-cols-2 gap-3">
            <TextField
              label="Nombre"
              type="text"
              value={collectorLabel}
              disabled={submitting}
              onChange={setCollectorLabel}
              onBlur={() => {}}
            />
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-text-h" htmlFor="collector-icon">
                Ícono
              </label>
              <IconPickerField
                id="collector-icon"
                value={collectorIcon}
                labels={MAZE_ICON_LABELS}
                disabled={submitting}
                onChange={setCollectorIcon}
              />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border p-4">
          <p className="mb-2.5 text-[13px] font-semibold text-text-h">Enemigos</p>
          <div className="grid grid-cols-2 gap-3">
            <TextField
              label="Nombre"
              type="text"
              value={enemyLabel}
              disabled={submitting}
              onChange={setEnemyLabel}
              onBlur={() => {}}
            />
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-text-h" htmlFor="enemy-icon">
                Ícono
              </label>
              <IconPickerField
                id="enemy-icon"
                value={enemyIcon}
                labels={MAZE_ICON_LABELS}
                disabled={submitting}
                onChange={setEnemyIcon}
              />
            </div>
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

        <div className="flex flex-col gap-3">
          {items.map((item, index) => {
            const Icon = iconForConcept(item.icon)
            return (
              <div key={index} className="rounded-xl border border-border p-4">
                <div className="mb-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4" style={{ color: item.color }} strokeWidth={2} />
                    <p className="text-[13px] font-semibold text-text-h">Objeto {index + 1}</p>
                  </div>
                  {items.length > MIN_MAZE_ITEMS && (
                    <button
                      type="button"
                      className="text-[12px] font-medium text-danger"
                      onClick={() => removeItem(index)}
                      disabled={submitting}
                    >
                      Quitar
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <TextField
                    label="Nombre"
                    type="text"
                    value={item.label}
                    disabled={submitting}
                    onChange={(value) => updateItem(index, 'label', value)}
                    onBlur={() => {}}
                  />
                  <div>
                    <label className="mb-1.5 block text-[13px] font-medium text-text-h" htmlFor={`item-icon-${index}`}>
                      Ícono
                    </label>
                    <IconPickerField
                      id={`item-icon-${index}`}
                      value={item.icon}
                      labels={MAZE_ICON_LABELS}
                      disabled={submitting}
                      onChange={(key) => updateItem(index, 'icon', key)}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[13px] font-medium text-text-h" htmlFor={`item-color-${index}`}>
                      Color
                    </label>
                    <input
                      id={`item-color-${index}`}
                      type="color"
                      className="h-[45px] w-full cursor-pointer rounded-lg border border-border bg-bg px-2 py-1.5 outline-none focus:border-accent"
                      value={item.color}
                      disabled={submitting}
                      onChange={(event) => updateItem(index, 'color', event.target.value)}
                    />
                  </div>
                </div>
                <div className="mt-3">
                  <TextField
                    label="Dato educativo (opcional)"
                    type="text"
                    value={item.fact}
                    disabled={submitting}
                    onChange={(value) => updateItem(index, 'fact', value)}
                    onBlur={() => {}}
                  />
                </div>
              </div>
            )
          })}
        </div>

        {items.length < MAX_MAZE_ITEMS && (
          <button
            type="button"
            className="self-start rounded-lg border border-dashed border-border px-3.5 py-2 text-[13px] font-medium text-text-h"
            onClick={addItem}
            disabled={submitting}
          >
            + Agregar objeto
          </button>
        )}

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
