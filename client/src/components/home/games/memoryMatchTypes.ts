/** Espejo de los tipos validados por el backend (ver server/src/application/content-validators). */
export type MemoryMatchMode = 'OPPOSITES' | 'PAIRS'

export type OppositesPair = {
  mode: 'OPPOSITES'
  pairId: string
  posTitle: string
  posDescription: string
  posImageUrl: string | null
  negTitle: string
  negDescription: string
  negImageUrl: string | null
}

export type SimplePair = {
  mode: 'PAIRS'
  pairId: string
  imageUrl: string
  label: string
}

export type MemoryMatchPair = OppositesPair | SimplePair

export type MemoryMatchConfig = {
  mode: MemoryMatchMode
  perZone: number
  timePerZoneSeconds: number
  previewSeconds: number
}
