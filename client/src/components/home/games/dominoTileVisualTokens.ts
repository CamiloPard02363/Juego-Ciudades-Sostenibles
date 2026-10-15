/**
 * Tokens de identidad visual para las fichas de Dominexo.
 *
 * Los tonos `soft` se reservan para marcas y superficies tenues. Los `ink`
 * mantienen contraste suficiente sobre la superficie neutra de la ficha para
 * iconos y otros indicadores esenciales. Ninguno modifica colores ya
 * guardados en partidas existentes.
 */
export const DOMINO_TILE_SURFACE = '#fffdf8'

export const DOMINO_TILE_VISUAL_TOKENS = {
  surface: DOMINO_TILE_SURFACE,
  surfaceShade: '#f4f0e7',
  textPrimary: '#26354f',
  textSecondary: '#52627b',
  divider: '#92a0b2',
  border: '#c8d1dc',
  relief: '#ffffff',
  shadow: 'rgba(24, 36, 58, 0.22)',
  selectedShadow: 'rgba(84, 48, 194, 0.34)',
  playable: '#6f55c7',
  focus: '#5430c2',
} as const

export const DOMINO_TILE_CATEGORY_COLORS = [
  { name: 'verde', soft: '#22a95a', ink: '#0f7b3a' },
  { name: 'cian', soft: '#18a8e0', ink: '#0879a8' },
  { name: 'azul', soft: '#3d7bff', ink: '#2258ce' },
  { name: 'violeta', soft: '#8b5cf6', ink: '#6741c9' },
  { name: 'dorado', soft: '#e3a008', ink: '#966400' },
  { name: 'turquesa', soft: '#14b89a', ink: '#087d69' },
  { name: 'frambuesa', soft: '#e0527c', ink: '#a23157' },
  { name: 'naranja', soft: '#f47c3c', ink: '#a64a19' },
  { name: 'lila', soft: '#b884e8', ink: '#70439a' },
  { name: 'petroleo', soft: '#6e9dab', ink: '#32626d' },
] as const

/** Colores iniciales del formulario; el selector libre sigue admitiendo cualquier hex. */
export const DOMINO_TILE_SUGGESTED_COLORS = DOMINO_TILE_CATEGORY_COLORS.map(({ soft }) => soft)

function linearChannel(channel: number) {
  const value = channel / 255
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
}

function luminance(hex: string) {
  const normalized = hex.replace('#', '')
  if (!/^[0-9a-f]{6}$/i.test(normalized)) throw new Error(`Color hexadecimal invÃ¡lido: ${hex}`)
  const [red, green, blue] = normalized.match(/.{2}/g)!.map((channel) => linearChannel(Number.parseInt(channel, 16)))
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue
}

/** RelaciÃ³n de contraste WCAG entre dos colores hexadecimales. */
export function dominoTileContrast(first: string, second: string) {
  const [light, dark] = [luminance(first), luminance(second)].sort((a, b) => b - a)
  return (light + 0.05) / (dark + 0.05)
}

function parseHexColor(color: string) {
  const normalized = color.trim().replace('#', '')
  if (!/^[0-9a-f]{6}$/i.test(normalized)) return undefined
  return normalized.match(/.{2}/g)!.map((channel) => Number.parseInt(channel, 16)) as [number, number, number]
}

function toHex([red, green, blue]: [number, number, number]) {
  return `#${[red, green, blue].map((channel) => channel.toString(16).padStart(2, '0')).join('')}`
}

function rgbToHsl([red, green, blue]: [number, number, number]) {
  const r = red / 255
  const g = green / 255
  const b = blue / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const lightness = (max + min) / 2
  const delta = max - min
  if (delta === 0) return { hue: 0, saturation: 0, lightness }

  const saturation = delta / (1 - Math.abs(2 * lightness - 1))
  const hue = ((max === r ? (g - b) / delta : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4) * 60 + 360) % 360
  return { hue, saturation, lightness }
}

function hslToRgb(hue: number, saturation: number, lightness: number): [number, number, number] {
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation
  const segment = hue / 60
  const x = chroma * (1 - Math.abs(segment % 2 - 1))
  const [red, green, blue] = segment < 1 ? [chroma, x, 0]
    : segment < 2 ? [x, chroma, 0]
      : segment < 3 ? [0, chroma, x]
        : segment < 4 ? [0, x, chroma]
          : segment < 5 ? [x, 0, chroma]
            : [chroma, 0, x]
  const match = lightness - chroma / 2
  return [red, green, blue].map((channel) => Math.round((channel + match) * 255)) as [number, number, number]
}

function normalizeIconInk(color: string) {
  const rgb = parseHexColor(color)
  if (!rgb) return DOMINO_TILE_VISUAL_TOKENS.textPrimary

  const { hue, saturation } = rgbToHsl(rgb)
  if (saturation < 0.08) return DOMINO_TILE_VISUAL_TOKENS.textPrimary

  // Conserva el matiz del color guardado, pero lo lleva a una saturacion y
  // luminosidad consistentes para que iconos pequenos sigan diferenciandose.
  const vividSaturation = Math.max(saturation, 0.72)
  const isWarmYellow = hue >= 35 && hue <= 65
  for (let lightness = isWarmYellow ? 0.36 : 0.4; lightness >= 0.18; lightness -= 0.01) {
    const candidate = toHex(hslToRgb(hue, vividSaturation, lightness))
    if (dominoTileContrast(candidate, DOMINO_TILE_SURFACE) >= 4.5) return candidate
  }

  return DOMINO_TILE_VISUAL_TOKENS.textPrimary
}

/**
 * Resuelve una tinta legible sin modificar el color almacenado del concepto.
 * Los colores de la paleta sugerida usan su tinta definida; un color libre se
 * normaliza conservando su matiz, con mas saturacion y contraste AA.
 */
export function dominoTileCategoryInk(color: string) {
  const known = DOMINO_TILE_CATEGORY_COLORS.find(({ soft }) => soft.toLowerCase() === color.toLowerCase())
  if (known) return known.ink

  return normalizeIconInk(color)
}
