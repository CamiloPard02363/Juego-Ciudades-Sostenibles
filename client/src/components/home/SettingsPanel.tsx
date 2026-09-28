import { useState } from 'react'
import { ChevronDown, Palette, User, X } from 'lucide-react'
import { AccountSettingsSection } from './AccountSettingsSection'
import { ThemesSection } from './ThemesSection'
import { Modal } from './games/Modal'

type SettingsPanelProps = {
  onClose: () => void
}

type SettingsTab = 'profile' | 'themes'

const TABS: { value: SettingsTab; label: string; description: string; icon: typeof User }[] = [
  { value: 'profile', label: 'Configuración del perfil', description: 'Tus datos de cuenta', icon: User },
  { value: 'themes', label: 'Temas', description: 'Apariencia de la página', icon: Palette },
]

/**
 * Panel que abre el botón de tuerca (`SettingsButton`): un acordeón de dos
 * secciones dentro del mismo recuadro — "Configuración del perfil" (antes
 * `ProfileSettings` a secas) y "Temas" (antes la sección de la barra
 * lateral). Solo una está abierta a la vez: al entrar, ambas aparecen
 * cerradas (solo el título) y el contenido de cada una solo se monta
 * cuando se abre, para no cargar el formulario de perfil si solo se quiere
 * cambiar el tema, o viceversa.
 */
export function SettingsPanel({ onClose }: SettingsPanelProps) {
  const [openTab, setOpenTab] = useState<SettingsTab | null>(null)

  function toggle(tab: SettingsTab) {
    setOpenTab((current) => (current === tab ? null : tab))
  }

  return (
    <Modal onClose={onClose} maxWidthClassName="max-w-[560px]">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h2 className="mb-1 text-[22px] tracking-tight text-text-h">Configuración</h2>
          <p className="text-[14px] text-text">Ajusta tu cuenta y cómo se ve NexusPlay.</p>
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

      <div className="flex flex-col gap-3">
        {TABS.map((item) => {
          const Icon = item.icon
          const open = openTab === item.value
          return (
            <div
              key={item.value}
              className={`overflow-hidden rounded-xl border transition-colors ${open ? 'border-accent/40' : 'border-border'}`}
            >
              <button
                type="button"
                aria-expanded={open}
                onClick={() => toggle(item.value)}
                className={`flex w-full items-center gap-3 p-3.5 text-left transition-colors ${open ? 'bg-accent/10' : 'hover:bg-code-bg'}`}
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${open ? 'text-white' : 'text-accent'}`}
                  style={{
                    background: open
                      ? 'linear-gradient(135deg, var(--accent), var(--accent-2))'
                      : 'color-mix(in srgb, var(--accent) 15%, transparent)',
                  }}
                >
                  <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-semibold text-text-h">{item.label}</span>
                  <span className="block truncate text-[12px] text-text">{item.description}</span>
                </span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-text transition-transform ${open ? 'rotate-180' : ''}`}
                  strokeWidth={2}
                />
              </button>

              {open && (
                <div className="border-t border-border p-4">
                  {item.value === 'profile' ? <AccountSettingsSection onClose={onClose} /> : <ThemesSection />}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </Modal>
  )
}
