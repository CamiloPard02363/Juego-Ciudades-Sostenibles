import { Check, Moon, Sparkles, Sun } from 'lucide-react'
import { useTheme } from '../../hooks/useTheme'
import type { Theme } from '../../hooks/useTheme'
import previewLight from '../../assets/themes/preview-light.webp'
import previewDark from '../../assets/themes/preview-dark.webp'
import previewKids from '../../assets/themes/preview-kids.webp'

type ThemeOption = {
  value: Theme
  label: string
  description: string
  icon: typeof Sun
  /** Captura real de la página con este tema — si falta, se usa `preview` (Modo niños, que no es una captura sino un estilo). */
  previewImage?: string
  /**
   * Colores propios de ESTE tema (no del tema activo ahora mismo): la tarjeta
   * de "Claro" debe verse clara aunque estés en Oscuro, y viceversa, para que
   * la vista previa sea real.
   */
  preview: { bg: string; surface: string; accent: string; accent2: string; text: string }
}

const THEME_OPTIONS: ThemeOption[] = [
  {
    value: 'light',
    label: 'Claro',
    description: 'El tema por defecto: fondo claro, alto contraste, ideal para el día a día.',
    icon: Sun,
    previewImage: previewLight,
    preview: { bg: '#f2f0ec', surface: '#ffffff', accent: '#7c3aed', accent2: '#ff3d8a', text: '#14121c' },
  },
  {
    value: 'dark',
    label: 'Oscuro',
    description: 'Fondo oscuro que descansa la vista en ambientes con poca luz.',
    icon: Moon,
    previewImage: previewDark,
    preview: { bg: '#0b0b12', surface: '#16161f', accent: '#a685f5', accent2: '#ff6ba3', text: '#f1f0f8' },
  },
  {
    value: 'kids',
    label: 'Kids',
    description: 'Colores vivos, bordes redondeados y una mascota — el mismo look que ven los más pequeños, por si te gusta más.',
    icon: Sparkles,
    previewImage: previewKids,
    preview: { bg: '#fff8e7', surface: '#ffffff', accent: '#ff7a1a', accent2: '#06b6d4', text: '#3a2a6d' },
  },
]

/**
 * Sección de personalización de apariencia, dentro de `SettingsPanel`: cada
 * tema es un conjunto de variables CSS (ver index.css) que ya cubre toda la
 * app —no hay que tocar ningún otro componente para que un tema nuevo se
 * sienta "completo".
 *
 * "Kids" es un gusto más, elegible por cualquier cuenta: solo cambia colores
 * y decoraciones (ver `[data-theme='kids']` en index.css y `KidsMascot`), no
 * la interfaz simplificada que ven las cuentas de 9 años o menos — esa sigue
 * decidida solo por edad/rol (`isKidsMode`, ver useTheme.tsx) y no se elige
 * acá. Una cuenta infantil real siempre ve "Kids" sin importar lo que elija
 * aquí; para cualquier otra cuenta, elegirlo es puramente estético.
 */
export function ThemesSection() {
  const { theme, setTheme } = useTheme()

  return (
    <section className="flex flex-col gap-4">
      <p className="text-[13px] text-text">
        Elige cómo se ve toda la página. El cambio aplica de inmediato y se recuerda en este
        dispositivo.
      </p>

      {/* El panel de esta pantalla es más ancho que el resto (ver SettingsPanel), así que 3 columnas ya caben cómodas. */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {THEME_OPTIONS.map((option) => {
          const Icon = option.icon
          const active = theme === option.value
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setTheme(option.value)}
              aria-pressed={active}
              // Borde con degradado de los dos acentos de ESTE tema (mismo truco
              // que WelcomeCard: fondo recortado al padding + degradado al
              // borde) en vez del borde plano gris de antes — cada tarjeta luce
              // sus propios colores siempre, no solo cuando está activa.
              className="group flex flex-col overflow-hidden rounded-2xl border-[3px] border-transparent text-left transition-transform hover:-translate-y-0.5"
              style={{
                background: `linear-gradient(${option.preview.surface}, ${option.preview.surface}) padding-box, linear-gradient(120deg, ${option.preview.accent2}, ${option.preview.accent}) border-box`,
                boxShadow: active ? `0 12px 28px -12px ${option.preview.accent}` : undefined,
              }}
            >
              <div className="relative h-32" style={{ background: option.preview.bg }}>
                {option.previewImage ? (
                  <img
                    src={option.previewImage}
                    alt=""
                    className="h-full w-full object-cover object-left-top"
                    loading="lazy"
                    draggable={false}
                  />
                ) : (
                  <div className="relative flex h-full items-center justify-center">
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 opacity-70"
                      style={{
                        backgroundImage: `radial-gradient(circle at 15% 20%, ${option.preview.accent}33 0, transparent 45%), radial-gradient(circle at 85% 75%, ${option.preview.accent2}33 0, transparent 45%)`,
                      }}
                    />
                    <span
                      className="relative flex h-11 w-11 items-center justify-center rounded-xl text-white"
                      style={{
                        background: `linear-gradient(135deg, ${option.preview.accent}, ${option.preview.accent2})`,
                        boxShadow: `0 8px 20px -8px ${option.preview.accent}`,
                      }}
                    >
                      <Icon className="h-5 w-5" strokeWidth={2} />
                    </span>
                  </div>
                )}
                {active && (
                  <span
                    className="absolute top-3 right-3 flex h-7 w-7 items-center justify-center rounded-full text-white shadow-[0_4px_10px_-3px_rgba(0,0,0,0.4)]"
                    style={{ background: option.preview.accent }}
                    aria-hidden="true"
                  >
                    <Check className="h-4 w-4" strokeWidth={3} />
                  </span>
                )}
              </div>

              <div className="flex flex-1 flex-col gap-1.5 p-4" style={{ background: option.preview.surface }}>
                <p className="flex items-center gap-1.5 text-[14.5px] font-semibold" style={{ color: option.preview.text }}>
                  <Icon className="h-[15px] w-[15px] shrink-0" strokeWidth={2} style={{ color: option.preview.accent }} aria-hidden="true" />
                  {option.label}
                </p>
                <p className="text-[12.5px] leading-relaxed" style={{ color: option.preview.text, opacity: 0.75 }}>{option.description}</p>
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )
}
