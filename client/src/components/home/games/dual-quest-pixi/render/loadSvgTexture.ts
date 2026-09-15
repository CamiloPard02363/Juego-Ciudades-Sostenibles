import { Texture } from 'pixi.js';

/**
 * Rasteriza un SVG a una Texture de Pixi usando el propio renderer SVG del
 * navegador (vía <img>), no el parser interno de Pixi — así los degradados,
 * filtros de sombra y curvas Bézier se ven exactamente igual que en el
 * prototipo HTML/CSS del que salieron, sin sorpresas de compatibilidad.
 */
export function loadSvgTexture(svg: string): Promise<Texture> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(Texture.from(img));
    img.onerror = () => reject(new Error('No se pudo rasterizar el SVG a textura.'));
    img.src = 'data:image/svg+xml;base64,' + btoa(svg);
  });
}

export async function loadSvgTextures<Key extends string>(
  entries: Record<Key, string>,
): Promise<Record<Key, Texture>> {
  const keys = Object.keys(entries) as Key[];
  const textures = await Promise.all(keys.map((key) => loadSvgTexture(entries[key])));
  return Object.fromEntries(keys.map((key, i) => [key, textures[i]])) as Record<Key, Texture>;
}
