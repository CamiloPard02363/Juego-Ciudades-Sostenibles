// Emisor de eventos minimalista y tipado — evita traer una dependencia
// extra solo para pub/sub interno entre el motor Pixi y el wrapper React.
export class TypedEmitter<EventMap extends Record<string, unknown>> {
  private listeners = new Map<keyof EventMap, Set<(payload: never) => void>>();

  on<K extends keyof EventMap>(event: K, handler: (payload: EventMap[K]) => void): () => void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(handler as (payload: never) => void);
    return () => this.off(event, handler);
  }

  off<K extends keyof EventMap>(event: K, handler: (payload: EventMap[K]) => void): void {
    this.listeners.get(event)?.delete(handler as (payload: never) => void);
  }

  emit<K extends keyof EventMap>(event: K, payload: EventMap[K]): void {
    this.listeners.get(event)?.forEach((handler) => (handler as (payload: EventMap[K]) => void)(payload));
  }

  removeAllListeners(): void {
    this.listeners.clear();
  }
}
