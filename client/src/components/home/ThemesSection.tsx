import { Check, Moon, PartyPopper, Sun } from 'lucide-react'
import { useTheme } from '../../hooks/useTheme'
import type { Theme } from '../../hooks/useTheme'

type ThemeOption = {
  value: Theme
  label: string
  description: string
  icon: typeof Sun
  /** Colores de vista previa: fondo de la tarjeta y los dos acentos de ese tema. */
  preview: { bg: string; surface: string; accent: string; accent2: string; text: string }
}

const THEME_OPTIONS: ThemeOption[] = [
  {
    value: 'light',
    label: 'Claro',
    description: 'El tema por defecto: fondo claro, alto contraste, ideal para el día a día.',
    icon: Sun,
    preview: { bg: '#f2f0ec', surface: '#ffffff', accent: '#7c3aed', accent2: '#ff3d8a', text: '#14121c' },
  },
  {
    value: 'dark',
    label: 'Oscuro',
    description: 'Fondo oscuro que descansa la vista en ambientes con poca luz.',
    icon: Moon,
    preview: { bg: '#0b0b12', surface: '#16161f', accent: '#a685f5', accent2: '#ff6ba3', text: '#f1f0f8' },
  },
  {
    value: 'kids',
    label: 'Modo niños',
    description:
      'Colores vivos, tipografía redondeada y un fondo juguetón — pensado para lectores primerizos: acentos energéticos sobre un fondo cálido y suave, sin sobrecargar la vista.',
    icon: PartyPopper,
    preview: { bg: '#fff8e7', surface: '#ffffff', accent: '#ff7a1a', accent2: '#06b6d4', text: '#3a2a6d' },
  },
]

/**
 * Página de personalización de apariencia: cada tema es un conjunto de
 * variables CSS (ver index.css) que ya cubre toda la app —no hay que tocar
 * ningún otro componente para que un tema nuevo se sienta "completo".
 */
export function ThemesSection() {
  const { theme, setTheme } = useTheme()

  return (
    <section className="flex flex-col gap-6">
      <div>
        <h2 className="mb-1 text-[22px] tracking-tight text-text-h">Temas</h2>
        <p className="text-[14px] text-text">
          Elige cómo se ve toda la página. El cambio aplica de inmediato y se recuerda en este
          dispositivo.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {THEME_OPTIONS.map((option) => {
          const Icon = option.icon
          const active = theme === option.value
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setTheme(option.value)}
              aria-pressed={active}
              className={`group flex flex-col overflow-hidden rounded-2xl border text-left transition-transform hover:-translate-y-0.5 ${
                active ? 'border-transparent' : 'border-border'
              }`}
              style={
                active
                  ? { boxShadow: `0 0 0 2px ${option.preview.accent}` }
                  : undefined
              }
            >
              <div
                className="relative flex h-24 items-center justify-center"
                style={{ background: option.preview.bg }}
              >
                {option.value === 'kids' && (
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 opacity-70"
                    style={{
                      backgroundImage: `radial-gradient(circle at 15% 20%, ${option.preview.accent}33 0, transparent 45%), radial-gradient(circle at 85% 75%, ${option.preview.accent2}33 0, transparent 45%)`,
                    }}
                  />
                )}
                <span
                  className="relative flex h-11 w-11 items-center justify-center rounded-xl text-white"
                  style={{
                    background: `linear-gradient(135deg, ${option.preview.accent}, ${option.preview.accent2})`,
                    boxShadow: `0 8px 20px -8px ${option.preview.accent}`,
                  }}
                >
                  <Icon className="h-5 w-5" strokeWidth={2} />
                </span>
                {active && (
                  <span
                    className="absolute top-2.5 right-2.5 flex h-6 w-6 items-center justify-center rounded-full text-white"
                    style={{ background: option.preview.accent }}
                    aria-hidden="true"
                  >
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  </span>
                )}
              </div>

              <div
                className="flex flex-1 flex-col gap-1.5 p-4"
                style={{ background: option.preview.surface }}
              >
                <p className="text-[14.5px] font-semibold" style={{ color: option.preview.text }}>
                  {option.label}
                </p>
                <p className="text-[12.5px] leading-relaxed text-text">{option.description}</p>
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )
}
