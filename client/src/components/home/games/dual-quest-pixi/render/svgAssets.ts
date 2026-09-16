// Todas las texturas planas del prototipo SVG/CSS, verbatim — la
// geometría del nivel sigue viviendo en cada LevelDef, esto es solo el
// "material" que se estira sobre cada rectángulo (plataformas, pozos,
// peligros, caja, gemas, puerta y la ciudad de fondo).
//
// Cada <svg> lleva width/height iguales al viewBox a propósito: un <img>
// rasterizado a partir de un SVG que solo tiene viewBox (sin width/height)
// usa el tamaño por defecto del navegador (300x150), no el del viewBox —
// deformaría la textura resultante.

export const CONCRETE_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="60" viewBox="0 0 200 60" preserveAspectRatio="none">' +
  '<defs><linearGradient id="cTop" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#94A3B8"/><stop offset="100%" stop-color="#64748B"/></linearGradient>' +
  '<linearGradient id="cBody" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#475569"/><stop offset="100%" stop-color="#1E293B"/></linearGradient></defs>' +
  '<rect x="0" y="14" width="200" height="46" fill="url(#cBody)"/><rect x="0" y="0" width="200" height="16" fill="url(#cTop)"/>' +
  '<g stroke="#1E293B" stroke-width="1.5" opacity="0.5"><line x1="30" y1="0" x2="30" y2="16"/><line x1="90" y1="0" x2="90" y2="16"/><line x1="150" y1="0" x2="150" y2="16"/></g>' +
  '</svg>';

export const DIRT_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="60" viewBox="0 0 200 60" preserveAspectRatio="none">' +
  '<defs><linearGradient id="gTop" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#52B788"/><stop offset="100%" stop-color="#2D6A4F"/></linearGradient>' +
  '<linearGradient id="dBody" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#7F5539"/><stop offset="100%" stop-color="#3A1500"/></linearGradient></defs>' +
  '<rect x="0" y="14" width="200" height="46" fill="url(#dBody)"/><rect x="0" y="0" width="200" height="16" fill="url(#gTop)"/>' +
  '</svg>';

export const WATER_HAZARD_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="60" viewBox="0 0 100 60" preserveAspectRatio="none">' +
  '<defs><linearGradient id="wH" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#0284C7"/><stop offset="50%" stop-color="#38BDF8"/><stop offset="100%" stop-color="#0284C7"/></linearGradient></defs>' +
  '<rect y="14" width="100" height="46" fill="url(#wH)"/><path d="M0 20 Q12 12 25 20 T50 20 T75 20 T100 20" stroke="#fff" stroke-width="2" fill="none" opacity="0.6"/>' +
  '</svg>';

export const LAVA_HAZARD_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="60" viewBox="0 0 100 60" preserveAspectRatio="none">' +
  '<defs><linearGradient id="lH" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#FDE047"/><stop offset="35%" stop-color="#F97316"/><stop offset="100%" stop-color="#7C2D12"/></linearGradient></defs>' +
  '<rect y="14" width="100" height="46" fill="url(#lH)"/>' +
  '<circle cx="14" cy="24" r="4" fill="#FDE047" opacity="0.8"/><circle cx="38" cy="30" r="3" fill="#FDE047" opacity="0.7"/><circle cx="62" cy="22" r="5" fill="#FDE047" opacity="0.8"/><circle cx="84" cy="28" r="3.5" fill="#FDE047" opacity="0.7"/>' +
  '</svg>';

export const LAVA_POOL_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="140" viewBox="0 0 100 140" preserveAspectRatio="none">' +
  '<defs><linearGradient id="lP" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#FDBA74"/><stop offset="30%" stop-color="#F97316"/><stop offset="100%" stop-color="#7C2D12"/></linearGradient></defs>' +
  '<rect width="100" height="140" fill="url(#lP)"/>' +
  '<circle cx="18" cy="30" r="5" fill="#FDE047" opacity="0.8"/><circle cx="48" cy="60" r="6" fill="#FDE047" opacity="0.7"/><circle cx="76" cy="40" r="4" fill="#FDE047" opacity="0.8"/>' +
  '<circle cx="30" cy="95" r="5" fill="#FDE047" opacity="0.6"/><circle cx="66" cy="105" r="6" fill="#FDE047" opacity="0.7"/>' +
  '</svg>';

export const WATER_POOL_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="140" viewBox="0 0 100 140" preserveAspectRatio="none">' +
  '<defs><linearGradient id="wP" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#7DD3FC"/><stop offset="30%" stop-color="#0284C7"/><stop offset="100%" stop-color="#03045E"/></linearGradient></defs>' +
  '<rect width="100" height="140" fill="url(#wP)"/>' +
  '<path d="M10 30 Q20 24 30 30 T50 30" stroke="#fff" stroke-width="1.5" fill="none" opacity="0.4"/>' +
  '<path d="M55 70 Q65 64 75 70 T95 70" stroke="#fff" stroke-width="1.5" fill="none" opacity="0.35"/>' +
  '<path d="M15 110 Q25 104 35 110 T55 110" stroke="#fff" stroke-width="1.5" fill="none" opacity="0.3"/>' +
  '</svg>';

export const CRATE_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 30 30">' +
  '<rect x="1" y="1" width="28" height="28" rx="2" fill="#B45309" stroke="#78350F" stroke-width="2"/>' +
  '<path d="M1 1 L29 29 M29 1 L1 29" stroke="#78350F" stroke-width="1.5" opacity="0.6"/>' +
  '</svg>';

export function gemSvg(color: string, glow: string): string {
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="28" viewBox="0 0 24 28">' +
    '<polygon points="12,2 20,13 12,26 4,13" fill="' + color + '" style="filter:drop-shadow(0 0 4px ' + glow + ')"/>' +
    '</svg>'
  );
}

// La misma puerta de candado dual sirve como visual del Portal (la meta
// del nivel): dos mitades, una amarilla y una azul, que se apagan cuando
// el nivel se completa — igual que en el prototipo. Se hornean dos
// variantes (bloqueada/desbloqueada) porque una textura rasterizada no
// puede desvanecer solo una parte de sí misma en tiempo real como sí
// podía hacerlo `.lock-half{ opacity }` en CSS.
function doorSvg(lockOpacity: number, glow: boolean): string {
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" width="180" height="220" viewBox="0 0 180 220">' +
    '<rect x="20" y="190" width="140" height="15" rx="4" fill="#1E293B"/>' +
    '<path d="M 30 190 L 30 80 A 60 60 0 0 1 150 80 L 150 190 Z" fill="#334155" stroke="#0F172A" stroke-width="4"/>' +
    '<path d="M 50 190 L 50 90 A 40 40 0 0 1 130 90 L 130 190 Z" fill="#0F172A" stroke="#1E293B" stroke-width="2"/>' +
    '<circle cx="90" cy="140" r="15" fill="#1E293B" stroke="#475569" stroke-width="3"' + (glow ? ' style="filter:drop-shadow(0 0 8px #ffffff)"' : '') + '/>' +
    '<path d="M 90 125 L 90 155" stroke="#FACC15" stroke-width="4" opacity="' + lockOpacity + '"/>' +
    '<path d="M 75 140 L 105 140" stroke="#38BDF8" stroke-width="4" opacity="' + lockOpacity + '"/>' +
    '</svg>'
  );
}
export const DOOR_LOCKED_SVG = doorSvg(1, false);
export const DOOR_UNLOCKED_SVG = doorSvg(0.15, true);

// Torre + rieles del ascensor (parte fija). La cabina se rasteriza aparte
// (ELEVATOR_CABIN_SVG) porque es lo único que se mueve.
//
// NOTA: estas dos texturas están listas pero todavía no las consume
// ningún entity — el ascensor del prototipo es una plataforma móvil con
// su propia calibración física (ver el historial de bugs de "flota y no
// conecta con nada" en el prototipo CSS) y preferí no improvisarla de
// apuro en esta pasada. Cuando se construya `entities/Elevator.ts`, la
// textura ya está aquí lista para usarse.
export const ELEVATOR_TOWER_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="140" height="400" viewBox="0 0 140 400" preserveAspectRatio="none">' +
  '<defs><linearGradient id="towerGrad" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#1E293B"/><stop offset="50%" stop-color="#334155"/><stop offset="100%" stop-color="#1E293B"/></linearGradient></defs>' +
  '<rect x="8" y="0" width="14" height="400" fill="url(#towerGrad)"/>' +
  '<rect x="118" y="0" width="14" height="400" fill="url(#towerGrad)"/>' +
  '<line x1="63" y1="0" x2="63" y2="400" stroke="#475569" stroke-width="2" stroke-dasharray="4,4"/>' +
  '<line x1="77" y1="0" x2="77" y2="400" stroke="#475569" stroke-width="2" stroke-dasharray="4,4"/>' +
  '<rect x="0" y="4" width="140" height="10" fill="#0F172A" stroke="#FACC15" stroke-width="2"/>' +
  '<rect x="0" y="386" width="140" height="10" fill="#0F172A" stroke="#38BDF8" stroke-width="2"/>' +
  '</svg>';

export const ELEVATOR_CABIN_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="140" height="90" viewBox="0 0 140 90">' +
  '<defs>' +
  '<linearGradient id="elevatorPlatform" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#FFD166"/><stop offset="60%" stop-color="#FFB703"/><stop offset="100%" stop-color="#FB8500"/></linearGradient>' +
  '<linearGradient id="elevatorFrame" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#E2E8F0"/><stop offset="50%" stop-color="#CBD5E1"/><stop offset="100%" stop-color="#64748B"/></linearGradient>' +
  '</defs>' +
  '<rect x="15" y="0" width="110" height="80" rx="6" fill="url(#elevatorFrame)" stroke="#475569" stroke-width="2.5"/>' +
  '<rect x="22" y="7" width="96" height="60" rx="3" fill="#E0F2FE" opacity="0.6" stroke="#94A3B8" stroke-width="1"/>' +
  '<rect x="10" y="70" width="120" height="16" rx="3" fill="url(#elevatorPlatform)" stroke="#D97706" stroke-width="2"/>' +
  '</svg>';

export function buildingSvg(windowRows: number, tint: string): string {
  let windows = '';
  for (let r = 0; r < windowRows; r++) {
    const y = 10 + r * 15;
    windows +=
      `<rect x="8" y="${y}" width="14" height="9" rx="1" fill="#BAE6FD" opacity="0.75"/>` +
      `<rect x="28" y="${y}" width="14" height="9" rx="1" fill="#BAE6FD" opacity="0.6"/>`;
  }
  const h = 20 + windowRows * 15;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="50" height="${h}" viewBox="0 0 50 ${h}" preserveAspectRatio="none"><rect width="50" height="${h}" fill="${tint}"/>${windows}</svg>`;
}

export const TREE_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="60" height="70" viewBox="0 0 60 70">' +
  '<path d="M27 40 L25 68 L35 68 L33 40 Z" fill="#7F5539"/>' +
  '<circle cx="30" cy="30" r="22" fill="#2D6A4F"/><circle cx="20" cy="22" r="13" fill="#52B788" opacity="0.7"/><circle cx="38" cy="20" r="12" fill="#74C69D" opacity="0.6"/>' +
  '</svg>';
