import type { LevelDef } from '../dualQuestPixiTypes';

/**
 * Nivel de ejemplo: "Ciudad Sostenible I". Tres pisos conectados en
 * vertical y horizontal, con las trampas contenidas en canales reales
 * (nunca flotando) y 4 puzzles encadenados:
 *
 *   1. Perro + botón + puente: Lumen manda al perro a sostener el botón,
 *      aparece el puente sobre el foso; Gota lo cruza y tira de la
 *      palanca, que abre la compuerta hacia el segundo piso — el flujo
 *      exacto pedido en el brief.
 *   2. Caja empujable: hay que empujarla bajo una cornisa alta para
 *      alcanzar la Ficha 2.
 *   3. Canal de lava contenido: Lumen nada libre por su propio elemento
 *      para cruzar directo; Gota debe tomar la ruta alta alternativa.
 *   4. Portal final: exige las 4 fichas Y a los dos jugadores presentes
 *      a la vez (ver DualQuestPixiGame.evaluatePortal).
 */
export const level1EnergiaRenovable: LevelDef = {
  id: 'ciudad-sostenible-1',
  title: 'Ciudad Sostenible I: Energía que se comparte',
  widthPx: 1700,
  heightPx: 1000,

  fireStart: { x: 80, y: 800 },
  waterStart: { x: 170, y: 800 },
  dog: { x: 230, y: 800 },

  platforms: [
    // --- Piso 1 (planta baja) ---
    { x: 0, y: 860, width: 300, height: 140, material: 'concrete' }, // plataforma inicial
    { x: 460, y: 860, width: 260, height: 140, material: 'concrete' }, // tras el foso/puente

    // Escalones de piso 1 a piso 2
    { x: 560, y: 760, width: 110, height: 40, material: 'metal' },
    { x: 650, y: 660, width: 110, height: 40, material: 'metal' },

    // --- Piso 2 ---
    { x: 460, y: 560, width: 400, height: 40, material: 'concrete' }, // con la caja empujable
    { x: 1020, y: 560, width: 260, height: 40, material: 'concrete' }, // al otro lado de la lava (ruta de Lumen)

    // Cornisa alta que exige la caja para alcanzarla (Ficha 2)
    { x: 700, y: 420, width: 140, height: 30, material: 'metal' },

    // Ruta alterna de Gota (bordea la lava por arriba)
    { x: 760, y: 460, width: 90, height: 30, material: 'dirt' },
    { x: 840, y: 360, width: 90, height: 30, material: 'dirt' },

    // Escalones de piso 2 a piso 3 (ruta de Lumen tras cruzar la lava)
    { x: 1080, y: 420, width: 90, height: 30, material: 'metal' },
    { x: 1160, y: 320, width: 90, height: 30, material: 'metal' },

    // --- Piso 3 (sala del portal, compartida) ---
    { x: 900, y: 260, width: 700, height: 40, material: 'concrete' },
  ],

  // Contenidos entre plataformas reales — nunca flotando en el vacío.
  liquids: [
    { x: 860, y: 560, width: 160, height: 120, kind: 'LAVA' }, // entre las dos plataformas de piso 2
  ],

  crates: [{ x: 560, y: 500, size: 48 }],

  buttons: [
    { id: 'dogButton', x: 220, y: 860, momentary: true }, // lo sostiene el perro
    { id: 'leverFinal', x: 560, y: 860, momentary: false }, // palanca: la tira Gota
  ],

  // Puente sobre el foso plano entre las dos plataformas de piso 1 — NO
  // es un hazard elemental, es un vacío real que ambos deben cruzar.
  bridges: [{ id: 'bridge1', x: 380, y: 860, width: 160, height: 30, requires: ['dogButton'], logic: 'AND' }],

  doors: [
    // Se abre al tirar la palanca — deja pasar hacia los escalones de piso 2.
    { id: 'doorFinal', x: 700, y: 790, width: 30, height: 140, requires: ['leverFinal'], logic: 'AND' },
  ],

  puzzlePieces: [
    {
      id: 'piece-1',
      x: 150,
      y: 800,
      role: null,
      color: '#FFD166',
      glow: '#FACC15',
      concept: {
        title: 'Energía Compartida',
        body: 'Una ciudad sostenible reparte su energía entre todos sus barrios en vez de concentrarla en unos pocos — por eso aquí nadie cruza solo.',
      },
    },
    {
      id: 'piece-2',
      x: 770,
      y: 390,
      role: null,
      color: '#38BDF8',
      glow: '#38BDF8',
      concept: {
        title: 'Infraestructura Compartida',
        body: 'Mover un solo bloque pesado entre dos personas construye más rápido que hacerlo solos — así se construyen las ciudades reales.',
      },
    },
    {
      id: 'piece-3',
      x: 940,
      y: 620,
      role: 'FIRE',
      color: '#FDBA74',
      glow: '#F97316',
      concept: {
        title: 'Resiliencia Energética',
        body: 'Una fuente de energía renovable (como Lumen en la lava) sigue funcionando donde otras fuentes fallarían.',
      },
    },
    {
      id: 'piece-4',
      x: 885,
      y: 330,
      role: 'WATER',
      color: '#7DD3FC',
      glow: '#38BDF8',
      concept: {
        title: 'Gestión del Agua',
        body: 'Cuando una ruta está contaminada o es peligrosa, una ciudad sostenible siempre planea una alternativa segura — la ruta alta de Gota.',
      },
    },
  ],

  portal: { x: 1500, y: 220, width: 100, height: 120 },

  finalReveal: {
    title: 'Ciudad Sostenible I: Energía que se comparte',
    positiveUrl: '/assets/dual-quest/reveal-energia-positivo.svg',
    negativeUrl: '/assets/dual-quest/reveal-energia-negativo.svg',
    summary:
      'A la izquierda, una ciudad con energía renovable repartida y rutas seguras para todos. A la derecha, una ciudad que depende de una sola fuente contaminante y dejó sin alternativa a quienes más la necesitaban.',
  },
};
