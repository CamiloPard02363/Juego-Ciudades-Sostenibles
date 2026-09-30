import { useEffect, useMemo, useState } from 'react'
import { createSubject, type SubjectWithGameCount } from '../../../../services/subject.service'
import { ApiError } from '../../../../utils/http'

type CategorySelectFieldProps = {
  token: string | null
  categories: SubjectWithGameCount[]
  /** `categoryId` final elegido (raíz o sub-materia) — el que viaja en el payload de creación del juego. */
  categoryId: string
  onCategoryIdChange: (categoryId: string) => void
  /** Se dispara tras crear una sub-materia nueva, para refrescar el listado en el caller si aplica. */
  onCategoryCreated: (category: SubjectWithGameCount) => void
  disabled?: boolean
  showToast: (message: string, kind: 'success' | 'error') => void
}

/**
 * Selector de materia/sub-materia para los formularios de creación de juego
 * (issue #218, feedback post-PR: antes solo dejaba *crear* una sub-materia
 * nueva, sin poder elegir una ya existente).
 *
 * Flujo: se elige primero una materia raíz (`parentSubjectId === null`);
 * luego, si esa raíz ya tiene sub-materias registradas, se puede elegir una
 * existente de un segundo selector, o crear una nueva con el input de abajo.
 * `categoryId` (el que se manda al backend) queda apuntando a la sub-materia
 * elegida/creada, o a la raíz misma si no se eligió ninguna sub-materia.
 */
export function CategorySelectField({
  token,
  categories,
  categoryId,
  onCategoryIdChange,
  onCategoryCreated,
  disabled,
  showToast,
}: CategorySelectFieldProps) {
  const [newCategoryName, setNewCategoryName] = useState('')
  const [creatingCategory, setCreatingCategory] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const rootCategories = useMemo(
    () => categories.filter((category) => !category.parentSubjectId),
    [categories],
  )

  // La materia raíz elegida es la raíz del categoryId actual: si categoryId
  // apunta a una sub-materia, su raíz es parentSubjectId; si apunta a una
  // raíz, es el propio id.
  const selectedCategory = categories.find((category) => category.id === categoryId) ?? null
  const rootId = selectedCategory
    ? selectedCategory.parentSubjectId ?? selectedCategory.id
    : ''

  const subCategories = useMemo(
    () => (rootId ? categories.filter((category) => category.parentSubjectId === rootId) : []),
    [categories, rootId],
  )

  // Si al cambiar de raíz ya había una sub-materia elegida de la raíz
  // anterior, se limpia — evita quedar con un categoryId que no corresponde
  // a la raíz visible en el primer selector.
  useEffect(() => {
    setNewCategoryName('')
  }, [rootId])

  function handleRootChange(newRootId: string) {
    onCategoryIdChange(newRootId)
  }

  function handleSubCategoryChange(subId: string) {
    onCategoryIdChange(subId || rootId)
  }

  async function handleCreateCategory() {
    if (!token || !newCategoryName.trim() || !rootId) return
    setCreatingCategory(true)
    setError(null)
    try {
      const category = await createSubject(token, newCategoryName.trim(), rootId)
      onCategoryCreated({ ...category, gameCount: 0 })
      onCategoryIdChange(category.id)
      setNewCategoryName('')
      showToast('Materia creada', 'success')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo crear la materia.')
    } finally {
      setCreatingCategory(false)
    }
  }

  return (
    <div>
      <label className="mb-1.5 block text-[13px] font-medium text-text-h" htmlFor="game-category">
        Materia
      </label>
      <select
        id="game-category"
        className="w-full rounded-lg border border-border bg-bg px-[13px] py-[11px] text-[15px] text-text-h outline-none focus:border-accent"
        value={rootId}
        disabled={disabled}
        onChange={(event) => handleRootChange(event.target.value)}
      >
        <option value="">Elige una materia…</option>
        {rootCategories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </select>

      {rootId && subCategories.length > 0 && (
        <div className="mt-2">
          <label className="mb-1.5 block text-[12px] font-medium text-text-h" htmlFor="game-sub-category">
            Sub-materia (opcional)
          </label>
          <select
            id="game-sub-category"
            className="w-full rounded-lg border border-border bg-bg px-[13px] py-2 text-[13px] text-text-h outline-none focus:border-accent"
            value={categoryId !== rootId ? categoryId : ''}
            disabled={disabled}
            onChange={(event) => handleSubCategoryChange(event.target.value)}
          >
            <option value="">Sin sub-materia (usar la materia general)</option>
            {subCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="mt-2 flex gap-2">
        <input
          type="text"
          className="flex-1 rounded-lg border border-border bg-bg px-[13px] py-2 text-[13px] text-text-h outline-none focus:border-accent"
          placeholder={rootId ? 'Nombre de la sub-materia nueva…' : 'Elige una materia arriba primero'}
          value={newCategoryName}
          disabled={disabled || creatingCategory || !rootId}
          onChange={(event) => setNewCategoryName(event.target.value)}
        />
        <button
          type="button"
          className="shrink-0 rounded-lg border border-dashed border-border px-3 py-2 text-[12px] font-medium text-text-h disabled:cursor-not-allowed disabled:opacity-60"
          onClick={handleCreateCategory}
          disabled={disabled || creatingCategory || !newCategoryName.trim() || !rootId}
        >
          {creatingCategory ? 'Creando…' : '+ Crear'}
        </button>
      </div>

      {error && <p className="mt-1.5 text-[12px] text-danger">{error}</p>}
    </div>
  )
}
