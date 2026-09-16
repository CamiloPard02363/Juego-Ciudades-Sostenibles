export interface InputState {
  left: boolean;
  right: boolean;
  jump: boolean;
  /** Nadar hacia abajo / bucear cuando el rol está en su líquido propio. */
  down: boolean;
  /** Tecla de interacción (palancas, mandar al perro) — un pulso, no un hold. */
  interactPressed: boolean;
}

export type InputScheme = 'WASD' | 'ARROWS';

const KEY_MAP: Record<InputScheme, Record<string, keyof InputState>> = {
  WASD: { KeyA: 'left', KeyD: 'right', KeyW: 'jump', KeyS: 'down', KeyE: 'interactPressed' },
  ARROWS: {
    ArrowLeft: 'left',
    ArrowRight: 'right',
    ArrowUp: 'jump',
    ArrowDown: 'down',
    Enter: 'interactPressed',
    ShiftRight: 'interactPressed',
  },
};

/**
 * Un controlador por jugador. Dos instancias (una WASD, una de flechas)
 * escuchando el mismo `window` es lo que permite el input asimétrico de
 * un juego cooperativo de un solo teclado — cada una solo reacciona a su
 * propio set de teclas físicas.
 */
export class InputController {
  private state: InputState = { left: false, right: false, jump: false, down: false, interactPressed: false };
  private readonly keyMap: Record<string, keyof InputState>;
  private readonly onKeyDown = (e: KeyboardEvent): void => this.setKey(e.code, true);
  private readonly onKeyUp = (e: KeyboardEvent): void => this.setKey(e.code, false);

  constructor(scheme: InputScheme) {
    this.keyMap = KEY_MAP[scheme];
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  private setKey(code: string, isDown: boolean): void {
    const field = this.keyMap[code];
    if (!field) return;
    if (field === 'interactPressed') {
      // Palancas/comandos son de un solo pulso: solo se marca en el
      // flanco de bajada de la tecla, nunca en el keyup.
      if (isDown) this.state.interactPressed = true;
      return;
    }
    this.state[field] = isDown;
  }

  /** Lee el estado actual y limpia el pulso de interacción — llamar una
   * vez por frame de juego, nunca más de una, o se pierden pulsos. */
  poll(): InputState {
    const snapshot = { ...this.state };
    this.state.interactPressed = false;
    return snapshot;
  }

  destroy(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
  }
}
