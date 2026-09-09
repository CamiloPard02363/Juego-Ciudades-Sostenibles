import type { LucideIcon } from 'lucide-react'
import {
  Bike,
  Bus,
  Droplets,
  Factory,
  Flower2,
  Leaf,
  Lightbulb,
  Recycle,
  Sprout,
  Sun,
  TreeDeciduous,
  Trash2,
  Wind,
  Zap,
} from 'lucide-react'

/** Un concepto del dominó: reemplaza al número de una mitad de ficha. */
export type DominoConcept = {
  conceptId: string
  label: string
  /** Clave del catálogo DOMINO_ICONS; se resuelve al componente de ícono al pintar. */
  icon: string
  /** Color hex con el que se pinta el ícono. */
  color: string
}

export type DominoConfig = {
  /** Fichas que recibe el jugador al repartir; el resto queda en el pozo. */
  handSize: number
}

export const DEFAULT_DOMINO_CONFIG: DominoConfig = { handSize: 7 }

export const MIN_DOMINO_CONCEPTS = 6
export const MAX_DOMINO_CONCEPTS = 10

/**
 * Catálogo cerrado de íconos que puede elegir quien crea un dominó. El
 * contenido guarda solo la clave (string), no el componente — así el juego
 * sigue siendo data pura en la base, y el cliente resuelve el dibujo.
 */
export const DOMINO_ICONS: Record<string, LucideIcon> = {
  sun: Sun,
  leaf: Leaf,
  zap: Zap,
  recycle: Recycle,
  droplets: Droplets,
  wind: Wind,
  sprout: Sprout,
  tree: TreeDeciduous,
  flower: Flower2,
  bike: Bike,
  bus: Bus,
  lightbulb: Lightbulb,
  factory: Factory,
  trash: Trash2,
}

/** Etiquetas en español para el selector de íconos del formulario. */
export const DOMINO_ICON_LABELS: Record<string, string> = {
  sun: 'Sol',
  leaf: 'Hoja',
  zap: 'Energía',
  recycle: 'Reciclaje',
  droplets: 'Agua',
  wind: 'Viento',
  sprout: 'Brote',
  tree: 'Árbol',
  flower: 'Flor',
  bike: 'Bicicleta',
  bus: 'Transporte',
  lightbulb: 'Bombilla',
  factory: 'Industria',
  trash: 'Residuos',
}

export const DOMINO_ICON_KEYS = Object.keys(DOMINO_ICONS)

/** Ícono de respaldo cuando el contenido trae una clave que este cliente no conoce. */
export function iconForConcept(key: string): LucideIcon {
  return DOMINO_ICONS[key] ?? Leaf
}
