import { useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { FileText, Loader2, Paperclip, Send, Sparkles, X } from 'lucide-react'
import { useAuth } from '../../../hooks/useAuth'
import { useToast } from '../../../hooks/useToast'
import { generateGameDraft, type GameDraft } from '../../../services/ai-game-assistant.service'
import { ApiError } from '../../../utils/http'
import { Modal } from './Modal'

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
 * Botón que abre el asistente de IA para creación de juego, con una interfaz
 * tipo chat: un campo de texto para instrucciones (opcional, Enter para
 * enviar), un botón de clip para adjuntar archivos y un botón de enviar. El
 * profesor sube SUS archivos propios (nunca un link) y la IA pre-llena el
 * resto del formulario con un borrador — que sigue el flujo normal de
 * revisar/editar y crear con el botón de siempre. No crea el juego por sí
 * solo, y el texto del chat solo orienta cómo usar los archivos: no los
 * reemplaza (siguen siendo obligatorios).
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
  const [open, setOpen] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [message, setMessage] = useState('')
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const maxFiles = imagesRequired ? imagesRequired.max + EXTRA_REFERENCE_FILES : DEFAULT_MAX_FILES
  const imageCount = files.filter((file) => file.type.startsWith('image/')).length
  const hasEnoughImages = !imagesRequired || imageCount >= imagesRequired.min
  const canSend = !disabled && !generating && files.length > 0 && hasEnoughImages

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

  function closeModal() {
    if (generating) return
    setOpen(false)
  }

  async function handleGenerate() {
    if (!token || !canSend) return
    setGenerating(true)
    setError(null)
    try {
      const draft = await generateGameDraft(token, gameType, files, mode, message)
      onDraftReady(draft)
      showToast('Juego configurado con IA — revisa y ajusta lo que necesites', 'success')
      setFiles([])
      setMessage('')
      setOpen(false)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo configurar el juego con IA.')
    } finally {
      setGenerating(false)
    }
  }

  // Enter envía (como cualquier chat); Shift+Enter deja escribir en varias líneas.
  // `isComposing` evita disparar el envío al confirmar un acento/carácter compuesto con el teclado.
  function handleMessageKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault()
      if (canSend) void handleGenerate()
    }
  }

  return (
    <>
      <button
        type="button"
        className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-[13.5px] font-semibold text-white shadow-[0_10px_24px_-10px_var(--accent)] transition-transform disabled:cursor-not-allowed disabled:opacity-60 hover:not-disabled:-translate-y-0.5"
        style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))' }}
        disabled={disabled}
        onClick={() => setOpen(true)}
      >
        <Sparkles className="h-4 w-4" strokeWidth={2.5} />
        Generar con IA
      </button>

      {open && (
        <Modal onClose={closeModal} maxWidthClassName="max-w-[520px]" ariaLabel="Generar con IA">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white"
                style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))' }}
              >
                <Sparkles className="h-[18px] w-[18px]" strokeWidth={2} />
              </span>
              <div>
                <h2 className="text-[17px] font-semibold text-text-h">Generar con IA</h2>
                <p className="text-[12px] text-text">Sube tus archivos y, si quieres, agrega instrucciones</p>
              </div>
            </div>
            <button
              type="button"
              aria-label="Cerrar"
              className="shrink-0 rounded-lg p-1.5 text-text transition-colors hover:bg-code-bg hover:text-text-h disabled:cursor-not-allowed disabled:opacity-50"
              disabled={generating}
              onClick={closeModal}
            >
              <X className="h-5 w-5" strokeWidth={2} />
            </button>
          </div>

          <p className="mb-3 text-[12px] leading-relaxed text-text">
            {imagesRequired ? (
              <>
                Este juego necesita una imagen por elemento — eso lo subes tú (mínimo {imagesRequired.min}), la
                IA no puede inventarlas. Súbelas con el clip y la IA se encarga de organizarlas: le asigna a
                cada imagen el concepto que le corresponde. También puedes agregar PDF/Word/Excel/CSV de
                referencia (opcional).
              </>
            ) : (
              <>
                Adjunta PDF, Word, Excel, CSV o imágenes con tu propio material — la IA extrae la información y
                llena el resto del formulario con ese tema.
              </>
            )}{' '}
            No se aceptan links, solo archivos que subas tú.
          </p>

          {imagesRequired && (
            <p className={`mb-2 text-[12px] font-medium ${hasEnoughImages ? 'text-accent' : 'text-text'}`}>
              {imageCount} / {imagesRequired.min} imágenes mínimo
              {imageCount > 0 && !hasEnoughImages ? ' — sigue subiendo' : ''}
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

          {/* Recuadro tipo chat: archivos adjuntos como chips arriba, y abajo la
              fila de entrada (clip + texto + enviar), como cualquier chat. */}
          <div className="rounded-xl border border-border bg-code-bg/40 p-2.5">
            {files.length > 0 && (
              <ul className="mb-2 flex max-h-[160px] flex-wrap gap-1.5 overflow-y-auto pr-1">
                {files.map((file, index) => (
                  <li
                    key={`${file.name}-${index}`}
                    className="flex max-w-full items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 text-[11.5px] text-text-h"
                  >
                    <FileText className="h-3 w-3 shrink-0 text-accent" strokeWidth={2} />
                    <span className="max-w-[160px] truncate">{file.name}</span>
                    {!generating && (
                      <button
                        type="button"
                        className="shrink-0 text-text hover:text-danger"
                        onClick={() => removeFile(index)}
                        aria-label={`Quitar ${file.name}`}
                      >
                        <X className="h-3 w-3" strokeWidth={2.5} />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}

            <div className="flex items-end gap-1.5">
              <button
                type="button"
                aria-label="Adjuntar archivos"
                title="Adjuntar archivos"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-text transition-colors hover:bg-code-bg hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
                disabled={disabled || generating || files.length >= maxFiles}
                onClick={() => inputRef.current?.click()}
              >
                <Paperclip className="h-[18px] w-[18px]" strokeWidth={2} />
              </button>

              <textarea
                rows={1}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                onKeyDown={handleMessageKeyDown}
                disabled={disabled || generating}
                placeholder="Escribe instrucciones para la IA (opcional)…"
                className="max-h-28 min-h-9 flex-1 resize-none rounded-2xl border border-border bg-surface px-3.5 py-2 text-[13px] text-text-h outline-none placeholder:text-text focus:border-accent disabled:cursor-not-allowed disabled:opacity-60"
              />

              <button
                type="button"
                aria-label="Enviar"
                title="Enviar"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white transition-transform disabled:cursor-not-allowed disabled:opacity-50 hover:not-disabled:scale-105"
                style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))' }}
                disabled={!canSend}
                onClick={handleGenerate}
              >
                {generating ? (
                  <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.5} />
                ) : (
                  <Send className="h-4 w-4" strokeWidth={2.5} />
                )}
              </button>
            </div>
          </div>

          {error && (
            <p
              className="mt-2.5 rounded-lg border border-danger/35 bg-danger/10 px-[13px] py-[11px] text-[12.5px] leading-snug text-danger"
              role="alert"
            >
              {error}
            </p>
          )}
        </Modal>
      )}
    </>
  )
}
