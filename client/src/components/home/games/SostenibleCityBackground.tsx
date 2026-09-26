import { CITY_MAP_HEIGHT, CITY_MAP_WIDTH } from './sostenibleCityMap'

/**
 * El SVG completo de "Ciudad Sostenible" que ilustró el profesor, tal cual
 * — es el fondo real del layout CITY, reemplazando por completo el mosaico
 * de bloques de colores generado por CSS que había antes (ver el issue: "el
 * mapa anterior sigue vivo, la idea es eliminar por completo y el svg, sea
 * el que suplemente este"). Se usa `dangerouslySetInnerHTML` en vez de
 * convertir cada atributo kebab-case a camelCase a mano (cientos de
 * `stroke-width`/`stop-color`/etc.) — es contenido estático del propio
 * proyecto, no algo que llegue de un usuario, así que es seguro.
 *
 * El grupo original "game-collectibles-layer" (con posiciones de ejemplo
 * fijas para PET/canecas/bolsas/e-waste) se quitó a propósito: esos
 * objetos los coloca el motor de forma aleatoria en cada partida (ver
 * mazeEngine.ts, buildLevelBoard), nunca en coordenadas fijas.
 *
 * La cuadrícula de colisión (sostenibleCityMap.ts) se derivó directamente
 * de los mismos rects de "MANZANAS URBANAS BASE" de este SVG, así que el
 * camión/nubes/coleccionables — que se dibujan aparte, encima de este
 * fondo — quedan perfectamente alineados con las calles y edificios que se
 * ven acá.
 */
const CITY_MAP_SVG_MARKUP = `
  <defs>
    <linearGradient id="solarGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#29b6f6"/>
      <stop offset="100%" stop-color="#0277bd"/>
    </linearGradient>
    <linearGradient id="ecoWood" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#8d6e63"/>
      <stop offset="100%" stop-color="#4e342e"/>
    </linearGradient>
    <linearGradient id="lakeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#80deea"/>
      <stop offset="50%" stop-color="#26c6da"/>
      <stop offset="100%" stop-color="#0097a7"/>
    </linearGradient>
    <radialGradient id="grassGrad" cx="50%" cy="50%" r="70%">
      <stop offset="0%" stop-color="#4caf50"/>
      <stop offset="70%" stop-color="#2e7d32"/>
      <stop offset="100%" stop-color="#1b5e20"/>
    </radialGradient>
    <filter id="block-shadow" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="0" dy="3" stdDeviation="4" flood-color="#000000" flood-opacity="0.35"/>
    </filter>

    <radialGradient id="leafGrad1" cx="40%" cy="40%" r="60%">
      <stop offset="0%" stop-color="#4ade80"/>
      <stop offset="70%" stop-color="#16a34a"/>
      <stop offset="100%" stop-color="#14532d"/>
    </radialGradient>
    <radialGradient id="leafGrad2" cx="40%" cy="40%" r="60%">
      <stop offset="0%" stop-color="#aed581"/>
      <stop offset="70%" stop-color="#558b2f"/>
      <stop offset="100%" stop-color="#33691e"/>
    </radialGradient>

    <linearGradient id="mainFacade" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#334155"/>
      <stop offset="50%" stop-color="#1e293b"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>
    <linearGradient id="glassCurtain" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.85"/>
      <stop offset="40%" stop-color="#0284c7" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="#0369a1" stop-opacity="0.95"/>
    </linearGradient>
    <linearGradient id="goldBeam" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#fde047"/>
      <stop offset="50%" stop-color="#eab308"/>
      <stop offset="100%" stop-color="#ca8a04"/>
    </linearGradient>
    <linearGradient id="woodTerrace" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#a16207"/>
      <stop offset="100%" stop-color="#713f12"/>
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="3" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
    <filter id="heavyShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="#000000" flood-opacity="0.5"/>
    </filter>
  </defs>

  <rect width="800" height="600" fill="#2c3e50"/>

  <g stroke="#f1c40f" stroke-width="1.5" stroke-dasharray="6,6" opacity="0.45">
    <line x1="0" y1="50" x2="800" y2="50"/>
    <line x1="0" y1="180" x2="800" y2="180"/>
    <line x1="0" y1="300" x2="800" y2="300"/>
    <line x1="0" y1="420" x2="800" y2="420"/>
    <line x1="0" y1="550" x2="800" y2="550"/>

    <line x1="120" y1="50" x2="120" y2="180"/>
    <line x1="300" y1="50" x2="300" y2="180"/>
    <line x1="500" y1="50" x2="500" y2="180"/>
    <line x1="680" y1="50" x2="680" y2="180"/>

    <line x1="200" y1="180" x2="200" y2="300"/>
    <line x1="380" y1="180" x2="380" y2="300"/>
    <line x1="600" y1="180" x2="600" y2="300"/>

    <line x1="100" y1="300" x2="100" y2="420"/>
    <line x1="280" y1="300" x2="280" y2="420"/>
    <line x1="520" y1="300" x2="520" y2="420"/>
    <line x1="700" y1="300" x2="700" y2="420"/>

    <line x1="220" y1="420" x2="220" y2="550"/>
    <line x1="420" y1="420" x2="420" y2="550"/>
    <line x1="620" y1="420" x2="620" y2="550"/>
  </g>

  <g fill="#1a252f" stroke="#2ecc71" stroke-width="2">
    <path d="M 0,32 A 18,18 0 0,1 0,68 Z"/>
    <path d="M 0,162 A 18,18 0 0,1 0,198 Z"/>
    <path d="M 0,282 A 18,18 0 0,1 0,318 Z"/>
    <path d="M 0,402 A 18,18 0 0,1 0,438 Z"/>
    <path d="M 0,532 A 18,18 0 0,1 0,568 Z"/>

    <path d="M 800,32 A 18,18 0 0,0 800,68 Z"/>
    <path d="M 800,162 A 18,18 0 0,0 800,198 Z"/>
    <path d="M 800,282 A 18,18 0 0,0 800,298 Z"/>
    <path d="M 800,402 A 18,18 0 0,0 800,438 Z"/>
    <path d="M 800,532 A 18,18 0 0,0 800,568 Z"/>
  </g>

  <g fill="#2ecc71">
    <path d="M 14,50 L 5,44 L 5,56 Z"/>
    <path d="M 14,180 L 5,174 L 5,186 Z"/>
    <path d="M 14,300 L 5,294 L 5,306 Z"/>
    <path d="M 14,420 L 5,414 L 5,426 Z"/>
    <path d="M 14,550 L 5,544 L 5,556 Z"/>

    <path d="M 786,50 L 795,44 L 795,56 Z"/>
    <path d="M 786,180 L 795,174 L 795,186 Z"/>
    <path d="M 786,300 L 795,294 L 795,306 Z"/>
    <path d="M 786,420 L 795,414 L 795,426 Z"/>
    <path d="M 786,550 L 795,544 L 795,556 Z"/>
  </g>

  <g stroke="#5d6d7e" stroke-width="2" filter="url(#block-shadow)">
    <rect x="20" y="10" width="80" height="25" rx="5" fill="#2e7d32" stroke="#1b5e20"/>
    <rect x="140" y="10" width="140" height="25" rx="5" fill="#2e7d32" stroke="#1b5e20"/>
    <rect x="320" y="10" width="160" height="25" rx="5" fill="#2e7d32" stroke="#1b5e20"/>
    <rect x="520" y="10" width="140" height="25" rx="5" fill="#2e7d32" stroke="#1b5e20"/>
    <rect x="690" y="10" width="90" height="25" rx="5" fill="#2e7d32" stroke="#1b5e20"/>

    <rect x="20" y="70" width="80" height="90" rx="6" fill="#34495e"/>
    <rect x="140" y="70" width="140" height="90" rx="6" fill="#34495e"/>
    <rect x="320" y="70" width="160" height="90" rx="6" fill="#34495e"/>
    <rect x="520" y="70" width="140" height="90" rx="6" fill="url(#grassGrad)" stroke="#1b5e20"/>
    <rect x="690" y="70" width="90" height="90" rx="6" fill="#34495e"/>

    <rect x="20" y="200" width="160" height="80" rx="6" fill="#34495e"/>
    <rect x="220" y="200" width="140" height="80" rx="6" fill="#34495e"/>
    <rect x="400" y="200" width="180" height="80" rx="8" fill="url(#grassGrad)" stroke="#1b5e20"/>
    <rect x="620" y="200" width="160" height="80" rx="6" fill="#34495e"/>

    <rect x="20" y="320" width="60" height="80" rx="6" fill="url(#grassGrad)" stroke="#1b5e20"/>
    <rect x="120" y="320" width="140" height="80" rx="6" fill="#34495e"/>
    <rect x="300" y="320" width="200" height="80" rx="8" fill="url(#grassGrad)" stroke="#1b5e20"/>
    <rect x="540" y="320" width="140" height="80" rx="6" fill="#34495e"/>
    <rect x="720" y="320" width="60" height="80" rx="6" fill="#34495e"/>

    <rect x="20" y="440" width="180" height="90" rx="6" fill="#34495e"/>
    <rect x="640" y="440" width="140" height="90" rx="6" fill="url(#grassGrad)" stroke="#1b5e20"/>
    <rect x="240" y="440" width="160" height="90" rx="6" fill="#34495e"/>
    <rect x="440" y="440" width="160" height="90" rx="6" fill="#34495e"/>

    <rect x="20" y="565" width="180" height="25" rx="5" fill="#2e7d32" stroke="#1b5e20"/>
    <rect x="240" y="565" width="160" height="25" rx="5" fill="#2e7d32" stroke="#1b5e20"/>
    <rect x="440" y="565" width="160" height="25" rx="5" fill="#2e7d32" stroke="#1b5e20"/>
    <rect x="640" y="565" width="140" height="25" rx="5" fill="#2e7d32" stroke="#1b5e20"/>
  </g>

  <g id="solar-tower">
    <rect x="155" y="80" width="110" height="70" rx="4" fill="#eceff1" stroke="#cfd8dc" stroke-width="2"/>
    <rect x="165" y="90" width="40" height="22" rx="2" fill="url(#solarGrad)"/>
    <rect x="215" y="90" width="40" height="22" rx="2" fill="url(#solarGrad)"/>
    <rect x="165" y="118" width="40" height="22" rx="2" fill="url(#solarGrad)"/>
    <rect x="215" y="118" width="40" height="22" rx="2" fill="url(#solarGrad)"/>
    <rect x="150" y="76" width="120" height="6" rx="2" fill="#66bb6a"/>
    <circle cx="210" cy="80" r="7" fill="#81c784"/>
  </g>

  <g id="research-center">
    <rect x="335" y="80" width="130" height="70" rx="5" fill="#78909c"/>
    <rect x="345" y="88" width="110" height="30" rx="3" fill="#80deea" stroke="#00838f" stroke-width="1.5"/>
    <rect x="345" y="124" width="50" height="20" rx="2" fill="url(#solarGrad)"/>
    <rect x="405" y="124" width="50" height="20" rx="2" fill="url(#solarGrad)"/>
    <circle cx="400" cy="80" r="10" fill="#4caf50"/>
  </g>

  <g id="water-management-tower">
    <rect x="35" y="210" width="130" height="60" rx="4" fill="#0097a7"/>
    <circle cx="70" cy="240" r="18" fill="#0288d1" stroke="#e0f7fa" stroke-width="2"/>
    <circle cx="70" cy="240" r="8" fill="#e0f7fa"/>
    <rect x="105" y="220" width="45" height="40" rx="2" fill="url(#solarGrad)"/>
  </g>

  <g id="eco-tech-hub">
    <rect x="635" y="210" width="130" height="60" rx="6" fill="#546e7a"/>
    <rect x="645" y="218" width="110" height="20" rx="2" fill="#80e27e"/>
    <rect x="645" y="244" width="32" height="20" rx="2" fill="url(#solarGrad)"/>
    <rect x="684" y="244" width="32" height="20" rx="2" fill="url(#solarGrad)"/>
    <rect x="723" y="244" width="32" height="20" rx="2" fill="url(#solarGrad)"/>
  </g>

  <g id="recycling-center">
    <rect x="450" y="450" width="140" height="70" rx="6" fill="#4db6ac"/>
    <rect x="490" y="510" width="60" height="10" fill="#263238"/>
    <line x1="490" y1="513" x2="550" y2="513" stroke="#546e7a" stroke-width="1"/>
    <line x1="490" y1="516" x2="550" y2="516" stroke="#546e7a" stroke-width="1"/>
    <rect x="465" y="462" width="30" height="40" rx="2" fill="#e0f7fa" stroke="#004d40" stroke-width="1.5"/>
    <rect x="545" y="462" width="30" height="40" rx="2" fill="#e0f7fa" stroke="#004d40" stroke-width="1.5"/>
    <circle cx="510" cy="482" r="5" fill="#ffffff"/>
    <line x1="510" y1="482" x2="510" y2="465" stroke="#ffffff" stroke-width="2"/>
    <line x1="510" y1="482" x2="525" y2="490" stroke="#ffffff" stroke-width="2"/>
    <line x1="510" y1="482" x2="495" y2="490" stroke="#ffffff" stroke-width="2"/>
  </g>

  <g id="vertical-forest">
    <rect x="700" y="80" width="70" height="70" rx="6" fill="url(#ecoWood)"/>
    <rect x="695" y="75" width="80" height="8" rx="3" fill="#2e7d32"/>
    <rect x="695" y="147" width="80" height="8" rx="3" fill="#2e7d32"/>
    <circle cx="715" cy="115" r="16" fill="#388e3c"/>
    <circle cx="755" cy="115" r="14" fill="#4caf50"/>
    <circle cx="735" cy="100" r="12" fill="#1b5e20"/>
    <circle cx="735" cy="130" r="12" fill="#81c784"/>
  </g>

  <g id="eco-houses">
    <rect x="130" y="330" width="55" height="60" rx="3" fill="#fff9c4"/>
    <rect x="135" y="335" width="45" height="25" fill="url(#solarGrad)"/>
    <rect x="148" y="375" width="20" height="15" fill="#5d4037"/>
    <rect x="195" y="330" width="55" height="60" rx="3" fill="#fff9c4"/>
    <rect x="200" y="335" width="45" height="25" fill="url(#solarGrad)"/>
    <circle cx="242" cy="378" r="7" fill="#0288d1"/>
  </g>

  <g id="eco-houses-2">
    <rect x="555" y="330" width="50" height="60" rx="3" fill="#fff9c4"/>
    <rect x="560" y="335" width="40" height="22" fill="url(#solarGrad)"/>
    <rect x="615" y="330" width="50" height="60" rx="3" fill="#fff9c4"/>
    <rect x="620" y="335" width="40" height="22" fill="url(#solarGrad)"/>
  </g>

  <g id="integrated-small-building" filter="url(#heavyShadow)">
    <rect x="250" y="450" width="140" height="70" rx="4" fill="url(#mainFacade)" stroke="#475569" stroke-width="2"/>
    <g fill="#334155" stroke="#1e293b" stroke-width="1">
      <rect x="260" y="450" width="10" height="70"/>
      <rect x="295" y="450" width="10" height="70"/>
      <rect x="335" y="450" width="10" height="70"/>
      <rect x="370" y="450" width="10" height="70"/>
    </g>
    <rect x="272" y="460" width="20" height="50" fill="#fef08a" opacity="0.25" filter="url(#glow)"/>
    <rect x="307" y="460" width="25" height="50" fill="#fef08a" opacity="0.35" filter="url(#glow)"/>
    <rect x="347" y="460" width="20" height="50" fill="#fef08a" opacity="0.25" filter="url(#glow)"/>
    <rect x="310" y="480" width="20" height="30" fill="none" stroke="#38bdf8" stroke-width="1.5"/>
    <line x1="320" y1="480" x2="320" y2="510" stroke="#38bdf8" stroke-width="1.5"/>
    <rect x="280" y="455" width="80" height="60" fill="url(#glassCurtain)"/>
    <g stroke="#0284c7" stroke-width="0.8" opacity="0.5">
      <line x1="280" y1="475" x2="360" y2="475"/>
      <line x1="280" y1="495" x2="360" y2="495"/>
      <line x1="306" y1="455" x2="306" y2="515"/>
      <line x1="333" y1="455" x2="333" y2="515"/>
    </g>
    <g fill="#e0f2fe" opacity="0.7">
      <rect x="262" y="465" width="12" height="15" rx="1"/>
      <rect x="262" y="488" width="12" height="15" rx="1"/>
      <rect x="366" y="465" width="12" height="15" rx="1"/>
      <rect x="366" y="488" width="12" height="15" rx="1"/>
    </g>
    <rect x="255" y="480" width="130" height="5" rx="2" fill="url(#woodTerrace)"/>
    <circle cx="260" cy="476" r="5" fill="url(#leafGrad1)"/>
    <circle cx="380" cy="476" r="5" fill="url(#leafGrad1)"/>
    <rect x="260" y="460" width="120" height="2" fill="url(#goldBeam)" filter="url(#glow)"/>
    <rect x="270" y="445" width="100" height="10" fill="url(#mainFacade)" stroke="#475569" stroke-width="1.5"/>
    <circle cx="285" cy="442" r="7" fill="url(#leafGrad1)"/>
    <circle cx="298" cy="439" r="8" fill="url(#leafGrad1)"/>
    <circle cx="342" cy="439" r="8" fill="url(#leafGrad1)"/>
    <circle cx="355" cy="442" r="7" fill="url(#leafGrad1)"/>
    <g fill="#94a3b8" stroke="#f8fafc" stroke-width="1">
      <rect x="319" y="426" width="3" height="18"/>
      <circle cx="320" cy="426" r="2" fill="#ffffff"/>
      <path d="M 320,426 L 320,418 M 320,426 L 327,429 M 320,426 L 313,429"/>
    </g>
    <line x1="320" y1="418" x2="320" y2="406" stroke="#cbd5e1" stroke-width="1.5"/>
    <circle cx="320" cy="406" r="2" fill="#ef4444" filter="url(#glow)"/>
    <path d="M 243,525 L 243,500 M 238,500 L 248,500" stroke="#94a3b8" stroke-width="1.5"/>
    <circle cx="243" cy="497" r="3" fill="#38bdf8" filter="url(#glow)"/>
    <path d="M 397,525 L 397,500 M 392,500 L 402,500" stroke="#94a3b8" stroke-width="1.5"/>
    <circle cx="397" cy="497" r="3" fill="#38bdf8" filter="url(#glow)"/>
  </g>

  <g id="newly-added-buildings">
    <rect x="25" y="75" width="70" height="80" rx="4" fill="#455a64" stroke="#263238" stroke-width="1.5"/>
    <rect x="30" y="80" width="60" height="30" rx="2" fill="url(#glassCurtain)"/>
    <rect x="30" y="115" width="28" height="35" rx="1" fill="url(#solarGrad)"/>
    <rect x="62" y="115" width="28" height="35" rx="1" fill="url(#solarGrad)"/>
    <circle cx="60" cy="73" r="5" fill="url(#leafGrad1)"/>

    <rect x="225" y="205" width="130" height="70" rx="4" fill="#37474f" stroke="#263238" stroke-width="1.5"/>
    <rect x="235" y="212" width="110" height="25" fill="url(#glassCurtain)"/>
    <rect x="235" y="242" width="50" height="25" fill="url(#solarGrad)"/>
    <rect x="295" y="242" width="50" height="25" fill="url(#solarGrad)"/>

    <rect x="725" y="325" width="50" height="70" rx="4" fill="#455a64" stroke="#263238" stroke-width="1.5"/>
    <rect x="730" y="330" width="40" height="25" fill="url(#solarGrad)"/>
    <rect x="730" y="360" width="40" height="30" fill="url(#glassCurtain)"/>
    <circle cx="750" cy="322" r="4" fill="url(#leafGrad1)"/>

    <rect x="25" y="445" width="170" height="80" rx="4" fill="#37474f" stroke="#263238" stroke-width="1.5"/>
    <rect x="35" y="452" width="70" height="65" rx="2" fill="url(#glassCurtain)"/>
    <rect x="110" y="452" width="75" height="30" rx="2" fill="url(#solarGrad)"/>
    <rect x="110" y="487" width="75" height="30" rx="2" fill="url(#solarGrad)"/>
    <circle cx="147" cy="442" r="6" fill="url(#leafGrad2)"/>
  </g>

  <g id="main-school-campus">
    <rect x="530" y="80" width="25" height="70" rx="3" fill="#eceff1" stroke="#b0bec5" stroke-width="1"/>
    <rect x="532" y="82" width="21" height="66" fill="url(#solarGrad)" rx="1"/>
    <rect x="625" y="80" width="25" height="70" rx="3" fill="#eceff1" stroke="#b0bec5" stroke-width="1"/>
    <rect x="627" y="82" width="21" height="66" fill="url(#solarGrad)" rx="1"/>
    <rect x="555" y="80" width="70" height="25" fill="#eceff1" stroke="#b0bec5" stroke-width="1"/>
    <rect x="557" y="82" width="66" height="21" fill="url(#solarGrad)" rx="1"/>
    <circle cx="590" cy="92" r="7" fill="#81c784" stroke="#2e7d32" stroke-width="1"/>
    <rect x="560" y="112" width="60" height="38" rx="2" fill="#e57373" stroke="#ffffff" stroke-width="1"/>
    <line x1="590" y1="112" x2="590" y2="150" stroke="#ffffff" stroke-width="1"/>
    <rect x="530" y="138" width="25" height="12" rx="1" fill="#5d4037"/>
    <circle cx="535" cy="144" r="2" fill="#81c784"/>
    <circle cx="542" cy="144" r="2" fill="#81c784"/>
    <circle cx="550" cy="144" r="2" fill="#81c784"/>
  </g>

  <g id="secondary-school-campus">
    <rect x="25" y="328" width="50" height="22" rx="2" fill="#eceff1" stroke="#b0bec5" stroke-width="1"/>
    <rect x="27" y="330" width="46" height="18" fill="url(#solarGrad)" rx="1"/>
    <rect x="28" y="355" width="44" height="36" rx="2" fill="#e57373" stroke="#ffffff" stroke-width="0.8"/>
    <circle cx="50" cy="373" r="6" fill="none" stroke="#ffffff" stroke-width="0.8"/>
  </g>

  <g id="science-education-center">
    <rect x="650" y="450" width="120" height="30" rx="3" fill="#eceff1" stroke="#b0bec5" stroke-width="1"/>
    <rect x="653" y="453" width="114" height="24" fill="url(#solarGrad)" rx="1"/>
    <circle cx="680" cy="500" r="16" fill="#80deea" stroke="#00838f" stroke-width="1.5"/>
    <circle cx="680" cy="500" r="6" fill="#81c784"/>
    <rect x="715" y="488" width="50" height="25" rx="2" fill="#e0f7fa" stroke="#4db6ac" stroke-width="1.5"/>
    <line x1="715" y1="500" x2="765" y2="500" stroke="#4db6ac" stroke-width="1"/>
    <line x1="740" y1="488" x2="740" y2="513" stroke="#4db6ac" stroke-width="1"/>
  </g>

  <g id="central-lake-park-integrated">
    <path d="M 400,240 Q 490,230 580,240 M 490,200 Q 495,240 490,280" stroke="#d7ccc8" stroke-width="8" fill="none" stroke-linecap="round"/>
    <ellipse cx="445" cy="235" rx="28" ry="20" fill="url(#lakeGrad)" stroke="#e0f7fa" stroke-width="1.5"/>
    <rect x="445" y="248" width="8" height="12" fill="#5d4037" rx="1"/>
    <rect x="510" y="222" width="4" height="12" rx="1" fill="#3e2723"/>
    <rect x="525" y="250" width="12" height="4" rx="1" fill="#3e2723"/>
  </g>

  <g id="sports-kids-park-integrated">
    <rect x="315" y="335" width="65" height="50" rx="3" fill="#e57373" stroke="#ffffff" stroke-width="1"/>
    <line x1="347" y1="335" x2="347" y2="385" stroke="#ffffff" stroke-width="1"/>
    <circle cx="347" cy="360" r="10" fill="none" stroke="#ffffff" stroke-width="1"/>
    <circle cx="410" cy="355" r="22" fill="#ba68c8" stroke="#ffffff" stroke-width="1"/>
    <rect x="398" y="348" width="24" height="3" fill="#4a148c" rx="1"/>
    <circle cx="403" cy="358" r="3" fill="#ffd54f"/>
    <circle cx="417" cy="358" r="3" fill="#ffd54f"/>
    <rect x="445" y="335" width="40" height="30" rx="3" fill="#78909c"/>
    <rect x="450" y="340" width="14" height="20" rx="1" fill="#29b6f6"/>
    <circle cx="474" cy="345" r="3" fill="#4caf50"/>
    <circle cx="474" cy="355" r="3" fill="#2196f3"/>
  </g>

  <g id="city-trees">
    <circle cx="525" cy="115" r="7" fill="url(#leafGrad1)"/>
    <circle cx="652" cy="115" r="7" fill="url(#leafGrad2)"/>
    <circle cx="650" cy="510" r="10" fill="url(#leafGrad1)"/>
    <circle cx="710" cy="520" r="9" fill="url(#leafGrad2)"/>
    <circle cx="425" cy="215" r="10" fill="#1b5e20"/>
    <circle cx="425" cy="215" r="8" fill="url(#leafGrad1)"/>
    <circle cx="535" cy="225" r="12" fill="url(#leafGrad2)"/>
    <circle cx="550" cy="255" r="14" fill="url(#leafGrad1)"/>
    <polygon points="500,212 490,228 510,228" fill="#1b5e20"/>
    <polygon points="500,215 493,225 507,225" fill="#81c784"/>
    <circle cx="445" cy="372" r="12" fill="url(#leafGrad1)"/>
    <circle cx="475" cy="372" r="10" fill="url(#leafGrad2)"/>

    <g id="north-border-trees">
      <circle cx="35" cy="22" r="9" fill="url(#leafGrad1)"/>
      <circle cx="60" cy="22" r="8" fill="url(#leafGrad2)"/>
      <circle cx="85" cy="22" r="9" fill="url(#leafGrad1)"/>
      <circle cx="160" cy="22" r="9" fill="url(#leafGrad1)"/>
      <circle cx="190" cy="22" r="10" fill="url(#leafGrad2)"/>
      <circle cx="220" cy="22" r="8" fill="url(#leafGrad1)"/>
      <circle cx="250" cy="22" r="9" fill="url(#leafGrad2)"/>
      <circle cx="340" cy="22" r="10" fill="url(#leafGrad1)"/>
      <circle cx="370" cy="22" r="8" fill="url(#leafGrad2)"/>
      <circle cx="400" cy="22" r="10" fill="url(#leafGrad1)"/>
      <circle cx="430" cy="22" r="9" fill="url(#leafGrad2)"/>
      <circle cx="460" cy="22" r="8" fill="url(#leafGrad1)"/>
      <circle cx="540" cy="22" r="9" fill="url(#leafGrad2)"/>
      <circle cx="570" cy="22" r="10" fill="url(#leafGrad1)"/>
      <circle cx="600" cy="22" r="8" fill="url(#leafGrad2)"/>
      <circle cx="630" cy="22" r="9" fill="url(#leafGrad1)"/>
      <circle cx="710" cy="22" r="9" fill="url(#leafGrad1)"/>
      <circle cx="735" cy="22" r="8" fill="url(#leafGrad2)"/>
      <circle cx="760" cy="22" r="9" fill="url(#leafGrad1)"/>
    </g>

    <g id="south-border-trees">
      <circle cx="40" cy="577" r="9" fill="url(#leafGrad1)"/>
      <circle cx="70" cy="577" r="10" fill="url(#leafGrad2)"/>
      <circle cx="100" cy="577" r="8" fill="url(#leafGrad1)"/>
      <circle cx="130" cy="577" r="9" fill="url(#leafGrad2)"/>
      <circle cx="160" cy="577" r="10" fill="url(#leafGrad1)"/>
      <circle cx="260" cy="577" r="9" fill="url(#leafGrad2)"/>
      <circle cx="290" cy="577" r="8" fill="url(#leafGrad1)"/>
      <circle cx="320" cy="577" r="10" fill="url(#leafGrad2)"/>
      <circle cx="350" cy="577" r="9" fill="url(#leafGrad1)"/>
      <circle cx="460" cy="577" r="10" fill="url(#leafGrad1)"/>
      <circle cx="490" cy="577" r="8" fill="url(#leafGrad2)"/>
      <circle cx="520" cy="577" r="9" fill="url(#leafGrad1)"/>
      <circle cx="550" cy="577" r="10" fill="url(#leafGrad2)"/>
      <circle cx="660" cy="577" r="9" fill="url(#leafGrad1)"/>
      <circle cx="690" cy="577" r="10" fill="url(#leafGrad2)"/>
      <circle cx="720" cy="577" r="8" fill="url(#leafGrad1)"/>
      <circle cx="750" cy="577" r="9" fill="url(#leafGrad2)"/>
    </g>

    <circle cx="105" cy="350" r="12" fill="url(#leafGrad1)"/>
    <circle cx="105" cy="375" r="10" fill="url(#leafGrad2)"/>
    <path d="M 180,240 L 160,240 M 180,240 L 165,225 M 180,240 L 195,225 M 180,240 L 195,255 M 180,240 L 165,255 M 180,240 L 180,220" stroke="#4caf50" stroke-width="3" stroke-linecap="round"/>
    <circle cx="180" cy="240" r="3" fill="#3e2723"/>
    <circle cx="420" cy="475" r="14" fill="url(#leafGrad1)"/>
    <circle cx="610" cy="480" r="16" fill="url(#leafGrad1)"/>
    <circle cx="310" cy="350" r="9" fill="#2e7d32"/>
    <circle cx="310" cy="350" r="7" fill="#4caf50"/>
    <circle cx="510" cy="360" r="9" fill="#2e7d32"/>
    <circle cx="510" cy="360" r="7" fill="#4caf50"/>
    <circle cx="530" cy="115" r="11" fill="url(#leafGrad2)"/>
  </g>
`

export function SostenibleCityBackground() {
  return (
    <svg
      viewBox={`0 0 ${CITY_MAP_WIDTH} ${CITY_MAP_HEIGHT}`}
      width={CITY_MAP_WIDTH}
      height={CITY_MAP_HEIGHT}
      className="absolute inset-0 h-full w-full"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: CITY_MAP_SVG_MARKUP }}
    />
  )
}
