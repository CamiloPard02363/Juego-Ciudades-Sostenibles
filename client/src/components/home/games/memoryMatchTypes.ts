/** Espejo del `MemoryMatchPair` validado por el backend (ver server/src/application/content-validators). */
export type MemoryMatchPair = {
  pairId: string
  posTitle: string
  posDescription: string
  posImageUrl: string | null
  negTitle: string
  negDescription: string
  negImageUrl: string | null
}

export type MemoryMatchConfig = {
  perZone: number
  timePerZoneSeconds: number
  previewSeconds: number
}
