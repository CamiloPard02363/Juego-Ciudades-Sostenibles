/**
 * Deriva un slug legible a partir de un nombre de categoría libre (ej. "Ciencias
 * Naturales" -> "ciencias-naturales"). No garantiza unicidad — para eso está el
 * índice único en Mongo + captura de duplicados en el repositorio.
 */
export function categorySlugFromName(name: string, fallbackSuffix: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // quita acentos
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60)
    .replace(/-$/, '');

  return base || `categoria-${fallbackSuffix.slice(0, 8)}`;
}
