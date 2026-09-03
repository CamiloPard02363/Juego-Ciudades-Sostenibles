import { useRef, useState } from 'react'
import { ImagePlus, Loader2, X } from 'lucide-react'
import { useAuth } from '../../../hooks/useAuth'
import { uploadImage, type UploadFolder } from '../../../services/upload.service'
import { ApiError } from '../../../utils/http'

type ImageUploadFieldProps = {
  label: string
  imageUrl: string | null
  folder: UploadFolder
  disabled?: boolean
  onChange: (url: string | null) => void
}

/** Input de imagen con preview inmediata: sube a Cloudinary al elegir el archivo y guarda solo la URL resultante. */
export function ImageUploadField({
  label,
  imageUrl,
  folder,
  disabled,
  onChange,
}: ImageUploadFieldProps) {
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
      const result = await uploadImage(token, file, folder)
      onChange(result.url)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo subir la imagen.')
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
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        disabled={disabled || uploading}
        onChange={handleFileChange}
      />

      {imageUrl ? (
        <div className="relative h-24 w-full overflow-hidden rounded-lg border border-border">
          <img src={imageUrl} alt="" className="h-full w-full object-cover" />
          {!disabled && (
            <button
              type="button"
              className="absolute top-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white"
              onClick={() => onChange(null)}
              aria-label="Quitar imagen"
            >
              <X className="h-3.5 w-3.5" strokeWidth={2.5} />
            </button>
          )}
        </div>
      ) : (
        <button
          type="button"
          className="flex h-24 w-full flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-border text-text disabled:cursor-not-allowed disabled:opacity-60"
          disabled={disabled || uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? (
            <Loader2 className="h-5 w-5 animate-spin text-accent" strokeWidth={2} />
          ) : (
            <ImagePlus className="h-5 w-5" strokeWidth={1.75} />
          )}
          <span className="text-[12px]">{uploading ? 'Subiendo…' : 'Agregar imagen'}</span>
        </button>
      )}

      {error && <p className="mt-1 text-[12px] text-danger">{error}</p>}
    </div>
  )
}
