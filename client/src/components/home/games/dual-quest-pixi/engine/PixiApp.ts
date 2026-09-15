import { Application, Container } from 'pixi.js';

/**
 * Arranque del Application de PixiJS v8. La inicialización es asíncrona
 * desde v8 (WebGPU se detecta y negocia antes de tener un contexto listo),
 * así que esto siempre debe esperarse con `await` antes de tocar `app.stage`.
 */
export interface PixiAppHandles {
  app: Application;
  /** Todo lo que se mueve con la cámara (mundo del nivel). */
  world: Container;
  /** HUD/overlays que deben quedarse fijos en pantalla, sin importar la cámara. */
  hud: Container;
  destroy: () => void;
}

export async function createPixiApp(mountEl: HTMLElement): Promise<PixiAppHandles> {
  const app = new Application();

  await app.init({
    resizeTo: mountEl,
    backgroundColor: 0x0f172a,
    antialias: true,
    // WebGPU cuando está disponible, con fallback automático a WebGL —
    // PixiJS v8 decide esto internamente durante init().
    preference: 'webgpu',
    resolution: Math.min(window.devicePixelRatio || 1, 2),
    autoDensity: true,
  });

  mountEl.appendChild(app.canvas);

  const world = new Container();
  const hud = new Container();
  app.stage.addChild(world, hud);

  function destroy(): void {
    app.destroy(true, { children: true, texture: true });
  }

  return { app, world, hud, destroy };
}
