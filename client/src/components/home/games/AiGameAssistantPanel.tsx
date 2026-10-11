import { useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { FileText, Loader2, Paperclip, Send, Sparkles, Upload, X } from 'lucide-react'
import { useAuth } from '../../../hooks/useAuth'
import { useToast } from '../../../hooks/useToast'
import { generateGameDraft, type GameDraft } from '../../../services/ai-game-assistant.service'
import { ApiError } from '../../../utils/http'
import { Modal } from './Modal'
import { useMarkAiDraftApplied } from './aiDraftContext'

const ACCEPTED = '.pdf,.doc,.docx,.xls,.xlsx,.csv,image/*'
const DEFAULT_MAX_FILES = 5
/** Documentos de referencia extra permitidos además del cupo de imágenes. */
const EXTRA_REFERENCE_FILES = 5

type AiGameHint = {
  /** Qué arma la IA para este juego, en una o dos frases. */
  summary: string
  /** Ejemplo de lo que se puede escribir en el cuadro de texto. */
  placeholder: string
}

/**
 * Lo que hace la IA en cada juego (clave: tipo de juego, o "TIPO:MODO" para
 * Memoria), para que el usuario sepa qué pedirle y qué recibe a cambio.
 */
const AI_GAME_HINTS: Record<string, AiGameHint> = {
  TRUE_FALSE_MAZE: {
    summary:
      'La IA escribe de 8 a 15 afirmaciones de verdadero o falso con su explicación, y ajusta las vidas, las medusas y la velocidad según la dificultad que pidas.',
    placeholder: 'Ej.: "La fotosíntesis, nivel fácil para primaria" o "Segunda Guerra Mundial, difícil, 12 afirmaciones"…',
  },
  GUESS_WHO: {
    summary: 'La IA arma las tarjetas con su nombre y un dato curioso de cada una.',
    placeholder: 'Ej.: "Animales de la selva amazónica" o "Banderas de Sudamérica"…',
  },
  'MEMORY_MATCH:PAIRS': {
    summary: 'La IA arma las parejas imagen-concepto con el nombre de cada concepto.',
    placeholder: 'Ej.: "Figuras y sólidos geométricos básicos" o "Partes de la célula"…',
  },
  'MEMORY_MATCH:OPPOSITES': {
    summary: 'La IA arma parejas de conceptos opuestos, cada lado con su descripción.',
    placeholder: 'Ej.: "Ácidos y bases" o "Causas y consecuencias de la Revolución Francesa"…',
  },
  DOMINO: {
    summary: 'La IA elige de 6 a 10 conceptos clave del tema y les asigna un color.',
    placeholder: 'Ej.: "Energías renovables" o "Personajes de la Independencia"…',
  },
  MAZE_COLLECTOR: {
    summary:
      'La IA elige los objetos que se recolectan, con un dato educativo de cada uno, y los nombres del recolector y del enemigo.',
    placeholder: 'Ej.: "Reciclaje: qué va en cada caneca" o "Animales en peligro de extinción"…',
  },
  SNAKES_LADDERS: {
    summary:
      'La IA diseña el tablero (escaleras y serpientes) y escribe una pregunta de opción múltiple para cada casilla clave.',
    placeholder: 'Ej.: "El sistema solar" o "Tablas de multiplicar del 6 al 9"…',
  },
  DUAL_QUEST: {
    summary: 'La IA diseña el mapa, las compuertas, las preguntas y las gemas que arman la pregunta final.',
    placeholder: 'Ej.: "El ciclo del agua" o "Estados de la materia"…',
  },
}

function hintFor(gameType: string, mode?: string): AiGameHint | undefined {
  return (mode ? AI_GAME_HINTS[`${gameType}:${mode}`] : undefined) ?? AI_GAME_HINTS[gameType]
}

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
   *
   * `enforceMinimum: false` (issue #208, Quién Es) deja `min` como una
   * recomendación en el texto de ayuda, sin bloquear el envío por debajo de
   * esa cantidad — el usuario puede completar el resto de tarjetas a mano
   * después. Por defecto (`undefined`) sí bloquea, como antes.
   */
  imagesRequired?: { min: number; max: number; enforceMinimum?: boolean }
  onDraftReady: (draft: GameDraft) => void
}

/**
 * Botón que abre el asistente de IA para creación de juego, con una interfaz
 * tipo chat: un campo de texto para instrucciones (Enter para enviar), un
 * botón de clip para adjuntar archivos (o arrastrarlos y soltarlos encima
 * del recuadro, issue #234) y un botón de enviar. El profesor sube SUS
 * archivos propios (nunca un link) y la IA pre-llena el resto del
 * formulario con un borrador — que sigue el flujo normal de revisar/editar
 * y crear con el botón de siempre. No crea el juego por sí solo.
 *
 * Nunca es obligatorio adjuntar un archivo para enviar (issues #234/#238):
 * el usuario puede escribir solo el tema y la IA genera el borrador
 * completo con eso. Para tipos de juego CON imagen por elemento
 * (`imagesRequired`, Quién Es/Parejas): si el usuario sube sus imágenes se
 * usan esas; si no sube ninguna, la IA consigue una foto libre o crea una
 * ilustración básica para cada elemento (issue #21), y el usuario puede
 * reemplazarlas después en el formulario de siempre (que también admite
 * arrastrar y soltar).
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
  const markAiDraftApplied = useMarkAiDraftApplied()
  const inputRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [message, setMessage] = useState('')
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const hint = hintFor(gameType, mode)
  const maxFiles = imagesRequired ? imagesRequired.max + EXTRA_REFERENCE_FILES : DEFAULT_MAX_FILES
  const imageCount = files.filter((file) => file.type.startsWith('image/')).length
  // Con enforceMinimum: false no se puede saber client-side cuántas imágenes
  // hay en total (un PDF/Word puede traer varias adentro, y eso solo se sabe
  // al procesarlo en el servidor) — así que ahí ni se bloquea el envío ni se
  // muestra un contador que sería engañoso (ver imagesGuidance más abajo).
  const enforcesMinimum = imagesRequired?.enforceMinimum !== false
  const hasEnoughImages = !imagesRequired || !enforcesMinimum || imageCount >= imagesRequired.min
  // Nunca es obligatorio adjuntar un archivo para enviar (issues #234/#238):
  // el usuario puede escribir solo el tema, sin adjuntar nada, en CUALQUIER
  // tipo de juego — incluyendo Quién Es/Parejas (ahí cada elemento del
  // borrador queda sin imagen, para completarla a mano después).
  const canSendTextOnly = files.length === 0 && message.trim().length > 0
  const canSend =
    !disabled && !generating && (canSendTextOnly || (files.length > 0 && hasEnoughImages))

  function addFiles(incoming: File[]) {
    if (incoming.length === 0) return
    setError(null)
    setFiles((current) => [...current, ...incoming].slice(0, maxFiles))
  }

  function handleFilesChosen(event: React.ChangeEvent<HTMLInputElement>) {
    const chosen = Array.from(event.target.files ?? [])
    event.target.value = ''
    addFiles(chosen)
  }

  function removeFile(index: number) {
    setFiles((current) => current.filter((_, i) => i !== index))
  }

  // Arrastrar y soltar (issue #234), además del clip de siempre.
  const [isDraggingFiles, setIsDraggingFiles] = useState(false)
  const canDropFiles = !disabled && !generating && files.length < maxFiles

  function handleDragOver(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault()
    if (canDropFiles) setIsDraggingFiles(true)
  }

  function handleDragLeave(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault()
    // Pasar por encima de un hijo (chips, texto, botones) también dispara
    // "dragleave": solo se apaga el resaltado al salir del recuadro de verdad.
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) return
    setIsDraggingFiles(false)
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setIsDraggingFiles(false)
    if (!canDropFiles) return
    addFiles(Array.from(event.dataTransfer.files ?? []))
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
      // El formulario muestra un aviso fijo con lo que falta llenar a mano (nombre, descripción, materia).
      markAiDraftApplied?.()
      showToast(
        draft.notice
          ? `Juego configurado con IA. ${draft.notice} Ahora escribe tú el nombre y la descripción, y elige la materia.`
          : 'Juego configurado con IA — ahora escribe tú el nombre y la descripción, y elige la materia.',
        'success',
        8000,
      )
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
                <p className="text-[12px] text-text">Sube tus archivos, o escribe directamente el tema</p>
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
            {hint && <span className="font-medium text-text-h">{hint.summary} </span>}
            {imagesRequired ? (
              enforcesMinimum ? (
                <>
                  Si tienes tus imágenes, arrástralas aquí o súbelas con el clip (al menos {imagesRequired.min}): se
                  usan esas, y la IA le asigna a cada una el concepto que le corresponde. También puedes agregar
                  PDF/Word/Excel/CSV de referencia (opcional). O escribe solo el tema, sin ninguna imagen: la IA arma
                  el contenido completo y consigue las imágenes ella misma — busca una foto libre en Wikimedia Commons
                  y, si no encuentra, crea una ilustración básica — para que ninguna tarjeta quede vacía.
                </>
              ) : (
                <>
                  Si tienes tus imágenes, arrástralas aquí o súbelas como prefieras: cada imagen suelta, o un solo
                  PDF/Word con varias fotos adentro (la IA las extrae automáticamente). Se usan esas, y la IA les
                  asigna el concepto. Recomendamos al menos {imagesRequired.min}, pero no es obligatorio. O escribe
                  solo el tema, sin ninguna imagen: la IA arma el contenido completo y consigue las imágenes ella
                  misma — busca una foto libre en Wikimedia Commons y, si no encuentra, crea una ilustración básica —
                  para que ninguna tarjeta quede vacía.
                </>
              )
            ) : (
              <>
                Adjunta PDF, Word, Excel, CSV o imágenes con tu propio material (incluso una foto de tus apuntes): la
                IA lee la información y llena el resto del formulario con ese tema. También puedes escribir el tema
                directamente en el cuadro de texto, sin adjuntar nada.
              </>
            )}{' '}
            No se aceptan links, solo archivos que subas tú (o el texto que escribas, sin ningún archivo).
          </p>

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
              fila de entrada (clip + texto + enviar), como cualquier chat.
              También admite arrastrar y soltar archivos encima (issue #234),
              no solo el botón de clip. */}
          <div
            className={`rounded-xl border-2 border-dashed p-2.5 transition-colors ${
              isDraggingFiles ? 'border-accent bg-accent/10' : 'border-border bg-code-bg/40'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {files.length === 0 && (
              <p
                className={`mb-2 flex items-center justify-center gap-1.5 py-1.5 text-center text-[12px] font-medium ${
                  isDraggingFiles ? 'text-accent' : 'text-text'
                }`}
              >
                <Upload className={`h-4 w-4 shrink-0 ${isDraggingFiles ? 'animate-bounce' : ''}`} strokeWidth={2} />
                {isDraggingFiles ? 'Suelta los archivos aquí' : 'Arrastra tus archivos aquí, o usa el clip (opcional)'}
              </p>
            )}

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
                placeholder={hint?.placeholder ?? 'Escribe instrucciones, o directamente el tema del juego (ej. "La Revolución Francesa")…'}
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
