import {
  Atom,
  Brain,
  Calculator,
  Dna,
  Globe2,
  Landmark,
  Languages,
  Leaf,
  Music,
  Palette,
  Sparkles,
  Stethoscope,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

/** Color de respaldo para una materia que no calza con ninguna regla: azul grisáceo neutro (profesional, no compite con ningún grupo). */
export const DEFAULT_CATEGORY_COLOR = '#64748b'

/**
 * Palabras clave -> ícono y color representativos, elegidos por psicología
 * del color (no por índice/orden de creación): cada materia transmite algo
 * consistente sin importar cuántas materias existan o en qué orden se
 * crearon. Las categorías son texto libre creado por usuarios, así que esto
 * es una heurística por nombre, con Sparkles + DEFAULT_CATEGORY_COLOR de
 * respaldo cuando ninguna palabra clave calza.
 *
 * Único punto de esta heurística en el cliente — la usan tanto el Home de
 * adulto (GamesSection.tsx) como el Modo Kids (components/home/kids/*), así
 * que un juego/materia se ve con el mismo color/ícono sin importar qué
 * pantalla lo muestre.
 */
const CATEGORY_RULES: Array<{ keywords: string[]; icon: LucideIcon; color: string }> = [
  // Azul: lógica, confianza, orden — asociación clásica con lo racional/exacto.
  { keywords: ['matematic', 'algebra', 'geometr', 'calculo', 'aritmetic'], icon: Calculator, color: '#3b82f6' },
  // Verde: naturaleza, crecimiento, calma.
  { keywords: ['biolog', 'natural', 'ecolog', 'ambiente', 'plantas', 'botanic'], icon: Leaf, color: '#22c55e' },
  // Turquesa: exploración, apertura, horizontes amplios.
  { keywords: ['geografia', 'geograf', 'mundo', 'pais', 'capital'], icon: Globe2, color: '#14b8a6' },
  // Rojo coral: vitalidad, atención, cuidado — sin ser tan intenso como una alerta.
  { keywords: ['medicin', 'salud', 'anatomi', 'clinic'], icon: Stethoscope, color: '#f43f5e' },
  // Ámbar/dorado: tradición, solidez, herencia — tono "tierra".
  { keywords: ['historia', 'civic', 'sociales'], icon: Landmark, color: '#b45309' },
  // Índigo: profundidad, precisión, misterio de lo científico.
  { keywords: ['fisica', 'quimic', 'ciencia'], icon: Atom, color: '#6366f1' },
  // Violeta: descubrimiento, innovación.
  { keywords: ['genetic', 'adn'], icon: Dna, color: '#8b5cf6' },
  // Cian: comunicación, claridad.
  { keywords: ['idioma', 'ingles', 'frances', 'lengua', 'lenguaje'], icon: Languages, color: '#06b6d4' },
  // Naranja: creatividad, energía, expresión.
  { keywords: ['arte', 'dibujo', 'pintura'], icon: Palette, color: '#f97316' },
  // Rosa/magenta: pasión, emoción, expresión artística.
  { keywords: ['musica', 'sonido'], icon: Music, color: '#ec4899' },
  // Púrpura: introspección, sabiduría, lo abstracto de la mente.
  { keywords: ['logica', 'psicolog', 'mente', 'razonamiento'], icon: Brain, color: '#7c3aed' },
]

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

function matchCategoryRule(name: string) {
  const normalized = normalize(name)
  return CATEGORY_RULES.find((rule) => rule.keywords.some((keyword) => normalized.includes(keyword)))
}

export function iconForCategory(name: string): LucideIcon {
  return matchCategoryRule(name)?.icon ?? Sparkles
}

/** Color por psicología del color según la materia (ver CATEGORY_RULES); mismo criterio para el badge de la materia y para cada tarjeta de juego que pertenece a ella. */
export function colorForCategory(name: string): string {
  return matchCategoryRule(name)?.color ?? DEFAULT_CATEGORY_COLOR
}
