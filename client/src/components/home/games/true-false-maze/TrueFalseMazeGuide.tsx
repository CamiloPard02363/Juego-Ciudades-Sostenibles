import { useCallback, useEffect, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  BatteryFull,
  Check,
  ChevronLeft,
  ChevronRight,
  Footprints,
  LightbulbOff,
  Pause,
  Rocket,
  Shuffle,
  X,
  Zap,
} from 'lucide-react'
import { FitScale } from './FitScale'
import floorTile from './assets/spaceship/tiles/floor-plain.png'
import robotDown from './assets/spaceship/robot/robot-down-0.png'
import robotRight from './assets/spaceship/robot/robot-right-0.png'
import robotLeft from './assets/spaceship/robot/robot-left-0.png'
import jellyDown from './assets/spaceship/jellyfish/jelly-down-0.png'
import zoneTrue from './assets/spaceship/decor/zone-true.png'
import zoneFalse from './assets/spaceship/decor/zone-false.png'
import ventOpen from './assets/spaceship/decor/vent-open.png'
import './trueFalseMazeGuide.css'

/**
 * Guía previa al juego: un mini tutorial de 5 pasos con escenas animadas (los
 * mismos sprites del juego) que explica de qué trata, cómo se mueve el robot
 * con el teclado y qué hace cada elemento del mapa. No tiene scroll: cada
 * paso cabe en una pantalla, de escritorio o de celular. Se puede recorrer
 * con los botones o con las flechas ← → del teclado, y saltar en cualquier
 * momento.
 */

type TrueFalseMazeGuideProps = {
  /** Se llama al terminar (último paso) o al saltar la guía. */
  onClose: () => void
}

type Step = { id: string; title: string; art: ReactNode; body: ReactNode }

/** Variables CSS personalizadas (`--tfg-key`...) que React no tipa en `CSSProperties`. */
type VarStyle = CSSProperties & Record<`--${string}`, string>

// ==================== piezas de las escenas ====================

/** Recuadro de escena: se ajusta al espacio disponible conservando su proporción. */
function Scene({ aspect = 1.6, children }: { aspect?: number; children: ReactNode }) {
  return (
    <div className="flex h-full w-full items-center justify-center" style={{ containerType: 'size' }}>
      <div className="tfg-scene" style={{ width: `min(100cqw, ${aspect * 100}cqh)`, aspectRatio: String(aspect) }}>
        {children}
      </div>
    </div>
  )
}

function Floor() {
  return <div className="tfg-floor" style={{ backgroundImage: `url(${floorTile})` }} />
}

/** Elemento posicionado dentro de la escena (en %, para que la escena escale entera). */
function At({ children, style, className = '' }: { children?: ReactNode; style: CSSProperties; className?: string }) {
  return (
    <div className={`tfg-abs ${className}`} style={style}>
      {children}
    </div>
  )
}

function Sprite({ src, alt = '', style, className = '' }: { src: string; alt?: string; style?: CSSProperties; className?: string }) {
  return <img src={src} alt={alt} draggable={false} className={`tfg-sprite ${className}`} style={style} />
}

function Tag({ tone, children, style }: { tone: 'true' | 'false' | 'info'; children: ReactNode; style?: CSSProperties }) {
  const colors = {
    true: 'border-emerald-400/60 bg-emerald-950/85 text-emerald-200',
    false: 'border-rose-400/60 bg-rose-950/85 text-rose-200',
    info: 'border-cyan-300/50 bg-slate-900/85 text-cyan-100',
  }[tone]
  return (
    <span
      className={`tfg-abs inline-flex items-center justify-center whitespace-nowrap rounded-full border font-bold ${colors}`}
      style={{ fontSize: '3.1cqw', padding: '0.5cqw 2.2cqw', ...style }}
    >
      {children}
    </span>
  )
}

function KeyCap({ children, className = '', label }: { children: ReactNode; className?: string; label?: string }) {
  return (
    <span className={`tfg-key ${className}`} aria-label={label}>
      {children}
    </span>
  )
}

/** Las cuatro flechas del teclado en "T" invertida. `animated` enciende ← y → siguiendo la escena de movimiento. */
function ArrowKeys({ size, animated = false }: { size: string; animated?: boolean }) {
  const style: VarStyle = { '--tfg-key': size }
  return (
    <div className="tfg-key-cluster" style={style} role="img" aria-label="Flechas del teclado: arriba, izquierda, abajo y derecha">
      <span />
      <KeyCap>
        <ArrowUp className="h-[60%] w-[60%]" strokeWidth={3} />
      </KeyCap>
      <span />
      <KeyCap className={animated ? '[animation:tfg-key-left_12s_linear_infinite]' : ''}>
        <ArrowLeft className="h-[60%] w-[60%]" strokeWidth={3} />
      </KeyCap>
      <KeyCap>
        <ArrowDown className="h-[60%] w-[60%]" strokeWidth={3} />
      </KeyCap>
      <KeyCap className={animated ? '[animation:tfg-key-right_12s_linear_infinite]' : ''}>
        <ArrowRight className="h-[60%] w-[60%]" strokeWidth={3} />
      </KeyCap>
    </div>
  )
}

// ==================== escenas ====================

function SceneMission() {
  return (
    <Scene>
      <Floor />
      <At style={{ left: '3%', top: '13%', width: '31cqw' }}>
        <Sprite src={zoneFalse} alt="Sala FALSO" className="tfg-float" style={{ width: '100%', animationDelay: '-1.2s' }} />
      </At>
      <At style={{ right: '3%', top: '13%', width: '31cqw' }}>
        <Sprite src={zoneTrue} alt="Sala VERDADERO" className="tfg-float" style={{ width: '100%' }} />
      </At>
      <Tag tone="false" style={{ left: '8%', top: '50%' }}>
        ✕ FALSO
      </Tag>
      <Tag tone="true" style={{ right: '5%', top: '50%' }}>
        ✓ VERDADERO
      </Tag>
      <At style={{ left: '50%', top: '27%', width: '21cqw', transform: 'translateX(-50%)' }}>
        <Sprite src={robotDown} alt="El robot" className="tfg-float" style={{ width: '100%' }} />
      </At>
      <At style={{ right: '27%', top: '40%', width: '13cqw' }}>
        <Sprite src={jellyDown} alt="Una medusa galáctica" className="tfg-float" style={{ width: '100%', animationDelay: '-2s' }} />
      </At>
    </Scene>
  )
}

function SceneMove() {
  return (
    <Scene aspect={16 / 11}>
      <Floor />
      {/* Pregunta de ejemplo: cambia a la mitad del ciclo. */}
      <At
        className="overflow-hidden rounded-xl border border-violet-400/40 bg-slate-950/90"
        style={{ left: '4cqw', right: '4cqw', top: '1.5cqw', height: '13cqw' }}
      >
        <div className="flex h-full flex-col justify-center px-[3cqw]">
          <span className="font-bold uppercase text-cyan-300" style={{ fontSize: '2.4cqw', letterSpacing: '0.16em', lineHeight: '3cqw' }}>
            Pregunta
          </span>
          <span className="relative block" style={{ height: '5.6cqw' }}>
            <span className="absolute inset-0 whitespace-nowrap font-bold text-white [animation:tfg-q-first_12s_linear_infinite]" style={{ fontSize: '4cqw', lineHeight: '5.6cqw' }}>
              El Sol es una estrella.
            </span>
            <span className="absolute inset-0 whitespace-nowrap font-bold text-white opacity-0 [animation:tfg-q-second_12s_linear_infinite]" style={{ fontSize: '4cqw', lineHeight: '5.6cqw' }}>
              La Luna tiene luz propia.
            </span>
          </span>
        </div>
      </At>

      <Tag tone="false" style={{ left: '8cqw', top: '16.5cqw' }}>
        ✕ FALSO
      </Tag>
      <Tag tone="true" style={{ right: '5.5cqw', top: '16.5cqw' }}>
        ✓ VERDADERO
      </Tag>
      <At style={{ left: '3cqw', top: '21.5cqw', width: '25cqw' }}>
        <Sprite src={zoneFalse} alt="Sala FALSO" className="[animation:tfg-zone-left-hit_12s_linear_infinite]" style={{ width: '100%' }} />
      </At>
      <At style={{ right: '3cqw', top: '21.5cqw', width: '25cqw' }}>
        <Sprite src={zoneTrue} alt="Sala VERDADERO" className="[animation:tfg-zone-right-hit_12s_linear_infinite]" style={{ width: '100%' }} />
      </At>
      <Tag tone="info" style={{ left: '3cqw', top: '51cqw', opacity: 0, animation: 'tfg-pop-left 12s linear infinite' }}>
        ¡Correcto! +500
      </Tag>
      <Tag tone="info" style={{ right: '3cqw', top: '51cqw', opacity: 0, animation: 'tfg-pop-right 12s linear infinite' }}>
        ¡Correcto! +500
      </Tag>

      {/* El robot camina a un lado y a otro; cambia de cara según su dirección. */}
      <At style={{ left: '43cqw', top: '28.5cqw', width: '14cqw' }}>
        <div className="relative [animation:tfg-demo-walk_12s_ease-in-out_infinite]">
          <Sprite src={robotDown} alt="El robot" className="[animation:tfg-face-down_12s_linear_infinite]" style={{ width: '100%' }} />
          <Sprite
            src={robotRight}
            className="absolute inset-0 opacity-0 [animation:tfg-face-right_12s_linear_infinite]"
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          />
          <Sprite
            src={robotLeft}
            className="absolute inset-0 opacity-0 [animation:tfg-face-left_12s_linear_infinite]"
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          />
        </div>
      </At>

      <At style={{ left: '50%', top: '57cqw', transform: 'translateX(-50%)' }}>
        <ArrowKeys size="5.3cqw" animated />
      </At>
    </Scene>
  )
}

function SceneJelly() {
  return (
    <Scene>
      <Floor />
      <At className="flex items-center gap-[1.2cqw]" style={{ left: '50%', top: '4%', transform: 'translateX(-50%)' }}>
        {[0, 1, 2].map((index) => (
          <BatteryFull
            key={index}
            strokeWidth={2.2}
            style={{
              width: '9cqw',
              height: '9cqw',
              color: '#6ee7b7',
              animation: index === 2 ? 'tfg-battery-lose 6s linear infinite' : undefined,
            }}
          />
        ))}
      </At>

      <At style={{ left: '12%', top: '22%', width: '20cqw' }}>
        <Sprite src={robotRight} alt="El robot" className="[animation:tfg-hurt_6s_linear_infinite]" style={{ width: '100%' }} />
      </At>

      <At style={{ left: '55%', top: '17%', width: '30cqw', height: '40cqw' }}>
        <div
          className="tfg-abs rounded-full border-[0.7cqw] border-rose-400/70 [animation:tfg-danger-ring_1.8s_ease-in-out_infinite]"
          style={{ left: '-4%', top: '4%', width: '108%', height: '88%' }}
        />
        <div className="relative [animation:tfg-chase_6s_ease-in-out_infinite]">
          <Sprite src={jellyDown} alt="Una medusa galáctica" className="tfg-float" style={{ width: '100%' }} />
        </div>
      </At>

      <Tag tone="false" style={{ left: '50%', top: '60%', transform: 'translateX(-50%)', opacity: 0, animation: 'tfg-warn 6s linear infinite' }}>
        ¡−1 batería!
      </Tag>
    </Scene>
  )
}

/** Medusa en tres tamaños y su versión aturdida (azul), que reemplaza a la normal cuando pasa el pulso. */
function StunnableJelly({ left, top, width, delay }: { left: string; top: string; width: string; delay: string }) {
  return (
    <At style={{ left, top, width }}>
      <div className="tfg-float relative" style={{ animationDelay: delay }}>
        <Sprite src={jellyDown} alt="" className="[animation:tfg-jelly-normal_5s_linear_infinite]" style={{ width: '100%' }} />
        <Sprite
          src={jellyDown}
          className="absolute inset-0 opacity-0 [animation:tfg-jelly-stunned_5s_linear_infinite]"
          style={{ width: '100%', filter: 'hue-rotate(-75deg) saturate(0.55) brightness(1.4)' }}
        />
      </div>
    </At>
  )
}

function SceneCore() {
  return (
    <Scene>
      <Floor />
      {[0, 0.8, 1.6].map((delay) => (
        <div
          key={delay}
          className="tfg-abs rounded-full border-[0.6cqw] border-cyan-300"
          style={{
            left: '50%',
            top: '52%',
            width: '110cqw',
            height: '110cqw',
            opacity: 0,
            animation: `tfg-core-ring 2.5s ease-out ${delay}s infinite`,
          }}
        />
      ))}
      <At
        className="rounded-full [animation:tfg-pulse-glow_1.6s_ease-in-out_infinite]"
        style={{
          left: '50%',
          top: '52%',
          width: '22cqw',
          height: '22cqw',
          transform: 'translate(-50%, -50%)',
          background: 'radial-gradient(circle, #ecfeff 0 12%, #22d3ee 28%, rgba(6,182,212,0.35) 55%, transparent 72%)',
        }}
      />
      <At
        className="[animation:tfg-stars-spin_6s_linear_infinite]"
        style={{ left: '50%', top: '52%', width: '15cqw', height: '15cqw', margin: '-7.5cqw 0 0 -7.5cqw' }}
      >
        <div className="h-full w-full rounded-full border-[0.45cqw] border-cyan-100/80" style={{ transform: 'scaleY(0.4)' }} />
      </At>
      <At style={{ left: '50%', top: '36%', transform: 'translateX(-50%)' }}>
        <Zap style={{ width: '5cqw', height: '5cqw', color: '#ecfeff' }} strokeWidth={2.4} />
      </At>

      <StunnableJelly left="8%" top="12%" width="16cqw" delay="-0.4s" />
      <StunnableJelly left="76%" top="10%" width="16cqw" delay="-1.6s" />
      <StunnableJelly left="12%" top="46%" width="15cqw" delay="-2.4s" />

      <At style={{ left: '66%', top: '40%', width: '15cqw' }}>
        <Sprite src={robotLeft} alt="El robot" className="tfg-float" style={{ width: '100%' }} />
      </At>
      <Tag tone="info" style={{ left: '8%', top: '8%', opacity: 0, animation: 'tfg-score-rise 5s linear infinite' }}>
        +200
      </Tag>
    </Scene>
  )
}

function SceneCard({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="tfg-abs overflow-hidden rounded-[2.4cqw] border border-white/20 bg-slate-900/75" style={{ top: '7%', width: '29cqw', height: '86%' }}>
      {children}
      <span
        className="absolute inset-x-0 bottom-0 bg-slate-950/90 text-center font-bold uppercase text-cyan-200"
        style={{ fontSize: '2.6cqw', letterSpacing: '0.1em', padding: '1.4cqw 0' }}
      >
        {label}
      </span>
    </div>
  )
}

function SceneExtras() {
  const swap: VarStyle = { '--tfg-swap': '13.5cqw' }
  return (
    <Scene>
      <Floor />
      {/* Rejillas: el robot entra por una y sale por la otra. */}
      <div className="tfg-abs" style={{ left: '2%', top: 0, width: '29cqw', height: '100%' }}>
        <SceneCard label="Rejillas">
          <At style={{ left: '6%', top: '15cqw', width: '15cqw' }}>
            <Sprite src={ventOpen} alt="Rejilla de entrada" style={{ width: '100%' }} />
          </At>
          <At style={{ left: '40%', top: '31cqw', width: '15cqw' }}>
            <Sprite src={ventOpen} alt="Rejilla de salida" style={{ width: '100%' }} />
          </At>
          <At style={{ left: '12%', top: '4cqw', width: '8.5cqw', animation: 'tfg-vent-out 5s ease-in infinite' }}>
            <Sprite src={robotDown} alt="" style={{ width: '100%' }} />
          </At>
          <At style={{ left: '46%', top: '20cqw', width: '8.5cqw', opacity: 0, animation: 'tfg-vent-in 5s ease-out infinite' }}>
            <Sprite src={robotDown} alt="" style={{ width: '100%' }} />
          </At>
        </SceneCard>
      </div>

      {/* Salas que cambian de lugar. */}
      <div className="tfg-abs" style={{ left: '35.5%', top: 0, width: '29cqw', height: '100%' }}>
        <SceneCard label="Salas viajeras">
          <At style={{ left: '2%', top: '14cqw', width: '13.5cqw', ...swap, animation: 'tfg-swap-a 5s ease-in-out infinite' }}>
            <Sprite src={zoneTrue} alt="" style={{ width: '100%' }} />
          </At>
          <At style={{ left: '2%', top: '14cqw', width: '13.5cqw', marginLeft: '13.5cqw', ...swap, animation: 'tfg-swap-b 5s ease-in-out infinite' }}>
            <Sprite src={zoneFalse} alt="" style={{ width: '100%' }} />
          </At>
          <At style={{ left: '50%', top: '36cqw', transform: 'translateX(-50%)' }}>
            <Shuffle style={{ width: '8cqw', height: '8cqw', color: '#67e8f9' }} strokeWidth={2.4} />
          </At>
        </SceneCard>
      </div>

      {/* Sabotaje: se apagan las luces y solo se ve cerca del robot. */}
      <div className="tfg-abs" style={{ left: '69%', top: 0, width: '29cqw', height: '100%' }}>
        <SceneCard label="Sabotaje">
          <div className="tfg-floor" style={{ backgroundImage: `url(${floorTile})`, backgroundSize: '12cqw' }} />
          <At style={{ left: '50%', top: '17cqw', width: '12cqw', transform: 'translateX(-50%)' }}>
            <Sprite src={robotDown} alt="" className="tfg-float" style={{ width: '100%' }} />
          </At>
          <div
            className="tfg-abs"
            style={{
              left: '-40%',
              top: '-40%',
              width: '180%',
              height: '180%',
              background: 'radial-gradient(circle at 50% 50%, transparent 0 8%, rgba(2,4,12,0.97) 21%)',
              animation: 'tfg-spotlight 2.6s ease-in-out infinite',
            }}
          />
          <At style={{ left: '50%', top: '3cqw', transform: 'translateX(-50%)' }}>
            <LightbulbOff style={{ width: '7cqw', height: '7cqw', color: '#fbbf24' }} strokeWidth={2.2} />
          </At>
        </SceneCard>
      </div>
    </Scene>
  )
}

// ==================== texto de cada paso ====================

function Item({ icon, children, tone = 'cyan' }: { icon: ReactNode; children: ReactNode; tone?: 'cyan' | 'violet' | 'amber' | 'emerald' | 'rose' }) {
  const colors = {
    cyan: 'bg-cyan-400/15 text-cyan-300',
    violet: 'bg-violet-400/15 text-violet-300',
    amber: 'bg-amber-400/15 text-amber-300',
    emerald: 'bg-emerald-400/15 text-emerald-300',
    rose: 'bg-rose-400/15 text-rose-300',
  }[tone]
  return (
    <li className="flex items-start gap-2.5">
      <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${colors}`}>{icon}</span>
      <span className="min-w-0">{children}</span>
    </li>
  )
}

const strong = (color: string) => `font-bold ${color}`

const STEPS: Step[] = [
  {
    id: 'mision',
    title: 'Misión: ¡llega a la sala correcta!',
    art: <SceneMission />,
    body: (
      <>
        <p>
          Eres un robot en una nave espacial. En cada ronda aparece una afirmación: decide si es{' '}
          <b className={strong('text-emerald-300')}>verdadera</b> o <b className={strong('text-rose-300')}>falsa</b> y corre a la sala{' '}
          <b className={strong('text-emerald-300')}>VERDADERO</b> o <b className={strong('text-rose-300')}>FALSO</b>. ¡Y cuidado con las medusas galácticas!
        </p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-cyan-300/25 bg-cyan-400/[0.07] p-3">
          <ArrowKeys size="clamp(1.9rem, 5.2dvh, 2.7rem)" />
          <div className="min-w-0 flex-1 basis-[9rem]">
            <p className="font-bold text-white">Muévete con las flechas del teclado</p>
            <p className="text-slate-300">
              También sirven <b className="text-white">W A S D</b>. En el celular, desliza el dedo sobre la nave o usa la cruceta.
            </p>
          </div>
        </div>
        <p className="flex items-center gap-2">
          <span className="flex h-7 shrink-0 items-center gap-1 rounded-lg border border-cyan-300/50 bg-cyan-500/20 px-2 text-[0.8em] font-bold text-white">
            <Pause className="h-3.5 w-3.5" fill="currentColor" strokeWidth={1.5} /> Pausa
          </span>
          <span>
            ¿Necesitas un respiro? Toca <b className="text-white">Pausa</b>, arriba a la izquierda, o presiona <b className="text-white">Esc</b>.
          </span>
        </p>
      </>
    ),
  },
  {
    id: 'moverse',
    title: 'Lee, corre y responde',
    art: <SceneMove />,
    body: (
      <ul className="flex flex-col gap-2.5">
        <Item icon={<span className="text-[13px] font-bold">1</span>} tone="violet">
          <b className="text-white">Lee la afirmación</b> en el panel de arriba.
        </Item>
        <Item icon={<Footprints className="h-4 w-4" />} tone="cyan">
          <b className="text-white">Mueve al robot con las flechas.</b> Sigue caminando solo hasta que cambies de dirección.
        </Item>
        <Item icon={<Check className="h-4 w-4" strokeWidth={3} />} tone="emerald">
          <b className="text-white">Entra a la sala correcta.</b> Cuanto más rápido llegues, más puntos ganas.
        </Item>
        <li className="rounded-xl bg-white/[0.06] px-3 py-2 text-slate-300">
          Si te equivocas pierdes una batería, pero verás la explicación para aprender.
        </li>
      </ul>
    ),
  },
  {
    id: 'medusas',
    title: 'Esquiva a las medusas',
    art: <SceneJelly />,
    body: (
      <>
        <p>
          Las <b className="text-white">medusas galácticas</b> salen del reactor y te persiguen, cada una a su manera. No te quedes quieto.
        </p>
        <ul className="flex flex-col gap-2.5">
          <Item icon={<BatteryFull className="h-4 w-4" />} tone="rose">
            Si una te toca, <b className="text-white">pierdes una batería</b>. Responder mal también cuesta una.
          </Item>
          <Item icon={<X className="h-4 w-4" strokeWidth={3} />} tone="amber">
            Sin baterías, la misión termina. Al reaparecer tienes un instante de escudo.
          </Item>
        </ul>
      </>
    ),
  },
  {
    id: 'nucleos',
    title: 'Núcleos de energía',
    art: <SceneCore />,
    body: (
      <>
        <p>
          Los <b className="text-cyan-300">núcleos brillantes</b> de las esquinas lanzan un <b className="text-white">pulso EMP</b>: las medusas se aturden y se ponen azules unos segundos.
        </p>
        <ul className="flex flex-col gap-2.5">
          <Item icon={<Zap className="h-4 w-4" />} tone="cyan">
            ¡Atrápalas aturdidas para ganar <b className="text-white">+200, +400, +800…</b> puntos!
          </Item>
          <Item icon={<span className="text-[15px] font-bold leading-none">·</span>} tone="violet">
            Los puntitos de luz del camino suman 10 puntos cada uno.
          </Item>
        </ul>
      </>
    ),
  },
  {
    id: 'extras',
    title: 'Atajos y sorpresas',
    art: <SceneExtras />,
    body: (
      <ul className="flex flex-col gap-2.5">
        <Item icon={<Rocket className="h-4 w-4" />} tone="cyan">
          <b className="text-white">Rejillas:</b> entras por una y sales por su pareja, al otro lado de la nave. ¡Ideal para escapar!
        </Item>
        <Item icon={<Shuffle className="h-4 w-4" />} tone="violet">
          <b className="text-white">Salas viajeras:</b> VERDADERO y FALSO cambian de lugar en cada pregunta (y cada cierto tiempo). No memorices el mapa.
        </Item>
        <Item icon={<LightbulbOff className="h-4 w-4" />} tone="amber">
          <b className="text-white">Sabotaje:</b> a veces se apagan las luces y solo ves alrededor del robot.
        </Item>
      </ul>
    ),
  },
]

// ==================== guía ====================

export function TrueFalseMazeGuide({ onClose }: TrueFalseMazeGuideProps) {
  const [index, setIndex] = useState(0)
  const last = index === STEPS.length - 1
  const step = STEPS[index]

  const next = useCallback(() => {
    if (last) onClose()
    else setIndex((current) => current + 1)
  }, [last, onClose])
  const back = useCallback(() => setIndex((current) => Math.max(0, current - 1)), [])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      // Un botón con foco ya reacciona a Enter/Espacio por su cuenta.
      const onButton = event.target instanceof HTMLButtonElement
      if (event.key === 'ArrowRight') {
        event.preventDefault()
        next()
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault()
        back()
      } else if ((event.key === 'Enter' || event.key === ' ') && !onButton) {
        event.preventDefault()
        next()
      } else if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [next, back, onClose])

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center overflow-hidden bg-[#03040c]/90 p-2 text-slate-100 backdrop-blur-md sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-label="Guía del Laberinto Verdadero o Falso"
      data-game-guide="TRUE_FALSE_MAZE"
    >
      <div className="relative flex max-h-full min-h-0 w-full max-w-[1080px] flex-col overflow-hidden rounded-[28px] border border-white/15 bg-gradient-to-b from-slate-900/95 to-[#070a1a] shadow-[0_40px_120px_-30px_rgba(124,58,237,0.65)]" style={{ height: 'min(100%, 680px)' }}>
        <header className="flex shrink-0 items-center gap-3 px-4 pt-3 sm:px-6 sm:pt-4">
          <p className="min-w-0 flex-1 truncate text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-300/90">
            Guía rápida · Paso {index + 1} de {STEPS.length}
          </p>
          <button
            type="button"
            className="flex items-center gap-1 rounded-xl border border-white/12 bg-white/5 px-3 py-1.5 text-[12.5px] font-medium text-slate-200 transition-colors hover:bg-white/10"
            onClick={onClose}
          >
            Saltar guía <X className="h-3.5 w-3.5" />
          </button>
        </header>

        <div
          key={step.id}
          className="tfg-step-in grid min-h-0 flex-1 grid-rows-[minmax(0,38%)_minmax(0,1fr)] gap-3 px-4 py-3 sm:px-6 landscape:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] landscape:grid-rows-1 landscape:gap-6"
        >
          <div className="min-h-0 min-w-0">{step.art}</div>
          {/* El texto se ajusta solo al espacio: en pantallas chicas se reduce en vez de recortarse o hacer scroll. */}
          <FitScale
            className="h-full"
            fitKey={step.id}
            minScale={0.55}
            contentClassName="flex flex-col gap-3 text-[clamp(0.8rem,1.9dvh+0.25vw,1.02rem)] leading-snug text-slate-300"
          >
            <h2 className="font-heading text-[clamp(1.15rem,3.4dvh+0.6vw,1.9rem)] font-bold leading-tight tracking-tight text-white">{step.title}</h2>
            {step.body}
          </FitScale>
        </div>

        <footer className="flex shrink-0 items-center gap-2 border-t border-white/10 px-3 py-3 sm:gap-3 sm:px-6">
          <button
            type="button"
            disabled={index === 0}
            aria-label="Paso anterior"
            className="flex items-center gap-1 rounded-xl border border-white/12 px-2.5 py-2 text-[13px] font-semibold text-slate-200 transition-colors hover:bg-white/8 disabled:invisible sm:px-3.5"
            onClick={back}
          >
            <ChevronLeft className="h-4 w-4" /> <span className="max-sm:hidden">Atrás</span>
          </button>
          <div className="flex min-w-0 flex-1 items-center justify-center gap-1.5 sm:gap-2" role="tablist" aria-label="Pasos de la guía">
            {STEPS.map((item, i) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={`Paso ${i + 1}: ${item.title}`}
                className={`h-2.5 rounded-full transition-all ${i === index ? 'w-6 bg-cyan-300' : 'w-2.5 bg-white/25 hover:bg-white/45'}`}
                onClick={() => setIndex(i)}
              />
            ))}
          </div>
          <button
            type="button"
            autoFocus
            className="flex shrink-0 items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-500 px-4 py-2 text-[13.5px] font-bold text-white shadow-[0_10px_26px_-10px_rgba(34,211,238,0.8)] transition-transform hover:-translate-y-0.5 sm:px-5"
            onClick={next}
          >
            {last ? '¡A jugar!' : 'Siguiente'} {!last && <ChevronRight className="h-4 w-4" />}
          </button>
        </footer>
      </div>
    </div>
  )
}
