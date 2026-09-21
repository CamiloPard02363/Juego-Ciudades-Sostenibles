import { useRef, useState } from 'react'
import { FileText, Loader2, Sparkles, X } from 'lucide-react'
import { useAuth } from '../../../hooks/useAuth'
import { useToast } from '../../../hooks/useToast'
import { generateGameDraft, type GameDraft } from '../../../services/ai-game-assistant.service'
import { ApiError } from '../../../utils/http'

const ACCEPTED = '.pdf,.doc,.docx,.xls,.xlsx,.csv,image/*'
const DEFAULT_MAX_FILES = 5
/** Documentos de referencia extra permitidos además del cupo de imágenes. */
const EXTRA_REFERENCE_FILES = 5

type AiGameAssistantPanelProps = {
  gameType: string
  /** Solo para MEMORY_MATCH: 'PAIRS' u 'OPPOSITES'. */
  mode?: string
  disabled?: boolean
  /**
   * Cuando el tipo de juego necesita una imagen real por elemento (Quién Es,
   * Parejas), la IA no puede inventarlas: el usuario SIEMPRE sube sus propias
   * imágenes, y la IA solo las organiza — les asigna el concepto que le
   * corresponde a cada una.
   */
  imagesRequired?: { min: number; max: number }
  onDraftReady: (draft: GameDraft) => void
}

/**
 * Panel compartido entre formularios de creación de juego: el profesor sube
 * SUS archivos propios (nunca un link) y la IA pre-llena el resto del
 * formulario con un borrador — que sigue el flujo normal de revisar/editar y
 * crear con el botón de siempre. No crea el juego por sí solo.
 */
export function AiGameAssistantPanel({
  gameType,
  mode,
  disabled,
  imagesRequired,
  onDraftReady,
}: AiGameAssistantPanelProps) {
  const { token } = useAuth()
  const { showToast } = useToast()
  const inputRef = useRef<HTMLInputElement>(null)
  const [files, setFiles] = useState<File[]>([])
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const maxFiles = imagesRequired ? imagesRequired.max + EXTRA_REFERENCE_FILES : DEFAULT_MAX_FILES
  const imageCount = files.filter((file) => file.type.startsWith('image/')).length
  const hasEnoughImages = !imagesRequired || imageCount >= imagesRequired.min

  function handleFilesChosen(event: React.ChangeEvent<HTMLInputElement>) {
    const chosen = Array.from(event.target.files ?? [])
    event.target.value = ''
    if (chosen.length === 0) return
    setError(null)
    setFiles((current) => [...current, ...chosen].slice(0, maxFiles))
  }

  function removeFile(index: number) {
    setFiles((current) => current.filter((_, i) => i !== index))
  }

  async function handleGenerate() {
    if (!token || files.length === 0 || !hasEnoughImages) return
    setGenerating(true)
    setError(null)
    try {
      const draft = await generateGameDraft(token, gameType, files, mode)
      onDraftReady(draft)
      showToast('Juego configurado con IA — revisa y ajusta lo que necesites', 'success')
      setFiles([])
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo configurar el juego con IA.')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="rounded-xl border border-accent/30 bg-accent/5 p-4">
      <div className="mb-2 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-accent" strokeWidth={2} />
        <p className="text-[13.5px] font-semibold text-text-h">Sube tus archivos y configura tu juego automáticamente con IA</p>
      </div>
      {imagesRequired ? (
        <p className="mb-3 text-[12px] leading-relaxed text-text">
          Este juego necesita una imagen por elemento — eso lo subes tú (mínimo {imagesRequired.min}),
          la IA no puede inventarlas. Súbelas aquí y la IA se encarga de organizarlas: le asigna a cada
          imagen el concepto que le corresponde. También puedes agregar PDF/Word/Excel/CSV de
          referencia para guiar el tema (opcional). No se aceptan links, solo archivos que subas tú.
        </p>
      ) : (
        <p className="mb-3 text-[12px] leading-relaxed text-text">
          PDF, Word, Excel, CSV o imágenes con tu propio material — la IA extrae la información y
          llena el resto del formulario con ese tema. No se aceptan links, solo archivos que subas tú.
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED}
        multiple
        className="hidden"
        disabled={disabled || generating || files.length >= maxFiles}
        onChange={handleFilesChosen}
      />

      {imagesRequired && (
        <p className={`mb-2 text-[12px] font-medium ${hasEnoughImages ? 'text-accent' : 'text-text'}`}>
          {imageCount} / {imagesRequired.min} imágenes mínimo
          {imageCount > 0 && !hasEnoughImages ? ' — sigue subiendo' : ''}
        </p>
      )}

      {files.length > 0 && (
        <ul className="mb-3 flex max-h-[220px] flex-col gap-1.5 overflow-y-auto pr-1">
          {files.map((file, index) => (
            <li
              key={`${file.name}-${index}`}
              className="flex items-center gap-2 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[12px] text-text-h"
            >
              <FileText className="h-3.5 w-3.5 shrink-0 text-accent" strokeWidth={2} />
              <span className="flex-1 truncate">{file.name}</span>
              {!generating && (
                <button
                  type="button"
                  className="shrink-0 text-text hover:text-danger"
                  onClick={() => removeFile(index)}
                  aria-label={`Quitar ${file.name}`}
                >
                  <X className="h-3.5 w-3.5" strokeWidth={2.5} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-lg border border-dashed border-accent/50 px-3.5 py-2 text-[12.5px] font-medium text-accent disabled:cursor-not-allowed disabled:opacity-60"
          disabled={disabled || generating || files.length >= maxFiles}
          onClick={() => inputRef.current?.click()}
        >
          + Agregar archivos
        </button>
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[12.5px] font-semibold text-white shadow-[0_6px_16px_-8px_var(--accent)] disabled:cursor-not-allowed disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))' }}
          disabled={disabled || generating || files.length === 0 || !hasEnoughImages}
          onClick={handleGenerate}
        >
          {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2.5} /> : <Sparkles className="h-3.5 w-3.5" strokeWidth={2.5} />}
          {generating ? 'Configurando…' : 'Configurar con IA'}
        </button>
      </div>

      {error && (
        <p className="mt-2.5 rounded-lg border border-danger/35 bg-danger/10 px-[13px] py-[11px] text-[12.5px] leading-snug text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
