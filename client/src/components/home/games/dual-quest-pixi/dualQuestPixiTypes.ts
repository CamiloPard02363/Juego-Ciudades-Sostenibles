// Tipos compartidos del motor PixiJS de Dúo Lógico. Independientes de los
// tipos de sala en tiempo real (dualQuestTypes.ts a nivel de socket) —
// estos describen la geometría y el estado del propio motor de juego.

export type Role = 'FIRE' | 'WATER';

export interface Vec2 {
  x: number;
  y: number;
}

/** Un tramo sólido de piso o pared. Rectángulo en coordenadas de mundo (px). */
export interface PlatformDef {
  x: number;
  y: number;
  width: number;
  height: number;
  /** Textura lógica, no visual — decide qué SVG/gradiente dibuja el renderer. */
  material: 'concrete' | 'dirt' | 'metal';
}

/** Un canal o pozo de líquido: contenido dentro de paredes, nunca "flotando". */
export interface LiquidZoneDef {
  x: number;
  y: number;
  width: number;
  height: number;
  kind: 'WATER' | 'LAVA' | 'WASTE';
}

export interface CrateDef {
  x: number;
  y: number;
  size: number;
}

export interface ButtonDef {
  id: string;
  x: number;
  y: number;
  /** Si es true, se mantiene activo solo mientras algo lo pisa (botón de
   * presión); si es false, alternar una vez lo deja activo (palanca). */
  momentary: boolean;
}

export interface DoorDef {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  /** IDs de botones/palancas que deben estar activos a la vez para abrir. */
  requires: string[];
  /** 'AND' exige todos a la vez; 'OR' con cualquiera basta. */
  logic: 'AND' | 'OR';
}

export interface PuzzlePieceDef {
  id: string;
  x: number;
  y: number;
  /** Qué rol puede recogerla; null = cualquiera. */
  role: Role | null;
  /** Color de la gema tallada (hex CSS) — cada ficha se ve distinta según
   * el concepto que representa, igual que en el prototipo SVG/CSS. */
  color: string;
  glow: string;
  concept: {
    title: string;
    /** Texto corto mostrado en el popup pedagógico al recogerla. */
    body: string;
    /** Fragmento de la imagen final (se compone junto a las demás piezas). */
    imagePieceUrl?: string;
  };
}

export interface HelperDogDef {
  x: number;
  y: number;
}

export interface LevelDef {
  id: string;
  title: string;
  widthPx: number;
  heightPx: number;
  fireStart: Vec2;
  waterStart: Vec2;
  platforms: PlatformDef[];
  liquids: LiquidZoneDef[];
  crates: CrateDef[];
  buttons: ButtonDef[];
  doors: DoorDef[];
  /** Mismo shape que `doors`, pero invertido: no hay nada ahí hasta que
   * se cumple la condición — un puente que aparece, no una puerta que se abre. */
  bridges: DoorDef[];
  puzzlePieces: PuzzlePieceDef[];
  dog: HelperDogDef | null;
  /** Zona que, al pisarla ambos jugadores, termina el nivel. */
  portal: { x: number; y: number; width: number; height: number };
  /** Imagen final mostrada al completar el nivel con todas las piezas. */
  finalReveal: {
    title: string;
    positiveUrl: string;
    negativeUrl: string;
    summary: string;
  };
}

export type GameEventMap = {
  'piece-collected': { pieceId: string; total: number; collected: number };
  'level-complete': { levelId: string; collected: number; total: number };
  'player-died': { role: Role; cause: 'WATER' | 'LAVA' | 'WASTE' };
  'door-state': { doorId: string; open: boolean };
};
