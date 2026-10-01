export class InvalidGamePlayResultError extends Error {
  constructor(reason: string) {
    super(`Resultado de partida inválido: ${reason}`);
    this.name = 'InvalidGamePlayResultError';
  }
}
