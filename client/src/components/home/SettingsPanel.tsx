import { useState } from 'react'
import { ArrowLeft, ChevronRight, Palette, User, X } from 'lucide-react'
import { AccountSettingsSection } from './AccountSettingsSection'
import { ThemesSection } from './ThemesSection'
import { Modal } from './games/Modal'

type SettingsPanelProps = {
  onClose: () => void
}

type SettingsView = 'menu' | 'profile' | 'themes'

const SECTIONS: { value: Exclude<SettingsView, 'menu'>; label: string; description: string; icon: typeof User }[] = [
  { value: 'profile', label: 'Configuración del perfil', description: 'Tus datos de cuenta', icon: User },
  { value: 'themes', label: 'Temas', description: 'Apariencia de la página', icon: Palette },
]

/**
 * Panel que abre el botón de tuerca (`SettingsButton`): un menú de dos
 * botones — "Configuración del perfil" (antes `ProfileSettings` a secas) y
 * "Temas" (antes la sección de la barra lateral). Cada uno lleva a su
 * propia pantalla dentro del mismo recuadro (no se despliega en el mismo
 * lugar): así el menú nunca tiene que hacer scroll para llegar a la otra
 * opción, y cada pantalla se cierra con "Atrás" en vez de acordeón.
 */
export function SettingsPanel({ onClose }: SettingsPanelProps) {
  const [view, setView] = useState<SettingsView>('menu')
  const section = SECTIONS.find((item) => item.value === view)

  return (
    <Modal onClose={onClose} maxWidthClassName="max-w-[560px]" maxHeightClassName="max-h-[92vh]">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2">
          {section && (
            <button
              type="button"
              aria-label="Atrás"
              onClick={() => setView('menu')}
              className="mt-0.5 shrink-0 rounded-lg p-1.5 text-text transition-colors hover:bg-code-bg hover:text-text-h"
            >
              <ArrowLeft className="h-5 w-5" strokeWidth={2} />
            </button>
          )}
          <div className="min-w-0">
            <h2 className="mb-1 truncate text-[22px] tracking-tight text-text-h">
              {section ? section.label : 'Configuración'}
            </h2>
            <p className="text-[14px] text-text">
              {section ? section.description : 'Ajusta tu cuenta y cómo se ve NexusPlay.'}
            </p>
          </div>
        </div>
        <button
          type="button"
          aria-label="Cerrar"
          className="shrink-0 rounded-lg p-1.5 text-text transition-colors hover:bg-code-bg hover:text-text-h"
          onClick={onClose}
        >
          <X className="h-5 w-5" strokeWidth={2} />
        </button>
      </div>

      {view === 'menu' ? (
        <div className="flex flex-col gap-3">
          {SECTIONS.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => setView(item.value)}
                className="flex w-full items-center gap-3 rounded-xl border border-border p-3.5 text-left transition-colors hover:border-accent/40 hover:bg-accent/10"
              >
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-accent"
                  style={{ background: 'color-mix(in srgb, var(--accent) 15%, transparent)' }}
                >
                  <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-semibold text-text-h">{item.label}</span>
                  <span className="block truncate text-[12px] text-text">{item.description}</span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-text" strokeWidth={2} />
              </button>
            )
          })}
        </div>
      ) : view === 'profile' ? (
        <AccountSettingsSection onClose={onClose} />
      ) : (
        <ThemesSection />
      )}
    </Modal>
  )
}
