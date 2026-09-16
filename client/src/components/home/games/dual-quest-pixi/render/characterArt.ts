import type { Role } from '../dualQuestPixiTypes';

/**
 * El SVG original de Lumen/Gota (validado a mano en el prototipo) es un
 * solo dibujo con 5 partes: cuerpo (torso+cara) + 4 extremidades. Para
 * animar el ciclo de caminar en Pixi cada extremidad necesita ser su
 * propia Texture con su propio pivote de rotación (hombro/cadera) — así
 * que aquí partimos el SVG en 5 piezas, cada una en un lienzo 0-120 igual
 * al viewBox original, con la pieza dibujada en su posición real y todo
 * lo demás transparente. Como los 5 lienzos comparten el mismo sistema de
 * coordenadas, superponerlos en (0,0) los vuelve a armar exactos — y el
 * pivote de cada extremidad es simplemente su punto de hombro/cadera
 * dividido por 120, igual que hacía `transform-origin` en CSS.
 */

export interface LimbArt {
  svg: string;
  /** Punto de pivote en el mismo espacio 0-120 del SVG (hombro/cadera). */
  pivot: { x: number; y: number };
}

export interface CharacterArt {
  body: string;
  armL: LimbArt;
  armR: LimbArt;
  legL: LimbArt;
  legR: LimbArt;
}

// width/height explícitos son obligatorios aquí: un <img> que solo tiene
// viewBox (sin width/height) se rasteriza al tamaño por defecto del
// navegador (300x150), no al del viewBox — deformaría cada textura.
function frame(inner: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">${inner}</svg>`;
}

const LUMEN: CharacterArt = {
  body: frame(
    '<defs>' +
      '<radialGradient id="lumenBody" cx="40%" cy="40%" r="60%"><stop offset="0%" stop-color="#FFF3B0"/><stop offset="40%" stop-color="#FFD166"/><stop offset="85%" stop-color="#F77F00"/><stop offset="100%" stop-color="#D62828"/></radialGradient>' +
      '<filter id="dropShadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="2" dy="4" stdDeviation="3" flood-color="#000000" flood-opacity="0.25"/></filter>' +
      '</defs>' +
      '<g filter="url(#dropShadow)">' +
      '<path d="M 60 10 L 70 22 L 85 15 L 88 30 L 102 32 L 95 45 L 108 55 L 95 65 L 102 78 L 88 80 L 85 95 L 70 88 L 60 100 L 50 88 L 35 95 L 32 80 L 18 78 L 25 65 L 12 55 L 25 45 L 18 32 L 32 30 L 35 15 L 50 22 Z" fill="#FFD166" stroke="#F77F00" stroke-width="3" stroke-linejoin="round"/>' +
      '<circle cx="60" cy="55" r="28" fill="url(#lumenBody)" stroke="#F77F00" stroke-width="2"/>' +
      '<g fill="#212529">' +
      '<ellipse cx="51" cy="48" rx="3.5" ry="6"/><ellipse cx="69" cy="48" rx="3.5" ry="6"/>' +
      '<circle cx="52" cy="46" r="1.5" fill="#FFFFFF"/><circle cx="70" cy="46" r="1.5" fill="#FFFFFF"/>' +
      '<path d="M 46 58 Q 60 72, 74 58" fill="none" stroke="#212529" stroke-width="3" stroke-linecap="round"/>' +
      '<path d="M 44 56 Q 46 58, 48 56" fill="none" stroke="#212529" stroke-width="2" stroke-linecap="round"/>' +
      '<path d="M 72 56 Q 74 58, 76 56" fill="none" stroke="#212529" stroke-width="2" stroke-linecap="round"/>' +
      '</g></g>',
  ),
  armL: {
    svg: frame('<path d="M 40 60 Q 20 50, 15 35" stroke="#D62828" stroke-width="4.5" stroke-linecap="round" fill="none"/><circle cx="15" cy="35" r="4" fill="#D62828"/>'),
    pivot: { x: 40, y: 60 },
  },
  armR: {
    svg: frame('<path d="M 80 60 Q 100 50, 105 35" stroke="#D62828" stroke-width="4.5" stroke-linecap="round" fill="none"/><circle cx="105" cy="35" r="4" fill="#D62828"/>'),
    pivot: { x: 80, y: 60 },
  },
  legL: {
    svg: frame('<path d="M 50 85 Q 45 105, 30 105" stroke="#D62828" stroke-width="4.5" stroke-linecap="round" fill="none"/><rect x="22" y="102" width="10" height="6" rx="3" fill="#D62828"/>'),
    pivot: { x: 50, y: 85 },
  },
  legR: {
    svg: frame('<path d="M 70 85 Q 75 95, 90 95" stroke="#D62828" stroke-width="4.5" stroke-linecap="round" fill="none"/><rect x="85" y="92" width="10" height="6" rx="3" fill="#D62828"/>'),
    pivot: { x: 70, y: 85 },
  },
};

const GOTA: CharacterArt = {
  body: frame(
    '<defs>' +
      '<linearGradient id="gotaBody" x1="20%" y1="10%" x2="80%" y2="90%"><stop offset="0%" stop-color="#90E0EF"/><stop offset="40%" stop-color="#00B4D8"/><stop offset="85%" stop-color="#0077B6"/><stop offset="100%" stop-color="#03045E"/></linearGradient>' +
      '<filter id="dropShadowGota" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="2" dy="4" stdDeviation="3" flood-color="#000000" flood-opacity="0.25"/></filter>' +
      '</defs>' +
      '<g filter="url(#dropShadowGota)">' +
      '<path d="M 60 15 Q 45 5, 68 5 Q 60 25, 90 65 C 105 85, 85 105, 60 105 C 35 105, 15 85, 30 65 Q 50 30, 60 15 Z" fill="url(#gotaBody)" stroke="#0077B6" stroke-width="2" stroke-linejoin="round"/>' +
      '<path d="M 38 75 A 25 35 0 0 1 52 35" fill="none" stroke="#CAF0F8" stroke-width="4" stroke-linecap="round" opacity="0.6"/>' +
      '<g fill="#03045E">' +
      '<ellipse cx="48" cy="65" rx="3.5" ry="6"/><ellipse cx="68" cy="65" rx="3.5" ry="6"/>' +
      '<circle cx="49" cy="63" r="1.5" fill="#FFFFFF"/><circle cx="69" cy="63" r="1.5" fill="#FFFFFF"/>' +
      '<path d="M 42 75 Q 55 85, 75 72" fill="none" stroke="#03045E" stroke-width="3" stroke-linecap="round"/>' +
      '<path d="M 73 70 Q 75 72, 77 70" fill="none" stroke="#03045E" stroke-width="2" stroke-linecap="round"/>' +
      '</g></g>',
  ),
  armL: {
    svg: frame('<path d="M 38 75 Q 20 65, 20 50" stroke="#03045E" stroke-width="4.5" stroke-linecap="round" fill="none"/><circle cx="20" cy="50" r="4" fill="#03045E"/>'),
    pivot: { x: 38, y: 75 },
  },
  armR: {
    svg: frame('<path d="M 82 75 Q 100 70, 105 55" stroke="#03045E" stroke-width="4.5" stroke-linecap="round" fill="none"/><circle cx="105" cy="55" r="4" fill="#03045E"/>'),
    pivot: { x: 82, y: 75 },
  },
  legL: {
    svg: frame('<path d="M 45 100 Q 40 112, 25 110" stroke="#03045E" stroke-width="4.5" stroke-linecap="round" fill="none"/><rect x="18" y="107" width="10" height="6" rx="3" fill="#03045E"/>'),
    pivot: { x: 45, y: 100 },
  },
  legR: {
    svg: frame('<path d="M 75 100 Q 90 95, 95 85" stroke="#03045E" stroke-width="4.5" stroke-linecap="round" fill="none"/><rect x="88" y="82" width="10" height="6" rx="3" fill="#03045E" transform="rotate(15, 93, 85)"/>'),
    pivot: { x: 75, y: 100 },
  },
};

export function getCharacterArt(role: Role): CharacterArt {
  return role === 'FIRE' ? LUMEN : GOTA;
}
