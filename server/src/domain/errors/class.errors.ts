export class InvalidClassNameError extends Error {
  constructor() {
    super('El nombre de la clase debe tener entre 3 y 80 caracteres.');
    this.name = 'InvalidClassNameError';
  }
}
