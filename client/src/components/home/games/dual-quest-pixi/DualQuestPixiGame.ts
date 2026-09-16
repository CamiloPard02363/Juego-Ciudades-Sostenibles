import Matter from 'matter-js';
import { Container, Sprite, type Texture } from 'pixi.js';
import { createPixiApp, type PixiAppHandles } from './engine/PixiApp';
import { createPhysicsWorld, type PhysicsWorldHandles } from './engine/PhysicsWorld';
import { InputController } from './engine/InputController';
import { Player } from './entities/Player';
import { PushableCrate } from './entities/PushableCrate';
import { ButtonEntity } from './entities/Button';
import { DoorEntity } from './entities/Door';
import { BridgeEntity } from './entities/Bridge';
import { HelperDog } from './entities/HelperDog';
import { LiquidZoneEntity } from './entities/LiquidZone';
import { PuzzlePieceEntity } from './entities/PuzzlePiece';
import { PortalEntity } from './entities/Portal';
import { buildPlatform } from './level/buildPlatform';
import { LinkSystem } from './systems/LinkSystem';
import { GameStateManager } from './ui/GameStateManager';
import { loadAssets, type Assets } from './render/AssetLibrary';
import type { LevelDef } from './dualQuestPixiTypes';

/**
 * Orquestador de una partida. Reúne PixiApp + PhysicsWorld + un LevelDef
 * en una sola instancia con un `start()`/`destroy()` — es lo único que el
 * wrapper de React necesita conocer (ver DualQuestPixiMount.tsx). Toda la
 * comunicación hacia la UI de React sale por `game.state` (GameStateManager),
 * nunca al revés: React nunca toca los bodies de Matter directamente.
 */
export class DualQuestPixiGame {
  readonly state: GameStateManager;
  private pixi!: PixiAppHandles;
  private physics!: PhysicsWorldHandles;
  private link = new LinkSystem();

  private fire!: Player;
  private water!: Player;
  private dog: HelperDog | null = null;
  private crates: PushableCrate[] = [];
  private buttons: ButtonEntity[] = [];
  private doors: DoorEntity[] = [];
  private bridges: BridgeEntity[] = [];
  private liquids: LiquidZoneEntity[] = [];
  private pieces: PuzzlePieceEntity[] = [];
  private portal!: PortalEntity;
  private portalOccupants = new Set<Matter.Body>();

  private tickerCallback = (): void => this.onTick();
  private readonly level: LevelDef;
  private assets!: Assets;

  constructor(level: LevelDef) {
    this.level = level;
    this.state = new GameStateManager(level);
  }

  async mount(container: HTMLElement): Promise<void> {
    // Las texturas se cargan antes que nada: construir el nivel las da
    // por hechas (cada entidad recibe la suya ya lista, ninguna carga la
    // propia por su cuenta).
    this.assets = await loadAssets();
    // Se precargan aparte (no dentro de buildLevel) para que ninguna
    // ficha aparezca con un "pop-in" a medio segundo de haber arrancado
    // el nivel — cuando el ticker empieza a correr, todo ya está listo.
    const pieceTextures = await this.preloadPieceTextures();
    this.pixi = await createPixiApp(container);
    this.physics = createPhysicsWorld();
    this.buildLevel(pieceTextures);
    this.wireCollisions();
    this.state.on('piece-collected', ({ collected, total }) => {
      this.portal.setUnlocked(collected === total);
      this.evaluatePortal(); // por si ambos ya estaban esperando ahí con la última ficha
    });
    this.pixi.app.ticker.add(this.tickerCallback);
  }

  destroy(): void {
    this.pixi.app.ticker.remove(this.tickerCallback);
    this.fire.destroy();
    this.water.destroy();
    this.physics.destroy();
    this.pixi.destroy();
    this.state.removeAllListeners();
  }

  /** Comando externo: usarlo desde el jugador que interactúa con el perro. */
  commandDogTo(target: { x: number; y: number }): void {
    this.dog?.commandMoveTo(target);
  }

  private async preloadPieceTextures(): Promise<Map<string, Texture>> {
    const entries = await Promise.all(
      this.level.puzzlePieces.map(async (p): Promise<[string, Texture]> => [p.id, await this.assets.gem(p.color, p.glow)]),
    );
    return new Map(entries);
  }

  private buildLevel(pieceTextures: Map<string, Texture>): void {
    const { world } = this.physics;
    const { world: worldContainer } = this.pixi;
    const assets = this.assets;

    this.buildBackground(worldContainer);

    for (const platformDef of this.level.platforms) {
      const texture = platformDef.material === 'dirt' ? assets.dirt : assets.concrete; // 'metal' cae en concreto: mismo lenguaje visual industrial
      const { body, view } = buildPlatform(platformDef, texture);
      Matter.World.add(world, body);
      worldContainer.addChild(view);
    }

    for (const liquidDef of this.level.liquids) {
      const texture = liquidDef.kind === 'LAVA' ? assets.lavaPool : assets.waterPool;
      const liquid = new LiquidZoneEntity(liquidDef, texture);
      Matter.World.add(world, liquid.sensor);
      worldContainer.addChild(liquid.view);
      this.liquids.push(liquid);
    }

    for (const crateDef of this.level.crates) {
      const crate = new PushableCrate(crateDef, crateDef.size, assets.crate);
      Matter.World.add(world, crate.body);
      worldContainer.addChild(crate.view);
      this.crates.push(crate);
    }

    for (const buttonDef of this.level.buttons) {
      const button = new ButtonEntity(buttonDef, this.link);
      Matter.World.add(world, button.sensor);
      worldContainer.addChild(button.view);
      this.buttons.push(button);
    }

    for (const doorDef of this.level.doors) {
      const door = new DoorEntity(doorDef, world, this.link);
      worldContainer.addChild(door.view);
      this.doors.push(door);
    }

    for (const bridgeDef of this.level.bridges) {
      const bridge = new BridgeEntity(bridgeDef, world, this.link);
      worldContainer.addChild(bridge.view);
      this.bridges.push(bridge);
    }

    for (const pieceDef of this.level.puzzlePieces) {
      const texture = pieceTextures.get(pieceDef.id);
      if (!texture) continue; // no debería pasar: se precargan todas antes de llegar aquí
      const piece = new PuzzlePieceEntity(pieceDef, texture);
      Matter.World.add(world, piece.sensor);
      worldContainer.addChild(piece.view);
      this.pieces.push(piece);
    }

    this.portal = new PortalEntity(
      this.level.portal.x,
      this.level.portal.y,
      this.level.portal.width,
      this.level.portal.height,
      assets.doorLocked,
      assets.doorUnlocked,
    );
    Matter.World.add(world, this.portal.sensor);
    worldContainer.addChild(this.portal.view);

    if (this.level.dog) {
      this.dog = new HelperDog(this.level.dog);
      Matter.World.add(world, this.dog.body);
      worldContainer.addChild(this.dog.view);
    }

    this.fire = new Player({ role: 'FIRE', start: this.level.fireStart, input: new InputController('WASD'), assets });
    this.water = new Player({ role: 'WATER', start: this.level.waterStart, input: new InputController('ARROWS'), assets });
    Matter.World.add(world, [this.fire.body, this.water.body]);
    worldContainer.addChild(this.fire.view, this.water.view);
  }

  /** Ciudad de fondo: solo decorativa (sin cuerpos físicos), una sola vez
   * al construir el nivel. Se agrega antes que todo lo demás para que
   * quede detrás de plataformas y personajes en el orden de pintado. */
  private buildBackground(worldContainer: Container): void {
    const assets = this.assets;
    const bg = new Container();
    bg.alpha = 0.5;

    const buildings: Array<[number, typeof assets.buildingTall, number]> = [
      [40, assets.buildingTall, 260],
      [140, assets.buildingShort, 170],
      [this.level.widthPx - 220, assets.buildingShort, 170],
      [this.level.widthPx - 120, assets.buildingTall, 260],
    ];
    for (const [x, texture, height] of buildings) {
      const sprite = new Sprite(texture);
      sprite.width = 70;
      sprite.height = height;
      sprite.position.set(x, this.level.heightPx - height - 10);
      bg.addChild(sprite);
    }

    const treeXs = [10, 320, 620, 1000, 1300, this.level.widthPx - 60];
    for (const x of treeXs) {
      const sprite = new Sprite(assets.tree);
      sprite.width = 70;
      sprite.height = 82;
      sprite.position.set(x, this.level.heightPx - 92);
      bg.addChild(sprite);
    }

    worldContainer.addChild(bg);
  }

  /** Un único listener de colisión que reparte por prefijo de `label` —
   * mantiene a Matter desacoplado de cada clase de entidad concreta. */
  private wireCollisions(): void {
    const { engine } = this.physics;

    const handle = (pair: Matter.Pair, isStart: boolean): void => {
      const [a, b] = [pair.bodyA, pair.bodyB];
      this.routePair(a, b, isStart);
      this.routePair(b, a, isStart);
    };

    Matter.Events.on(engine, 'collisionStart', (e) => e.pairs.forEach((p) => handle(p, true)));
    Matter.Events.on(engine, 'collisionEnd', (e) => e.pairs.forEach((p) => handle(p, false)));
  }

  private routePair(self: Matter.Body, other: Matter.Body, isStart: boolean): void {
    const label = self.label;

    if (label.startsWith('button:')) {
      if (this.isPressBody(other)) {
        const id = label.slice('button:'.length);
        this.buttons.find((b) => b.id === id)?.onOccupantChange(isStart ? 1 : -1);
      }
      return;
    }

    if (label.startsWith('liquid:')) {
      const player = this.playerFor(other);
      if (!player) return;
      const kind = label.slice('liquid:'.length) as 'WATER' | 'LAVA' | 'WASTE';
      const own = (player.role === 'FIRE' && kind === 'LAVA') || (player.role === 'WATER' && kind === 'WATER');
      if (own) {
        player.setInOwnLiquid(isStart);
      } else if (isStart && player.isAlive()) {
        player.kill();
        this.state.reportDeath(player.role, kind === 'WASTE' ? 'WASTE' : kind);
        window.setTimeout(() => this.respawnPlayer(player), 1000);
      }
      return;
    }

    if (label === 'terrain' || label.startsWith('bridge:')) {
      const player = this.playerFor(other);
      player?.setGroundContact(isStart ? 1 : -1);
      return;
    }

    if (label.startsWith('piece:') && isStart) {
      const other2 = this.playerFor(other);
      if (!other2) return;
      const id = label.slice('piece:'.length);
      const piece = this.pieces.find((p) => p.def.id === id);
      if (!piece || piece.isCollected()) return;
      if (piece.def.role && piece.def.role !== other2.role) return;
      piece.markCollected();
      this.state.collectPiece(piece.def);
      return;
    }

    if (label === 'portal') {
      const player = this.playerFor(other);
      if (!player) return;
      if (isStart) this.portalOccupants.add(other);
      else this.portalOccupants.delete(other);
      this.evaluatePortal();
    }
  }

  private evaluatePortal(): void {
    const roles = new Set<'FIRE' | 'WATER'>();
    this.portalOccupants.forEach((body) => {
      const player = this.playerFor(body);
      if (player) roles.add(player.role);
    });
    if (roles.has('FIRE') && roles.has('WATER')) this.state.completeLevel();
  }

  private isPressBody(body: Matter.Body): boolean {
    return body === this.fire.body || body === this.water.body || body === this.dog?.body || this.crates.some((c) => c.body === body);
  }

  private playerFor(body: Matter.Body): Player | null {
    if (body === this.fire.body) return this.fire;
    if (body === this.water.body) return this.water;
    return null;
  }

  private respawnPlayer(player: Player): void {
    const start = player.role === 'FIRE' ? this.level.fireStart : this.level.waterStart;
    player.respawn(start);
  }

  private onTick(): void {
    const ticker = this.pixi.app.ticker;

    if (!this.state.isPaused()) {
      this.fire.update(ticker.deltaMS);
      this.water.update(ticker.deltaMS);
      this.dog?.update();
      this.physics.step(ticker.deltaMS);
    }

    this.crates.forEach((c) => c.syncView());
    this.doors.forEach((d) => d.update(ticker));
    this.bridges.forEach((b) => b.update(ticker));
    // Se repite fuera del `if` de arriba a propósito: durante una pausa
    // pedagógica (popup de ficha) el input/física se congelan, pero un
    // respawn puede seguir moviendo el body — esto mantiene el sprite
    // correcto en pantalla aunque no se llame a player.update() ese frame.
    this.fire.view.position.set(this.fire.body.position.x, this.fire.body.position.y);
    this.water.view.position.set(this.water.body.position.x, this.water.body.position.y);
  }
}
