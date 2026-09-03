import { useRef, useState } from 'react'
import { AudioLines, Loader2, Volume2, X } from 'lucide-react'
import { useAuth } from '../../../hooks/useAuth'
import { uploadAudio, type UploadAudioFolder } from '../../../services/upload.service'
import { ApiError } from '../../../utils/http'

type AudioUploadFieldProps = {
  label: string
  audioUrl: string | null
  folder: UploadAudioFolder
  disabled?: boolean
  onChange: (url: string | null) => void
}

/** Input de audio opcional por tarjeta (ej. pronunciación de un personaje/bandera). */
export function AudioUploadField({ label, audioUrl, folder, disabled, onChange }: AudioUploadFieldProps) {
  const { token } = useAuth()
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || !token) return

    setUploading(true)
    setError(null)
    try {
      const result = await uploadAudio(token, file, folder)
      onChange(result.url)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo subir el audio.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      <p className="mb-1.5 text-[13px] font-medium text-text-h">{label}</p>
      <input
        ref={inputRef}
        type="file"
        accept="audio/mpeg,audio/mp3,audio/wav,audio/ogg,audio/webm"
        className="hidden"
        disabled={disabled || uploading}
        onChange={handleFileChange}
      />

      {audioUrl ? (
        <div className="flex items-center gap-2 rounded-lg border border-border px-3 py-2">
          <Volume2 className="h-4 w-4 shrink-0 text-accent" strokeWidth={2} />
          <audio src={audioUrl} controls className="h-8 flex-1" />
          {!disabled && (
            <button
              type="button"
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-danger/15 text-danger"
              onClick={() => onChange(null)}
              aria-label="Quitar audio"
            >
              <X className="h-3.5 w-3.5" strokeWidth={2.5} />
            </button>
          )}
        </div>
      ) : (
        <button
          type="button"
          className="flex h-11 w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border text-text disabled:cursor-not-allowed disabled:opacity-60"
          disabled={disabled || uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin text-accent" strokeWidth={2} />
          ) : (
            <AudioLines className="h-4 w-4" strokeWidth={1.75} />
          )}
          <span className="text-[12px]">{uploading ? 'Subiendo…' : 'Agregar audio (opcional)'}</span>
        </button>
      )}

      {error && <p className="mt-1 text-[12px] text-danger">{error}</p>}
    </div>
  )
}
