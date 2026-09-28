import { useState } from 'react'
import { Palette, User, X } from 'lucide-react'
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
 * Panel que abre el botón de tuerca (`SettingsButton`): dos pestañas dentro
 * del mismo recuadro — "Configuración del perfil" (antes `ProfileSettings`
 * a secas) y "Temas" (antes la sección de la barra lateral, solo para
 * ADMIN — ver Sidebar.tsx). Reemplaza a `ProfileSettings` como componente
 * que se monta desde `HomeLayout`/`KidsHomeShell`.
 */
export function SettingsPanel({ onClose }: SettingsPanelProps) {
  const [tab, setTab] = useState<SettingsTab>('profile')

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

      <div role="tablist" aria-label="Secciones de configuración" className="mb-6 grid grid-cols-2 gap-2.5">
        {TABS.map((item) => {
          const Icon = item.icon
          const active = tab === item.value
          return (
            <button
              key={item.value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(item.value)}
              className={`flex items-center gap-2.5 rounded-xl border p-3 text-left transition-colors ${
                active ? 'border-transparent bg-accent/10' : 'border-border hover:bg-code-bg'
              }`}
              style={active ? { boxShadow: '0 0 0 1.5px var(--accent)' } : undefined}
            >
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${active ? 'text-white' : 'text-accent'}`}
                style={{
                  background: active
                    ? 'linear-gradient(135deg, var(--accent), var(--accent-2))'
                    : 'color-mix(in srgb, var(--accent) 15%, transparent)',
                }}
              >
                <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[13.5px] font-semibold text-text-h">{item.label}</span>
                <span className="block truncate text-[12px] text-text">{item.description}</span>
              </span>
            </button>
          )
        })}
      </div>

      {tab === 'profile' ? <AccountSettingsSection onClose={onClose} /> : <ThemesSection />}
    </Modal>
  )
}
