/**
 * "Circuito" de señales: botones/palancas escriben un booleano por id,
 * las puertas leen una combinación de ids con AND/OR. Desacoplar esto de
 * las clases Button/Door es lo que permite puzzles de varios pasos (un
 * botón que el perro sostiene + una palanca que tira el jugador, ambos
 * alimentando la misma puerta) sin que Button y Door se conozcan entre sí.
 */
export class LinkSystem {
  private signals = new Map<string, boolean>();
  private subscribers = new Map<string, Set<() => void>>();

  setSignal(id: string, active: boolean): void {
    if (this.signals.get(id) === active) return;
    this.signals.set(id, active);
    this.subscribers.get(id)?.forEach((cb) => cb());
  }

  getSignal(id: string): boolean {
    return this.signals.get(id) ?? false;
  }

  /** Se re-evalúa cada vez que CUALQUIERA de los ids observados cambia. */
  watch(ids: string[], onChange: () => void): () => void {
    ids.forEach((id) => {
      if (!this.subscribers.has(id)) this.subscribers.set(id, new Set());
      this.subscribers.get(id)!.add(onChange);
    });
    return () => ids.forEach((id) => this.subscribers.get(id)?.delete(onChange));
  }

  evaluate(ids: string[], logic: 'AND' | 'OR'): boolean {
    if (ids.length === 0) return true;
    return logic === 'AND' ? ids.every((id) => this.getSignal(id)) : ids.some((id) => this.getSignal(id));
  }
}
