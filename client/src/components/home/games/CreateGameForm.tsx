import { useState } from 'react'
import type { FormEvent } from 'react'
import { TextField } from '../../TextField'
import { Modal } from './Modal'
import { useAuth } from '../../../hooks/useAuth'
import { createGame, publishGame } from '../../../services/game.service'
import { ApiError } from '../../../utils/http'

type PairDraft = {
  posTitle: string
  posDescription: string
  negTitle: string
  negDescription: string
}

const EMPTY_PAIR: PairDraft = { posTitle: '', posDescription: '', negTitle: '', negDescription: '' }

type CreateGameFormProps = {
  onClose: () => void
  onCreated: () => void
}

export function CreateGameForm({ onClose, onCreated }: CreateGameFormProps) {
  const { token } = useAuth()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [pairs, setPairs] = useState<PairDraft[]>([{ ...EMPTY_PAIR }, { ...EMPTY_PAIR }])
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function updatePair(index: number, field: keyof PairDraft, value: string) {
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
        content: pairs.map((pair) => ({
          posTitle: pair.posTitle.trim(),
          posDescription: pair.posDescription.trim(),
          posImageUrl: null,
          negTitle: pair.negTitle.trim(),
          negDescription: pair.negDescription.trim(),
          negImageUrl: null,
        })),
      })
      // El creador ve su propio juego de inmediato; publicarlo lo hace
      // visible para el resto de la plataforma sin un paso manual extra.
      await publishGame(token, game.id)
      onCreated()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo crear el juego.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal onClose={onClose} maxWidthClassName="max-w-[640px]">
      <h2 className="mb-1 text-[20px] tracking-tight text-text-h">Crear juego nuevo</h2>
      <p className="mb-6 text-[13px] text-text">
        Crea un juego de memoria: cada pareja tiene un aspecto positivo y su contraparte negativa.
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
            className="rounded-lg bg-accent px-4 py-2.5 text-[14px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-60 dark:text-bg"
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
